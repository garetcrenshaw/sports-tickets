import Stripe from 'stripe';
import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';
import { buffer } from 'micro';

// CRITICAL: Disable body parsing for Stripe webhook signature verification
export const config = {
  api: {
    bodyParser: false, // Must be disabled to receive raw body for signature verification
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
  console.log('--- DB FIX VERSION 2 LIVE ---');
  console.log('--- FINAL TICKET FULFILLMENT ATTEMPT ---');
  console.log('Environment check:');
  console.log('- STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'SET' : 'MISSING');
  console.log('- STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? 'SET' : 'MISSING');
  console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'MISSING');
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');

  // Check required environment variables
  const requiredEnvVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
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
      console.log('=== CHECKOUT SESSION COMPLETED EVENT ===');
      console.log('Session ID:', session.id);
      console.log('Payment status:', session.payment_status);
      console.log('Customer email:', session.customer_details?.email);
      console.log('Customer name:', session.customer_details?.name);

      if (session.payment_status !== 'paid') {
        console.log('⚠️ Session not paid - ignoring event:', session.id);
        return res.status(200).json({ status: 'ignored', reason: 'payment not completed' });
      }
      
      console.log('✅ Payment confirmed - proceeding with fulfillment');

      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

      // Idempotency: Check if ticket exists
      console.log('Checking for existing ticket:', session.id);
      const { data: existing, error: checkError } = await supabase
        .from('tickets')
        .select('id')
        .eq('stripe_session_id', session.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Supabase check error:', checkError.code, checkError.message);
        // Log to error table
        await logError(supabase, session.id, `Database check failed: ${checkError.message}`);
        throw new Error(`Database check failed: ${checkError.message}`);
      }

      if (existing) {
        console.log('⚠️ DUPLICATE EVENT DETECTED - Ticket already exists:', session.id);
        console.log('   This webhook has already been processed - skipping');
        return res.status(200).json({ status: 'ignored', reason: 'duplicate event' });
      }
      
      console.log('✅ No duplicate found - proceeding with ticket creation');

      console.log('Generating QR code for:', session.id);
      const qrDataUrl = await QRCode.toDataURL(`ticket:${session.id}`);
      console.log('✅ QR code generated successfully');

      const ticketData = {
        stripe_session_id: session.id,
        event_id: session.metadata?.event_id || 'fallback',
        name: session.customer_details?.name || 'Anonymous',
        email: session.customer_details?.email || 'fallback@garetcrenshaw.com',
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
      console.log('=== EMAIL QUEUE DEBUG START ===');
      console.log('Queueing email for:', customerEmail);
      console.log('Session ID:', session.id);
      console.log('QR code data length:', qrDataUrl?.length || 0);

      try {
        // Queue email for background processing (async delivery with retry)
        // This decouples email sending from webhook response time
        const emailJob = {
          ticket_id: session.id,
          recipient_email: customerEmail,
          recipient_name: ticketData.name,
          qr_code_data: qrDataUrl,  // Store QR data for email template
          event_id: ticketData.event_id,
          status: 'pending',
          retry_count: 0
        };

        console.log('Email job object prepared:', {
          ticket_id: emailJob.ticket_id,
          recipient_email: emailJob.recipient_email,
          recipient_name: emailJob.recipient_name,
          event_id: emailJob.event_id,
          status: emailJob.status,
          retry_count: emailJob.retry_count,
          qr_code_data_length: emailJob.qr_code_data?.length || 0
        });

        console.log('Attempting insert to email_queue table...');
        const { data: insertedData, error: queueError } = await supabase
          .from('email_queue')
          .insert(emailJob)
          .select();

        if (queueError) {
          console.error('❌ EMAIL QUEUE INSERT FAILED');
          console.error('Error code:', queueError.code);
          console.error('Error message:', queueError.message);
          console.error('Error details:', JSON.stringify(queueError.details));
          console.error('Error hint:', queueError.hint);
          await logError(supabase, session.id, `Email queue failed: ${queueError.code} - ${queueError.message}`);
          // Still return 200 - ticket saved, email can be retried manually
        } else {
          console.log('✅ EMAIL QUEUE INSERT SUCCESSFUL');
          console.log('Inserted data:', JSON.stringify(insertedData));
          console.log('   → Worker will process within 1-2 minutes');
        }
      } catch (queueError) {
        console.error('❌ EMAIL QUEUE EXCEPTION');
        console.error('Exception message:', queueError.message);
        console.error('Exception stack:', queueError.stack);
        await logError(supabase, session.id, `Email queue exception: ${queueError.message}`);
        // Still return 200 - ticket is saved, that's what matters
      }
      console.log('=== EMAIL QUEUE DEBUG END ===');
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
