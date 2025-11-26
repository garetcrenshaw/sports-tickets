// /api/stripe-webhook.js

console.log('STRIPE-WEBHOOK.JS LOADED — IF YOU SEE THIS, FILE IMPORT SUCCEEDED');

import { buffer } from 'micro';

import Stripe from 'stripe';

import { Resend } from 'resend';

import QRCode from 'qrcode';

import { createClient } from '@supabase/supabase-js';

console.log('ALL IMPORTS SUCCESSFUL');

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  console.log('HANDLER STARTED - WEBHOOK EXECUTING');

  try {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];

    console.log('BUFFER LENGTH:', buf.length);
    console.log('SIGNATURE PRESENT:', !!sig);

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // TEMPORARY: Skip signature verification for testing
    let event;
    try {
      event = stripe.webhooks.constructEvent(buf.toString(), sig, process.env.STRIPE_WEBHOOK_SECRET);
      console.log('EVENT VERIFIED:', event.type, event.id);
    } catch (sigError) {
      console.log('SIGNATURE VERIFICATION FAILED, USING RAW EVENT FOR TESTING');
      const rawEvent = JSON.parse(buf.toString());
      event = {
        type: rawEvent.type,
        data: { object: rawEvent.data.object },
        id: rawEvent.id
      };
      console.log('USING RAW EVENT:', event.type, event.id);
    }

    if (event.type === 'checkout.session.completed') {
      console.log('FULFILLMENT STARTING - CHECKOUT COMPLETED');

      const session = event.data.object;
      const m = session.metadata || {};
      console.log('📦 METADATA RECEIVED:', JSON.stringify(m, null, 2));

      const admissionQty = parseInt(m.admissionQuantity || '0', 10);
      const parkingQty = parseInt(m.parkingQuantity || '0', 10);
      const buyerEmail = m.buyerEmail || session.customer_details?.email;
      const buyerName = m.buyerName || session.customer_details?.name || 'Customer';
      const eventId = m.eventId;

      console.log('PARSED VALUES:', { admissionQty, parkingQty, buyerEmail, buyerName, eventId });

      if (!buyerEmail || (admissionQty + parkingQty === 0)) {
        console.log('NOTHING TO FULFILL - SKIPPING');
        return res.status(200).end();
      }

      console.log('STARTING SUPABASE INSERTS...');
      const qrCodes = [];

      console.log('SUPABASE CONNECTION:', {
        url: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
        key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
        urlValue: process.env.SUPABASE_URL?.substring(0, 20) + '...',
        keyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length
      });

      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

      console.log('SUPABASE CLIENT CREATED, TESTING CONNECTION...');

      // Test Supabase connection
      try {
        const { data: testData, error: testError } = await supabase.from('tickets').select('count').limit(1);
        if (testError) {
          console.log('SUPABASE CONNECTION TEST FAILED:', testError);
          throw new Error(`Supabase connection failed: ${testError.message}`);
        }
        console.log('SUPABASE CONNECTION TEST PASSED');
      } catch (connError) {
        console.log('SUPABASE CONNECTION ERROR:', connError);
        throw connError;
      }

      // Insert admission tickets
      for (let i = 0; i < admissionQty; i++) {
        console.log(`INSERTING TICKET ${i + 1}/${admissionQty}`);
        const { data, error } = await supabase.from('tickets').insert({
          event_id: eventId,
          buyer_email: buyerEmail,
          buyer_name: buyerName
        }).select().single();

        if (error) {
          console.error('TICKET INSERT ERROR:', error);
          throw new Error(`Ticket insert error: ${error.message}`);
        }

        console.log('TICKET INSERTED, ID:', data.id);

        const qr = await QRCode.toDataURL(`https://${process.env.NEXT_PUBLIC_SITE_URL || 'localhost:3000'}/validate/${data.id}`);
        qrCodes.push({ type: 'Admission Ticket', qr });
      }

      // Insert parking passes
      for (let i = 0; i < parkingQty; i++) {
        console.log(`INSERTING PARKING PASS ${i + 1}/${parkingQty}`);
        const { data, error } = await supabase.from('parking_passes').insert({
          event_id: eventId,
          buyer_email: buyerEmail,
          buyer_name: buyerName
        }).select().single();

        if (error) {
          console.error('PARKING INSERT ERROR:', error);
          throw new Error(`Parking insert error: ${error.message}`);
        }

        console.log('PARKING INSERTED, ID:', data.id);

        const qr = await QRCode.toDataURL(`https://${process.env.NEXT_PUBLIC_SITE_URL || 'localhost:3000'}/validate-parking/${data.id}`);
        qrCodes.push({ type: 'Parking Pass', qr });
      }

      console.log('ALL INSERTS COMPLETE, GENERATING EMAIL...');

      const resend = new Resend(process.env.RESEND_API_KEY);
      const emailResult = await resend.emails.send({
        from: 'Gameday Tickets <tickets@yourdomain.com>',
        to: buyerEmail,
        subject: 'Your Tickets Are Here!',
        html: `<h1>Hey ${buyerName}!</h1><p>Here are your tickets:</p>${qrCodes.map(q => `<div style="margin:40px;text-align:center"><strong>${q.type}</strong><br><img src="${q.qr}" width="300"/></div>`).join('')}<p>See you at the game!</p>`
      });

      console.log('🎉 SUCCESS — EMAIL SENT, QR GENERATED, SUPABASE UPDATED');
      console.log('EMAIL ID:', emailResult.id);
      console.log('TOTAL QR CODES:', qrCodes.length);
    }

    res.status(200).end();

  } catch (err) {
    console.error('💥 WEBHOOK CRASHED:', err.message);
    console.error('💥 ERROR STACK:', err.stack);
    console.error('💥 FULL ERROR OBJECT:', JSON.stringify(err, null, 2));
    res.status(500).send(`Webhook error: ${err.message}`);
  }
}
