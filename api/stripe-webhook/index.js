import { buffer } from 'micro';
import Stripe from 'stripe';
import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.log('Non-POST method:', req.method);
    return res.status(405).send('Method Not Allowed');
  }

  console.log('Webhook POST received');

  try {
    const buf = await buffer(req);
    console.log('Raw body buffered, length:', buf.length);

    const sig = req.headers['stripe-signature'];
    console.log('Signature header:', sig ? 'present' : 'missing');

    const event = stripe.webhooks.constructEvent(buf.toString(), sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('Event verified:', event.type);

    // QUICK ACKNOWLEDGMENT - respond NOW (only after successful verification)
    res.sendStatus(200);
    console.log('200 sent immediately');

    // DEFER PROCESSING ASYNC (after response)
    process.nextTick(async () => {
      try {
        if (event.type === 'checkout.session.completed') {
          const session = event.data.object;
          if (session.payment_status !== 'paid') {
            console.log('Ignored: not paid');
            return;
          }
          console.log('Processing paid session:', session.id);

          // QR
          const qrDataUrl = await QRCode.toDataURL(`ticket:${session.id}`);
          console.log('QR generated');

          // Supabase
          const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
          const { error } = await supabase.from('tickets').insert({
            ticket_id: session.id,
            event_id: session.metadata?.event_id || 'fallback',
            purchaser_name: session.customer_details?.name || 'Anonymous',
            purchaser_email: session.customer_details?.email || 'fallback@email.com',
            qr_code: qrDataUrl,
            status: 'active'
          });
          if (error) throw error;
          console.log('Supabase insert success');

          // Resend
          const emailRes = await resend.emails.send({
            from: 'tickets@gamedaytickets.io',  // VERIFIED DOMAIN
            to: session.customer_details?.email || 'garetcrenshaw@gmail.com',
            subject: 'Your Ticket',
            html: `<p>Thanks!</p><img src="${qrDataUrl}" alt="QR Code"/>`
          });
          console.log('Email sent:', emailRes.id);
        } else {
          console.log('Handled other event:', event.type);
        }
      } catch (err) {
        console.error('Async processing error:', err.message, err.stack);
      }
    });

  } catch (err) {
    console.error('Webhook error:', err.message, err.stack);
    // Only send error response if we haven't sent 200 already
    if (!res.headersSent) {
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
}
