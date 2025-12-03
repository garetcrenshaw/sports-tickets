import Stripe from 'stripe';
import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Vercel serverless function config to receive raw request bodies
export const config = {
  api: {
    bodyParser: false, // Disable body parsing, we need raw body for Stripe webhooks
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

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
    // For Vercel, get raw body from req.body if available, otherwise use micro buffer
    if (req.body) {
      buf = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    } else {
      const { buffer } = await import('micro');
      buf = await buffer(req);
    }

    console.log('Raw body length:', buf.length);

    const sig = req.headers['stripe-signature'];
    console.log('Stripe signature present:', !!sig);

    if (!sig) {
      console.error('No Stripe signature provided');
      return res.status(400).json({
        error: {
          code: '400',
          message: 'No Stripe signature provided'
        }
      });
    }

    const stripeEvent = Stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('Event verified:', stripeEvent.type, 'ID:', stripeEvent.id);

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
        console.error('Error checking existing ticket:', checkError);
        throw new Error(`Database check failed: ${checkError.message}`);
      }

      if (existing) {
        console.log('Duplicate event - ticket exists:', session.id);
        return res.status(200).json({ status: 'ignored', reason: 'duplicate event' });
      }

      console.log('Generating QR code for:', session.id);
      const qrDataUrl = await QRCode.toDataURL(`ticket:${session.id}`);
      console.log('QR code generated successfully');

      const ticketData = {
        ticket_id: session.id,
        event_id: session.metadata?.event_id || 'fallback',
        purchaser_name: session.customer_details?.name || 'Anonymous',
        purchaser_email: session.customer_details?.email || 'fallback@garetcrenshaw.com',
        qr_code: qrDataUrl,
        status: 'active'
      };

      console.log('Inserting ticket to Supabase:', ticketData);
      const { error: insertError } = await supabase
        .from('tickets')
        .insert(ticketData);

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        throw new Error(`Database insert failed: ${insertError.message}`);
      }
      console.log('Ticket inserted successfully');

      const customerEmail = session.customer_details?.email || 'garetcrenshaw@gmail.com';
      console.log('Sending email to:', customerEmail);

      const emailResult = await resend.emails.send({
        from: 'tickets@gamedaytickets.io',
        to: customerEmail,
        subject: 'Your Ticket',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Thank you for your purchase!</h2>
            <p>Here is your ticket for the event.</p>
            <div style="text-align: center; margin: 20px 0;">
              <img src="${qrDataUrl}" alt="QR Code" style="max-width: 300px;" />
            </div>
            <p>Event ID: ${session.metadata?.event_id || 'Fallback'}</p>
            <p>Please show this QR code at the entrance.</p>
          </div>
        `
      });

      console.log('Email sent successfully:', emailResult.id);
    }

    return res.status(200).json({ status: 'success' });
  } catch (err) {
    console.error('Webhook error:', err.message);
    console.error('Stack trace:', err.stack);

    // For Stripe webhook signature errors, return 400 (Stripe will retry)
    // For other errors, return 500 (don't retry processing errors)
    const isSignatureError = err.message.includes('signature') || err.message.includes('verification');
    const statusCode = isSignatureError ? 400 : 500;

    return res.status(statusCode).json({
      error: {
        code: statusCode.toString(),
        message: err.message || 'A server error has occurred'
      }
    });
  }
};
