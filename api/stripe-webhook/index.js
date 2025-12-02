import Stripe from 'stripe';
import { buffer } from 'micro';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  console.log('🚨 WEBHOOK HIT — STARTING');

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf.toString(), sig, endpointSecret);
    console.log('✅ WEBHOOK VERIFIED:', event.type);
  } catch (err) {
    console.error('❌ SIGNATURE FAILED:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    console.log('🎯 checkout.session.completed — FULFILLMENT START');

    const session = event.data.object;
    console.log('Email:', session.customer_details?.email || 'MISSING');
    console.log('Session ID:', session.id);

    // SUPABASE TEST
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      console.log('Supabase client created');

      const { data, error } = await supabase
        .from('tickets')
        .insert({ session_id: session.id, purchaser_email: 'test-from-trigger@example.com', type: 'admission' })
        .select();

      if (error) throw error;
      console.log('✅ SUPABASE INSERT SUCCESS:', data);
    } catch (err) {
      console.error('❌ SUPABASE FAILED:', err.message);
    }

    // RESEND TEST
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'test@sports-tickets.vercel.app',
        to: 'garetcrenshaw@gmail.com',
        subject: 'WEBHOOK DIAGNOSTIC TEST',
        text: 'If you get this, Resend works from webhook',
      });
      console.log('✅ RESEND EMAIL SENT');
    } catch (err) {
      console.error('❌ RESEND FAILED:', err.message);
    }
  }

  res.status(200).json({ received: true });
  console.log('✅ WEBHOOK FINISHED — 200 sent');
}
