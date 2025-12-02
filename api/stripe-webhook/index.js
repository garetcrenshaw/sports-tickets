import Stripe from 'stripe';
import { buffer } from 'micro';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf.toString(), sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // RESPOND IMMEDIATELY — Stripe only cares about 200
  res.status(200).json({ received: true });

  // Now do fulfillment in background — NO AWAIT
  if (event.type === 'checkout.session.completed') {
    (async () => {
      try {
        const session = event.data.object;
        console.log('FULFILLMENT STARTED for session:', session.id);

        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        const { error } = await supabase
          .from('tickets')
          .insert([
            { session_id: session.id, email: session.customer_details?.email || 'test@example.com', type: 'admission' },
            { session_id: session.id, email: session.customer_details?.email || 'test@example.com', type: 'admission' },
            { session_id: session.id, email: session.customer_details?.email || 'test@example.com', type: 'parking' },
          ]);

        if (error) throw error;

        console.log('3 tickets inserted into Supabase');

        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
          from: 'tickets@sports-tickets.vercel.app',
          to: session.customer_details?.email || 'garetcrenshaw@gmail.com',
          subject: 'Your Game Day Tickets!',
          html: '<h1>Thank you!</h1><p>Your 2 tickets + 1 parking pass are ready.</p>',
        });

        console.log('Email sent via Resend');
      } catch (err) {
        console.error('BACKGROUND FULFILLMENT FAILED:', err);
      }
    })();
  }
}
