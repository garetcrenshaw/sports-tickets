import Stripe from 'stripe';
import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { buffer } from 'micro';

// Vercel serverless function config to receive raw request bodies
export const config = {
  api: {
    bodyParser: false, // Disable body parsing, we need raw body for Stripe webhooks
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

// Timeout helper to prevent hangs
async function timeoutPromise(promise, ms, errorMsg) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(errorMsg)), ms)
    )
  ]);
}

export default async function handler(req, res) {
  console.log('=== WEBHOOK DEBUG START ===');
  console.log('Environment check:');
  console.log('- STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'SET' : 'MISSING');
  console.log('- STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? 'SET' : 'MISSING');
  console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'MISSING');
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');
  console.log('- RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'SET' : 'MISSING');

  // Check required environment variables
  const requiredEnvVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'RESEND_API_KEY'
  ];

  const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);
  if (missingEnvVars.length > 0) {
    console.error('Missing environment variables:', missingEnvVars);
    return res.status(500).json({
      error: {
        code: '500',
        message: `Missing environment variables: ${missingEnvVars.join(', ')}`
      }
    });
  }

  if (req.method !== 'POST') {
    console.log('Non-POST method:', req.method);
    return res.status(405).json({
      error: {
        code: '405',
        message: 'Method Not Allowed'
      }
    });
  }

  console.log('Webhook POST received. Headers:', JSON.stringify(req.headers, null, 2));

  let buf;
  try {
    // Use micro's buffer() to get raw body - works in both local and Vercel
    // This preserves the exact bytes needed for signature verification
    buf = await buffer(req);
    console.log('Raw body buffer length:', buf.length);
    console.log('Content-Length header:', req.headers['content-length']);

    const sig = req.headers['stripe-signature'];
    console.log('Stripe signature present:', !!sig);

    if (!sig) {
      console.error('No Stripe signature provided');
      // Always return 200 to acknowledge receipt, even on errors
      return res.status(200).json({
        error: {
          code: '400',
          message: 'No Stripe signature provided'
        }
      });
    }

    if (!buf || buf.length === 0) {
      console.error('No request body received');
      return res.status(200).json({
        error: {
          code: '400',
          message: 'No request body'
        }
      });
    }

    // Verify the event with Stripe - this is the critical step that fails without raw buffer
    const stripeEvent = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log('✅ Event verified:', stripeEvent.type, 'ID:', stripeEvent.id);

    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      console.log('Processing checkout session:', session.id, 'Payment status:', session.payment_status);

      if (session.payment_status !== 'paid') {
        console.log('Session not paid:', session.id);
        return res.status(200).json({ status: 'ignored', reason: 'payment not completed' });
      }

      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

      // Idempotency: Check if ticket exists
      console.log('Checking for existing ticket:', session.id);
      const { data: existing, error: checkError } = await supabase
        .from('tickets')
        .select('ticket_id')
        .eq('ticket_id', session.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Supabase check error:', checkError.code, checkError.message);
        // Log to error table
        await logError(supabase, session.id, `Database check failed: ${checkError.message}`);
        throw new Error(`Database check failed: ${checkError.message}`);
      }

      if (existing) {
        console.log('✅ Duplicate event - ticket exists:', session.id, '(idempotent skip)');
        return res.status(200).json({ status: 'ignored', reason: 'duplicate event' });
      }

      console.log('Generating QR code for:', session.id);
      const qrDataUrl = await QRCode.toDataURL(`ticket:${session.id}`);
      console.log('✅ QR code generated successfully');

      const ticketData = {
        ticket_id: session.id,
        event_id: session.metadata?.event_id || 'fallback',
        purchaser_name: session.customer_details?.name || 'Anonymous',
        purchaser_email: session.customer_details?.email || 'fallback@garetcrenshaw.com',
        qr_code: qrDataUrl,
        status: 'active'
      };

      console.log('Inserting ticket to Supabase:', {
        ...ticketData,
        qr_code: '[BASE64_DATA]' // Don't log the full QR
      });
      
      // Add 5s timeout to prevent hangs
      const { error: insertError } = await timeoutPromise(
        supabase.from('tickets').insert(ticketData),
        5000,
        'Supabase insert timeout (5s)'
      );

      if (insertError) {
        console.error('❌ Supabase insert error:', insertError.code, insertError.message, insertError.details);
        await logError(supabase, session.id, `Database insert failed: ${insertError.message}`);
        throw new Error(`Database insert failed: ${insertError.message}`);
      }
      console.log('✅ Ticket inserted successfully to Supabase');

      const customerEmail = session.customer_details?.email || 'garetcrenshaw@gmail.com';
      console.log('Sending email to:', customerEmail);

      try {
        // Add 5s timeout to prevent hangs
        const emailResult = await timeoutPromise(
          resend.emails.send({
          from: 'tickets@gamedaytickets.io',
          to: customerEmail,
          subject: 'Your Gameday Tickets + Parking are Ready!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Thank you for your purchase!</h2>
              <p>Here is your ticket for the event.</p>
              <div style="text-align: center; margin: 20px 0;">
                <img src="${qrDataUrl}" alt="QR Code" style="max-width: 300px;" />
              </div>
              <p><strong>Event ID:</strong> ${session.metadata?.event_id || 'Fallback'}</p>
              <p><strong>Name:</strong> ${ticketData.purchaser_name}</p>
              <p>Please show this QR code at the entrance.</p>
              <hr style="margin: 30px 0;" />
              <p style="color: #666; font-size: 12px;">
                Transaction ID: ${session.id}
              </p>
            </div>
          `
          }),
          5000,
          'Resend email timeout (5s)'
        );

        console.log('✅ Email sent successfully:', emailResult.id);
      } catch (emailError) {
        console.error('❌ Resend email error:', emailError.message);
        await logError(supabase, session.id, `Email send failed: ${emailError.message}`);
        // Don't throw - ticket is already saved, email can be retried manually
      }
    }

    // Always return 200 to acknowledge receipt
    return res.status(200).json({ status: 'success' });
  } catch (err) {
    console.error('❌ Webhook error:', err.message);
    console.error('Stack trace:', err.stack);

    // Always return 200 to acknowledge receipt, even on errors
    // This prevents Stripe from retrying endlessly
    return res.status(200).json({
      error: {
        code: '500',
        message: err.message || 'A server error has occurred'
      }
    });
  }
}

// Helper function to log errors to Supabase
async function logError(supabase, eventId, errorMessage) {
  try {
    await supabase.from('errors').insert({
      event_id: eventId,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  } catch (logErr) {
    console.error('Failed to log error to database:', logErr);
  }
}
