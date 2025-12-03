import Stripe from 'stripe';
import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.log('Non-POST method:', req.method);
    return res.status(405).send('Method Not Allowed');
  }

  console.log('Webhook POST received. Headers:', JSON.stringify(req.headers));

  let buf;
  try {
    // For Vercel functions, body is already parsed unless bodyParser is disabled
    // Since we can't disable bodyParser in individual functions, we'll work with parsed body
    if (Buffer.isBuffer(req.body)) {
      buf = req.body;
    } else if (typeof req.body === 'string') {
      buf = Buffer.from(req.body, 'utf8');
    } else {
      // If body is already parsed as JSON, we need raw body for Stripe sig verification
      // This is a limitation - let's use a workaround
      console.log('Body type:', typeof req.body);
      buf = Buffer.from(JSON.stringify(req.body || {}), 'utf8');
    }
    console.log('Raw body length:', buf.length);
  } catch (err) {
    console.error('Raw body error:', err);
    return res.status(400).send('Bad Request: Body read failed');
  }

  try {
    const sig = req.headers['stripe-signature'];
    const stripeEvent = Stripe.webhooks.constructEvent(buf.toString('utf8'), sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('Event verified:', stripeEvent.type, 'ID:', stripeEvent.id);

    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      if (session.payment_status !== 'paid') {
        console.log('Session not paid:', session.id);
        return res.status(200).end();
      }

      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

      // Idempotency: Check if ticket exists (Ticketmaster-style dupe prevention)
      const { data: existing, error: checkError } = await supabase.from('tickets').select('ticket_id').eq('ticket_id', session.id).single();
      if (checkError && checkError.code !== 'PGRST116') throw checkError; // PGRST116 = no rows
      if (existing) {
        console.log('Duplicate event - ticket exists:', session.id);
        return res.status(200).end(); // Idempotent: skip
      }

      console.log('Generating QR for:', session.id);
      const qrDataUrl = await QRCode.toDataURL(`ticket:${session.id}`);

      console.log('Inserting to Supabase...');
      const { error: insertError } = await supabase.from('tickets').insert({
        ticket_id: session.id,
        event_id: session.metadata?.event_id || 'fallback',
        purchaser_name: session.customer_details?.name || 'Anonymous',
        purchaser_email: session.customer_details?.email || 'fallback@garetcrenshaw.com',
        qr_code: qrDataUrl,
        status: 'active'
      });
      if (insertError) throw insertError;

      console.log('Sending email to:', session.customer_details?.email);
      await resend.emails.send({
        from: 'tickets@gamedaytickets.io',
        to: session.customer_details?.email || 'garetcrenshaw@gmail.com',
        subject: 'Your Ticket',
        html: `<p>Thanks for buying! Event: ${session.metadata?.event_id || 'Fallback'}</p><img src="${qrDataUrl}" alt="QR Code" />`
      });
      console.log('Email sent successfully');
    }

    return res.status(200).end();
  } catch (err) {
    console.error('Webhook processing error:', err.message, err.stack);
    res.status(200).end(); // Always 200 to ack Stripe; retry if needed via logs
  }
}
