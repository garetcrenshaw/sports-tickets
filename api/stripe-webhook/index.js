import Stripe from 'stripe';
import { buffer } from 'micro';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  console.log('WEBHOOK HIT');

  let buf;
  try {
    buf = await buffer(req);
  } catch (err) {
    console.error('BUFFER FAILED:', err.message);
    res.writeHead(500);
    res.end('Buffer failed');
    return;
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

        const { createClient } = await import('@supabase/supabase-js');
        let supabaseUrl = process.env.SUPABASE_URL;
        if (supabaseUrl.startsWith('"') && supabaseUrl.endsWith('"')) {
          supabaseUrl = supabaseUrl.slice(1, -1);  // Strip quotes
        }
        const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
        console.log('SUPABASE READY');

        const { data: tickets, error } = await supabase
          .from('tickets')
          .insert([
            { session_id: session.id, buyer_email: email, type: 'admission' },
            { session_id: session.id, buyer_email: email, type: 'admission' },
            { session_id: session.id, buyer_email: email, type: 'parking' },
          ])
          .select();

        if (error) throw error;
        console.log('3 TICKETS INSERTED');

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
        console.error('STACK:', err.stack);
      }
    })();
  }
}