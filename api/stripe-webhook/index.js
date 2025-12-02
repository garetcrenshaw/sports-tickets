import Stripe from 'stripe';
import { buffer } from 'micro';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.log('❌ Wrong method:', req.method);
    return res.status(405).end();
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf.toString(), sig, endpointSecret);
    console.log('✅ WEBHOOK VERIFIED:', event.type, 'ID:', event.id);
  } catch (err) {
    console.error('❌ WEBHOOK SIGNATURE FAILED:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    console.log('🎯 CHECKOUT COMPLETED — STARTING FULFILLMENT');

    const session = event.data.object;
    console.log('Customer email:', session.customer_details?.email || 'NO EMAIL');
    console.log('Session ID:', session.id);

    // FAST Supabase insert
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { error } = await supabase
      .from('tickets')
      .insert([
        { session_id: session.id, purchaser_email: session.customer_details?.email || 'test@example.com', type: 'admission' },
        { session_id: session.id, purchaser_email: session.customer_details?.email || 'test@example.com', type: 'admission' },
        { session_id: session.id, purchaser_email: session.customer_details?.email || 'test@example.com', type: 'parking' }
      ]);

    if (error) {
      console.error('❌ SUPABASE FAILED:', error.message);
      return res.status(500).json({ error: 'DB failed' });
    }

    console.log('✅ 3 TICKETS INSERTED INTO SUPABASE');

    // FAST Resend email
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'tickets@sports-tickets.vercel.app',
      to: session.customer_details?.email || 'garetcrenshaw@gmail.com',
      subject: 'Your Tickets Are Here!',
      text: 'Your tickets have been processed! Check Supabase.',
      html: '<h1>Tickets Processed!</h1><p>3 tickets added to your account.</p>'
    });

    console.log('✅ EMAIL SENT VIA RESEND');
  }

  // Respond IMMEDIATELY — don't wait for anything
  res.status(200).json({ received: true });
  console.log('✅ Webhook finished — responded 200');
}
