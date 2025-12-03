import { buffer } from 'micro';
import Stripe from 'stripe';
import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('Webhook verified:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.payment_status !== 'paid') return res.status(200).send('Ignored: not paid');

      console.log('Processing paid session:', session.id);

      // QR
      let qrDataUrl;
      try {
        qrDataUrl = await QRCode.toDataURL(`ticket:${session.id || 'fallback'}`);
        console.log('QR generated');
      } catch (qrErr) {
        console.error('QR error:', qrErr.message, qrErr.stack);
        throw qrErr;
      }

      // Supabase
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      const { error: sbError } = await supabase.from('tickets').insert({
        ticket_id: session.id,
        event_id: session.metadata?.event_id || 'fallback',
        purchaser_name: session.customer_details?.name || 'Anonymous',
        purchaser_email: session.customer_details?.email,
        qr_code: qrDataUrl,
        status: 'active'
      });
      if (sbError) {
        console.error('Supabase error:', sbError.message, sbError.details, sbError.hint);
        throw sbError;
      }
      console.log('Supabase insert success');

      // Resend
      try {
        const emailRes = await resend.emails.send({
          from: 'tickets@gamedaytickets.io',  // MUST BE VERIFIED IN RESEND
          to: session.customer_details?.email || 'garetcrenshaw@gmail.com',  // fallback your email
          subject: 'Your Ticket',
          html: `<p>Thanks!</p><img src="${qrDataUrl}" />`
        });
        console.log('Email sent:', emailRes.id);
      } catch (emailErr) {
        console.error('Resend error:', emailErr.message, emailErr.response?.body);
        throw emailErr;
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook fatal:', err.message, err.stack);
    res.status(500).json({ error: { code: '500', message: 'Server error', details: err.message } });
  }
}
