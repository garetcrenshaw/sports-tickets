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
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];

  console.log('RAW BODY SUCCESS - length:', buf.length, 'type:', typeof buf);
  console.log('SIGNATURE HEADER:', sig ? sig.substring(0, 50) + '...' : 'MISSING');

  let event;
  try {
      event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('VERIFIED SUCCESSFULLY:', event.type);
      console.log('Webhook received:', event.type);
  } catch (err) {
    console.error('SIGNATURE FAILED:', err.message);
      res.status(400).send('Webhook Error');
    return;
  }

    // Handle different event types
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
    console.error('WEBHOOK ERROR:', err.message);
    console.error('STACK:', err.stack);
    res.status(500).send('Internal Server Error');
  }
}

async function handleCheckoutSessionCompleted(session) {
      try {
    console.log('PROCESSING CHECKOUT SESSION:', session.id);

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

    // Generate QR code for the session
    const qrDataUrl = await QRCode.toDataURL(`ticket:${session.id}`, {
      width: 256,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    // Insert ticket into database
    const { data, error } = await supabase
      .from('tickets')
      .insert({
        ticket_id: session.id,
        event_id: session.metadata?.event_id || 'unknown',
        purchaser_name: session.customer_details?.name || 'Unknown',
        purchaser_email: session.customer_details?.email,
        qr_code: qrDataUrl,
        status: 'active'
      })
      .select();

    if (error) {
      console.error('SUPABASE INSERT ERROR:', error);
      throw error;
    }

    console.log('TICKET CREATED:', data[0].id);

    // Send email with QR code
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
      from: 'tickets@sports-tickets.com',
      to: session.customer_details?.email,
      subject: 'Your Sports Ticket',
      html: `<p>Thanks for your purchase!</p><img src="${qrDataUrl}" alt="QR Code"/>`,
        });

    console.log('EMAIL SENT TO:', session.customer_details?.email);

      } catch (err) {
    console.error('CHECKOUT SESSION PROCESSING ERROR:', err.message);
        console.error('STACK:', err.stack);
    throw err;
      }
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
      console.error('PRODUCT SYNC ERROR:', error);
    } else {
      console.log('PRODUCT SYNCED:', product.id);
    }
  } catch (err) {
    console.error('PRODUCT EVENT ERROR:', err.message);
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
      console.error('PRICE SYNC ERROR:', error);
    } else {
      console.log('PRICE SYNCED:', price.id);
    }
  } catch (err) {
    console.error('PRICE EVENT ERROR:', err.message);
  }
}