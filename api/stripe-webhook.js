// /api/stripe-webhook.js

import { buffer } from 'micro';

import Stripe from 'stripe';

import { Resend } from 'resend';

import QRCode from 'qrcode';

import { createClient } from '@supabase/supabase-js';



const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);



export const config = { api: { bodyParser: false } };



export default async function handler(req, res) {

  if (req.method !== 'POST') return res.status(405).end();



  console.log('Webhook hit — env check:', {

    hasSecret: !!webhookSecret,

    hasResend: !!process.env.RESEND_API_KEY,

    hasSupabase: !!process.env.SUPABASE_SERVICE_ROLE_KEY,

  });



  const buf = await buffer(req);

  const sig = req.headers['stripe-signature'];



  let event;

  try {

    event = stripe.webhooks.constructEvent(buf.toString(), sig, webhookSecret);

    console.log('Webhook verified:', event.id, event.type);

  } catch (err) {

    console.error('Webhook signature failed:', err.message);

    return res.status(400).send(`Webhook Error: ${err.message}`);

  }



  if (event.type === 'checkout.session.completed') {

    const session = event.data.object;

    const metadata = session.metadata || {};



    const admissionQty = parseInt(metadata.admissionQuantity || '0', 10);

    const parkingQty = parseInt(metadata.parkingQuantity || '0', 10);

    const buyerEmail = metadata.buyerEmail || session.customer_details?.email;

    const buyerName = metadata.buyerName || session.customer_details?.name || 'Customer';

    const eventId = metadata.eventId;



    console.log('FULFILLMENT START', { admissionQty, parkingQty, buyerEmail, eventId });



    if (!buyerEmail || (!admissionQty && !parkingQty)) {

      console.log('Nothing to fulfill');

      return res.status(200).end();

    }



    const qrCodes = [];



    try {

      for (let i = 0; i < admissionQty; i++) {

        const { data, error } = await supabase

          .from('tickets')

          .insert({ event_id: eventId, buyer_email: buyerEmail, buyer_name: buyerName })

          .select()

          .single();

        if (error) throw error;

        const qr = await QRCode.toDataURL(`${process.env.NEXT_PUBLIC_SITE_URL}/validate/${data.id}`);

        qrCodes.push({ type: 'Admission Ticket', qr });

      }



      for (let i = 0; i < parkingQty; i++) {

        const { data, error } = await supabase

          .from('parking_passes')

          .insert({ event_id: eventId, buyer_email: buyerEmail, buyer_name: buyerName })

          .select()

          .single();

        if (error) throw error;

        const qr = await QRCode.toDataURL(`${process.env.NEXT_PUBLIC_SITE_URL}/validate-parking/${data.id}`);

        qrCodes.push({ type: 'Parking Pass', qr });

      }



      await resend.emails.send({

        from: 'Gameday Tickets <tickets@yourdomain.com>',

        to: buyerEmail,

        subject: 'Your Tickets Are Here!',

        html: `<h1>Hey ${buyerName}!</h1><p>Thanks for your purchase. Here are your tickets:</p> ${qrCodes.map(

          q => `<div style="margin:40px 0;text-align:center"><strong>${q.type}</strong><br><img src="${q.qr}" width="300"/></div>`

        ).join('')}<p>See you at the game!</p>`,

      });



      console.log(`SUCCESS — ${qrCodes.length} QR codes emailed to ${buyerEmail}`);

    } catch (err) {

      console.error('FULFILLMENT FAILED:', err);

      return res.status(500).end();

    }

  }



  res.status(200).end();

}

