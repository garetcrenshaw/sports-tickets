import Stripe from 'stripe';
import { buffer } from 'micro';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  console.log('WEBHOOK HIT — RESEND FREE TIER MODE');

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

  res.status(200).json({ received: true });

  if (event.type === 'checkout.session.completed') {
    (async () => {
      try {
        const session = event.data.object;
        const email = session.customer_details?.email || 'garetcrenshaw@gmail.com';

        // Supabase
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        const { data: tickets } = await supabase
          .from('tickets')
          .insert([
            { session_id: session.id, buyer_email: email, type: 'admission' },
            { session_id: session.id, buyer_email: email, type: 'admission' },
            { session_id: session.id, buyer_email: email, type: 'parking' },
          ])
          .select();

        console.log('3 TICKETS INSERTED');

        // EMAIL — FREE TIER ONLY
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
          from: 'Sports Tickets <delivered@resend.dev>',  // ← ONLY THIS WORKS ON FREE TIER
          to: 'garetcrenshaw@gmail.com',  // ← YOU WILL GET THIS
          bcc: email,
          subject: 'Your GameDay Tickets Are Ready!',
          html: `
            <h1>GameDay Tickets</h1>
            <p>3 tickets processed:</p>
            <ul>
              <li>2 × Admission</li>
              <li>1 × Parking Pass</li>
            </ul>
            <p>Session: ${session.id}</p>
            <p>If you got this email → everything works.</p>
          `,
        });

        console.log('EMAIL SENT — delivered@resend.dev → garetcrenshaw@gmail.com');
      } catch (err) {
        console.error('FULFILLMENT FAILED:', err.message);
      }
    })();
  }
}