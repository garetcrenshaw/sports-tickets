import Stripe from 'stripe';
import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { buffer } from 'micro';

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

  if (req.method !== 'POST') {
    console.log('Non-POST method:', req.method);
    return res.status(405).send('Method Not Allowed');
  }

  console.log('Webhook POST received. Headers:', JSON.stringify(req.headers));
  const contentLength = req.headers['content-length'] || 'unknown';

  try {
    const buf = await buffer(req); // Gets full raw body reliably
    console.log('Raw body length:', buf.length, '| Expected (content-length):', contentLength);

    const sig = req.headers['stripe-signature'];
    console.log('Stripe signature present:', !!sig);
    const stripeEvent = Stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
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
    console.error('Webhook error:', err.message, err.stack);
    return res.status(400).send(`Webhook Error: ${err.message}`); // 400 for sig fails (Stripe retries); 200 for processing errors
  }
};
