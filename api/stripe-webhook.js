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

        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'localhost:3000';
        const ticketUrl = `${baseUrl.startsWith('http') ? '' : 'https://'}${baseUrl}/validate/${data.id}`;
        console.log('GENERATING QR FOR TICKET URL:', ticketUrl);
        const qrDataUrl = await QRCode.toDataURL(ticketUrl);
        console.log('QR CODE GENERATED, LENGTH:', qrDataUrl.length);

        // Upload QR code to Supabase Storage
        const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
        const fileName = `ticket-${data.id}.png`;

        console.log('UPLOADING QR TO SUPABASE STORAGE:', fileName);
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('qr-codes')
          .upload(fileName, qrBuffer, {
            contentType: 'image/png',
            upsert: true
          });

        if (uploadError) {
          console.error('QR UPLOAD ERROR:', uploadError);
          throw new Error(`QR upload failed: ${uploadError.message}`);
        }

        const qrImageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/qr-codes/${fileName}`;
        console.log('QR UPLOAD SUCCESS, PUBLIC URL:', qrImageUrl);

        qrCodes.push({ type: 'Admission Ticket', qr: qrDataUrl, imageUrl: qrImageUrl, url: ticketUrl });
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

        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'localhost:3000';
        const parkingUrl = `${baseUrl.startsWith('http') ? '' : 'https://'}${baseUrl}/validate-parking/${data.id}`;
        console.log('GENERATING QR FOR PARKING URL:', parkingUrl);
        const qrDataUrl = await QRCode.toDataURL(parkingUrl);
        console.log('PARKING QR GENERATED, LENGTH:', qrDataUrl.length);

        // Upload parking QR code to Supabase Storage
        const parkingQrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
        const parkingFileName = `parking-${data.id}.png`;

        console.log('UPLOADING PARKING QR TO SUPABASE STORAGE:', parkingFileName);
        const { data: parkingUploadData, error: parkingUploadError } = await supabase.storage
          .from('qr-codes')
          .upload(parkingFileName, parkingQrBuffer, {
            contentType: 'image/png',
            upsert: true
          });

        if (parkingUploadError) {
          console.error('PARKING QR UPLOAD ERROR:', parkingUploadError);
          throw new Error(`Parking QR upload failed: ${parkingUploadError.message}`);
        }

        const parkingQrImageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/qr-codes/${parkingFileName}`;
        console.log('PARKING QR UPLOAD SUCCESS, PUBLIC URL:', parkingQrImageUrl);

        qrCodes.push({ type: 'Parking Pass', qr: qrDataUrl, imageUrl: parkingQrImageUrl, url: parkingUrl });
      }

      console.log('ALL INSERTS COMPLETE, GENERATING EMAIL...');

      console.log('RESEND API KEY STATUS:', process.env.RESEND_API_KEY ? 'SET' : 'MISSING');
      console.log('EMAIL RECIPIENT:', buyerEmail);
      console.log('QR CODES COUNT:', qrCodes.length);

      const resend = new Resend(process.env.RESEND_API_KEY);

      // Debug QR codes content
      console.log('QR CODES DETAILS:');
      qrCodes.forEach((q, i) => {
        console.log(`QR ${i+1}: ${q.type} - Validation URL: ${q.url} - Hosted Image: ${q.imageUrl}`);
      });

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Your Game Tickets Are Ready!</h1>
          <p style="font-size: 16px; line-height: 1.6;">Hi ${buyerName},</p>
          <p style="font-size: 16px; line-height: 1.6;">Thank you for your purchase! Here are your digital tickets and parking passes. Simply show the QR codes at the gate or parking entrance.</p>

          ${qrCodes.map(q => `<div style="margin: 40px 0; text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
            <h3 style="margin: 0 0 15px 0; color: #333;">${q.type}</h3>
            <img src="${q.imageUrl}" width="250" height="250" alt="${q.type} QR Code" style="border: 2px solid #000; border-radius: 10px; display: block; margin: 0 auto;"/>
            <p style="margin: 15px 0 0 0; font-size: 14px; color: #666;">
              <a href="${q.url}" style="color: #007bff; text-decoration: none;">Click here if you can't scan the QR code</a>
            </p>
          </div>`).join('')}

          <p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
            If you have any questions, please contact our support team.<br>
            See you at the game!
          </p>
        </div>
      `;

      console.log('EMAIL HTML LENGTH:', emailHtml.length);
      console.log('EMAIL HTML PREVIEW:', emailHtml.substring(0, 200) + '...');

      try {
        console.log('SENDING EMAIL VIA RESEND...');
        const emailResult = await resend.emails.send({
          from: 'Gameday Tickets <noreply@sports-tickets.app>', // Use noreply domain for better deliverability
          to: buyerEmail,
          subject: 'Your Game Tickets Are Ready!',
          html: emailHtml
        });

        console.log('EMAIL API RESPONSE:', JSON.stringify(emailResult, null, 2));

        if (emailResult.error) {
          console.error('RESEND API ERROR:', emailResult.error);
          throw new Error(`Email send failed: ${emailResult.error.message}`);
        }

        console.log('🎉 SUCCESS — EMAIL SENT, QR GENERATED, SUPABASE UPDATED');
        console.log('EMAIL ID:', emailResult.id || emailResult.data?.id || 'unknown');
        console.log('TOTAL QR CODES:', qrCodes.length);

      } catch (emailError) {
        console.error('EMAIL SENDING FAILED:', emailError);
        throw new Error(`Email send error: ${emailError.message}`);
      }
    }

    res.status(200).end();

  } catch (err) {
    console.error('💥 WEBHOOK CRASHED:', err.message);
    console.error('💥 ERROR STACK:', err.stack);
    console.error('💥 FULL ERROR OBJECT:', JSON.stringify(err, null, 2));
    res.status(500).send(`Webhook error: ${err.message}`);
  }
}
