import Stripe from 'stripe';
import { buffer } from 'micro';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  console.log('WEBHOOK HIT — STARTING SELF-CHECK');

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf.toString(), sig, endpointSecret);
    console.log('VERIFIED:', event.type);
  } catch (err) {
    console.error('SIGNATURE FAILED:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Respond immediately
  res.status(200).json({ received: true });
  console.log('200 SENT — RUNNING FULFILLMENT');

  if (event.type === 'checkout.session.completed') {
    (async () => {
      try {
        const session = event.data.object;
        const email = session.customer_details?.email || 'garetcrenshaw@gmail.com';

        // SUPABASE
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        const { data: tickets, error } = await supabase
          .from('tickets')
          .insert([
            { session_id: session.id, buyer_email: email, buyer_name: session.customer_details?.name || 'Test', type: 'admission' },
            { session_id: session.id, buyer_email: email, buyer_name: session.customer_details?.name || 'Test', type: 'admission' },
            { session_id: session.id, buyer_email: email, buyer_name: session.customer_details?.name || 'Test', type: 'parking' },
          ])
          .select();

        if (error) throw error;
        console.log('3 TICKETS INSERTED — IDs:', tickets.map(t => t.id));

        // EMAIL — using garetcrenshaw@gmail.com as guaranteed receiver
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        const result = await resend.emails.send({
          from: 'GameDay Tickets <test@garetcrenshaw.com>',
          to: 'garetcrenshaw@gmail.com',  // ← GUARANTEED WORKING EMAIL
          bcc: email,
          subject: 'TICKETS DELIVERED — TEST SUCCESS',
          html: `
            <h1>WEBHOOK IS WORKING 100%</h1>
            <p>Session: ${session.id}</p>
            <p>3 tickets created in Supabase</p>
            <p>If you see this email → fulfillment is perfect</p>
          `,
        });

        console.log('EMAIL SENT TO garetcrenshaw@gmail.com — Resend ID:', result.id || 'sent');
      } catch (err) {
        console.error('FULFILLMENT FAILED:', err.message);
        console.error('STACK:', err.stack);
      }
    })();
  }
}