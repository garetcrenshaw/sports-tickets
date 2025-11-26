// /api/stripe-webhook.js

import { buffer } from 'micro';

import Stripe from 'stripe';

import { Resend } from 'resend';

import QRCode from 'qrcode';

import { createClient } from '@supabase/supabase-js';



export const config = { api: { bodyParser: false } };



export default async function handler(req, res) {

  if (req.method !== 'POST') {

    console.log('Non-POST method — skipping');

    return res.status(405).end();

  }



  try {

    console.log('Webhook hit — env check:', {

      stripeKey: !!process.env.STRIPE_SECRET_KEY,

      webhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,

      resendKey: !!process.env.RESEND_API_KEY,

      supabaseUrl: !!process.env.SUPABASE_URL,

      supabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,

      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'localhost:3000',

    });



    const buf = await buffer(req);

    const sig = req.headers['stripe-signature'];



    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    let event = stripe.webhooks.constructEvent(buf.toString(), sig, process.env.STRIPE_WEBHOOK_SECRET);

    console.log('Webhook verified:', event.type, event.id);



    if (event.type === 'checkout.session.completed') {

      const session = event.data.object;

      const metadata = session.metadata || {};



      const admissionQty = parseInt(metadata.admissionQuantity || '0', 10);

      const parkingQty = parseInt(metadata.parkingQuantity || '0', 10);

      const buyerEmail = metadata.buyerEmail || session.customer_details?.email;

      const buyerName = metadata.buyerName || session.customer_details?.name || 'Customer';

      const eventId = metadata.eventId;



      console.log('Fulfillment start:', { admissionQty, parkingQty, buyerEmail, eventId });



      if (!buyerEmail || (admissionQty + parkingQty === 0)) {

        console.log('Nothing to fulfill — skipping');

        return res.status(200).end();

      }



      const qrCodes = [];

      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);



      for (let i = 0; i < admissionQty; i++) {

        const { data, error } = await supabase.from('tickets').insert({ event_id: eventId, buyer_email: buyerEmail, buyer_name: buyerName }).select().single();

        if (error) throw new Error(`Ticket insert error: ${error.message}`);

        const qr = await QRCode.toDataURL(`https://${process.env.NEXT_PUBLIC_SITE_URL || 'localhost:3000'}/validate/${data.id}`);

        qrCodes.push({ type: 'Admission', qr });

        console.log('Ticket created:', data.id);

      }



      for (let i = 0; i < parkingQty; i++) {

        const { data, error } = await supabase.from('parking_passes').insert({ event_id: eventId, buyer_email: buyerEmail, buyer_name: buyerName }).select().single();

        if (error) throw new Error(`Parking insert error: ${error.message}`);

        const qr = await QRCode.toDataURL(`https://${process.env.NEXT_PUBLIC_SITE_URL || 'localhost:3000'}/validate-parking/${data.id}`);

        qrCodes.push({ type: 'Parking', qr });

        console.log('Parking created:', data.id);

      }



      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({

        from: 'Gameday Tickets <tickets@yourdomain.com>',

        to: buyerEmail,

        subject: 'Your Tickets!',

        html: `<h1>Hey ${buyerName}!</h1><p>Here are your tickets:</p>${qrCodes.map(q => `<div style="margin:40px 0;text-align:center"><strong>${q.type}</strong><br><img src="${q.qr}" width="300"/></div>`).join('')}<p>See you there!</p>`,

      });

      console.log('Email sent to:', buyerEmail);

    }



    res.status(200).end();

  } catch (err) {

    console.error('WEBHOOK ERROR:', err.message, err.stack);

    res.status(400).send(`Webhook Error: ${err.message}`);

  }

}
