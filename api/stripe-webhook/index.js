import Stripe from 'stripe';
import { buffer } from 'micro';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = 'whsec_938eab87d4b6d6a06a5156e515d2fbc9d77a82db4dd5f354486dc52f5d7a0835'; // CLI dev secret

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  console.log('WEBHOOK HIT');

  let buf;
  if (req.rawBody) {
    buf = req.rawBody;
  } else {
    buf = await buffer(req);
  }

  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
    console.log('VERIFIED:', event.type);
  } catch (err) {
    console.error('SIGNATURE FAILED:', err.message);
    res.writeHead(400);
    res.end(`Webhook Error: ${err.message}`);
    return;
  }

  res.writeHead(200);
  res.end(JSON.stringify({ received: true }));

  if (event.type === 'checkout.session.completed') {
    (async () => {
      try {
        const session = event.data.object;
        const email = session.customer_details?.email || 'garetcrenshaw@gmail.com';

        // Skip Supabase for now - focus on proving webhook works
        console.log('SKIPPING SUPABASE - PROVING WEBHOOK WORKS');

        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
          from: 'Sports Tickets <delivered@resend.dev>',
          to: 'garetcrenshaw@gmail.com',
          subject: 'TICKETS READY',
          html: '<h1>Success!</h1><p>3 tickets created. If you get this, fulfillment works 100%.</p>',
        });

        console.log('EMAIL SENT TO garetcrenshaw@gmail.com');
      } catch (err) {
        console.error('FAILED:', err.message);
      }
    })();
  }
}