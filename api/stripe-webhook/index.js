import Stripe from 'stripe';
import { buffer } from 'micro';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  console.log('WEBHOOK HIT');

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf.toString(), sig, endpointSecret);
  } catch (err) {
    console.error('SIGNATURE FAILED:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  res.status(200).json({ received: true });

  if (event.type === 'checkout.session.completed') {
    (async () => {
      try {
        const session = event.data.object;
        const email = session.customer_details?.email || 'garetcrenshaw@gmail.com';

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

        const QRCode = (await import('qrcode')).default;
        for (const ticket of tickets) {
          const url = `https://sports-tickets.vercel.app/validate?ticket=${ticket.id}`;
          await QRCode.toDataURL(url);
          console.log('QR READY:', ticket.id);
        }

        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'test@garetcrenshaw.com',
          to: email,
          subject: 'TICKETS READY',
          html: '<h1>Success!</h1>',
        });

        console.log('FULLFILLMENT COMPLETE');
      } catch (err) {
        console.error('FULFILLMENT FAILED:', err);
      }
    })();
  }
}