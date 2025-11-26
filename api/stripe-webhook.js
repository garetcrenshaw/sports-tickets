// /api/stripe-webhook.js

import { buffer } from 'micro';

import Stripe from 'stripe';

import { Resend } from 'resend';

import QRCode from 'qrcode';

import { createClient } from '@supabase/supabase-js';



console.log('🎫 WEBHOOK FILE LOADED - Ready for fulfillment');



export const config = { api: { bodyParser: false } };



export default async function handler(req, res) {

  console.log('🌐 Webhook hit');



  try {

    console.log('Env loaded:', {

      stripe: !!process.env.STRIPE_SECRET_KEY,

      webhook: !!process.env.STRIPE_WEBHOOK_SECRET,

      resend: !!process.env.RESEND_API_KEY,

      supabase: !!process.env.SUPABASE_SERVICE_ROLE_KEY

    });



    const buf = await buffer(req);

    const sig = req.headers['stripe-signature'];



    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const event = stripe.webhooks.constructEvent(buf.toString(), sig, process.env.STRIPE_WEBHOOK_SECRET);

    console.log('✅ Webhook verified:', event.type);



    if (event.type === 'checkout.session.completed') {

      const session = event.data.object;

      const m = session.metadata || {};

      console.log('📦 Metadata:', m);



      const admissionQty = parseInt(m.admissionQuantity || '0', 10);

      const parkingQty = parseInt(m.parkingQuantity || '0', 10);

      const buyerEmail = m.buyerEmail || session.customer_details?.email;

      const buyerName = m.buyerName || session.customer_details?.name || 'Customer';

      const eventId = m.eventId;



      if (!buyerEmail || (admissionQty + parkingQty === 0)) {

        console.log('Nothing to fulfill');

        return res.status(200).end();

      }



      const qrCodes = [];

      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);



      for (let i = 0; i < admissionQty; i++) {

        const { data, error } = await supabase.from('tickets').insert({ event_id: eventId, buyer_email: buyerEmail, buyer_name: buyerName }).select().single();

        if (error) throw error;

        const qr = await QRCode.toDataURL(`https://${process.env.NEXT_PUBLIC_SITE_URL || 'localhost:3000'}/validate/${data.id}`);

        qrCodes.push({ type: 'Admission Ticket', qr });

      }



      for (let i = 0; i < parkingQty; i++) {

        const { data, error } = await supabase.from('parking_passes').insert({ event_id: eventId, buyer_email: buyerEmail, buyer_name: buyerName }).select().single();

        if (error) throw error;

        const qr = await QRCode.toDataURL(`https://${process.env.NEXT_PUBLIC_SITE_URL || 'localhost:3000'}/validate-parking/${data.id}`);

        qrCodes.push({ type: 'Parking Pass', qr });

      }



      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({

        from: 'Gameday Tickets <tickets@yourdomain.com>',

        to: buyerEmail,

        subject: 'Your Tickets Are Here!',

        html: `<h1>Hey ${buyerName}!</h1><p>Here are your tickets:</p>${qrCodes.map(q => `<div style="margin:40px;text-align:center"><strong>${q.type}</strong><br><img src="${q.qr}" width="300"/></div>`).join('')}`

      });



      console.log('🎉 SUCCESS — Email + QR + Supabase complete');

    }



    res.status(200).end();

  } catch (err) {

    console.error('💥 WEBHOOK CRASHED:', err.message);

    console.error('FULL STACK:', err.stack);

    res.status(500).send(`Webhook error: ${err.message}`);

  }

}
