import Stripe from 'stripe';
import { buffer } from 'micro';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  console.log('WEBHOOK HIT - STARTING PROCESSING');

  try {
    console.log('Getting raw body...');
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];

    console.log('Raw body length:', buf.length);
    console.log('SIGNATURE HEADER:', sig ? sig.substring(0, 50) + '...' : 'MISSING');

    let event;
    try {
      event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
      console.log('VERIFIED SUCCESSFULLY:', event.type);
      console.log('Webhook received:', event.type);
    } catch (err) {
      console.error('Signature verification failed:', err.message);
      return res.status(400).json({error: {code: '400', message: 'Webhook signature verification failed', details: err.message}});
    }

    // Environment variable validation after constructEvent
    const requiredEnv = ['STRIPE_WEBHOOK_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY'];
    for (const env of requiredEnv) {
      if (!process.env[env]) {
        console.error(`Missing env var: ${env}`);
        return res.status(500).send(`Server misconfigured: missing ${env}`);
      }
    }

    // Wrap entire fulfillment in try/catch with detailed logging
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object);
          break;
        case 'product.created':
        case 'product.updated':
          await handleProductEvent(event.data.object);
          break;
        case 'price.created':
        case 'price.updated':
          await handlePriceEvent(event.data.object);
          break;
        case 'charge.succeeded':
        case 'payment_intent.succeeded':
        case 'payment_intent.created':
          console.log(`LOGGING EVENT: ${event.type} - ${event.data.object.id}`);
          break;
        default:
          console.log(`UNHANDLED EVENT: ${event.type}`);
      }

      res.sendStatus(200);
    } catch (err) {
      console.error('FATAL WEBHOOK ERROR:', err);
      console.error('Error stack:', err.stack);
      console.error('Event type:', event.type);
      console.error('Session ID:', event.data?.object?.id || 'none');
      res.status(500).json({ error: 'Fulfillment failed', details: err.message });
      return;
    }
  } catch (err) {
    console.error('WEBHOOK ERROR:', err.message);
    console.error('STACK:', err.stack);
    res.status(500).json({error: {code: '500', message: 'A server error has occurred', details: err.message}});
  }
}

async function handleCheckoutSessionCompleted(session) {
  console.log('Processing session:', session.id);

  // Only process if payment was successful
  if (session.payment_status !== 'paid') {
    console.log('PAYMENT NOT COMPLETE, SKIPPING:', session.payment_status);
    return;
  }

  // Initialize Supabase client for server-side operations
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    }
  );

  // QR code generation
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(`ticket:${session.id}`, { errorCorrectionLevel: 'H', width: 512 });
    console.log('QR generated for session', session.id);
  } catch (qrErr) {
    console.error('QR generation failed:', qrErr);
    throw qrErr;
  }

  // Supabase insert
  const { error: supabaseError } = await supabase
    .from('tickets')
    .insert({
      ticket_id: session.id,
      event_id: session.metadata?.event_id || 'unknown',
      purchaser_name: session.customer_details?.name || 'Anonymous',
      purchaser_email: session.customer_details?.email || null,
      qr_code: qrDataUrl,
      status: 'active',
    });

  if (supabaseError) {
    console.error('Supabase insert failed:', supabaseError);
    throw supabaseError;
  }

  console.log('Ticket inserted into Supabase');

  // Resend email
  const resend = new Resend(process.env.RESEND_API_KEY);
  const resendResult = await resend.emails.send({
    from: 'tickets@gamedaytickets.io',  // MUST be verified in Resend dashboard
    to: session.customer_details?.email || 'fallback@example.com',
    subject: 'Your Sports Ticket + QR Code',
    html: `<p>Thanks for your purchase!</p><img src="${qrDataUrl}" alt="QR Code" />`,
  });

  console.log('Email sent:', resendResult);
}

async function handleProductEvent(product) {
  try {
    console.log('SYNCING PRODUCT:', product.id);

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      }
    );

    const { error } = await supabase
      .from('products')
      .upsert({
        stripe_id: product.id,
        name: product.name,
        description: product.description,
        active: product.active,
        metadata: product.metadata
      });

    if (error) {
      console.error('PRODUCT SYNC ERROR:', error.message);
      throw new Error(`Product sync failed: ${error.message}`);
    } else {
      console.log('PRODUCT SYNCED:', product.id);
    }
  } catch (err) {
    console.error('PRODUCT EVENT ERROR:', err.message);
    throw err;
  }
}

async function handlePriceEvent(price) {
  try {
    console.log('SYNCING PRICE:', price.id);

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      }
    );

    const { error } = await supabase
      .from('prices')
      .upsert({
        stripe_id: price.id,
        product_id: price.product,
        currency: price.currency,
        unit_amount: price.unit_amount,
        active: price.active,
        metadata: price.metadata
      });

    if (error) {
      console.error('PRICE SYNC ERROR:', error.message);
      throw new Error(`Price sync failed: ${error.message}`);
    } else {
      console.log('PRICE SYNCED:', price.id);
    }
  } catch (err) {
    console.error('PRICE EVENT ERROR:', err.message);
    throw err;
  }
}