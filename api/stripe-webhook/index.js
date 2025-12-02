const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const { generateTicketQr } = require('../src/lib/qr.js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Vercel config for raw body
module.exports.config = {
  api: {
    bodyParser: false,
  },
};

// Vercel serverless function
module.exports = async function handler(req, res) {
  console.log('🚨 WEBHOOK HIT - START');

  try {
    // Collect raw body for Stripe signature verification
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    const sig = req.headers['stripe-signature'];

    console.log('BODY LENGTH:', body ? body.length : 'undefined');
    console.log('SIGNATURE PRESENT:', !!sig);

    let eventData;
    try {
      eventData = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      console.log('✅ EVENT VERIFIED:', eventData.type, eventData.id);
    } catch (sigError) {
      console.error('❌ SIGNATURE VERIFICATION FAILED:', sigError.message);

      if (!process.env.STRIPE_WEBHOOK_SECRET || process.env.NODE_ENV === 'development') {
        console.log('🔧 DEVELOPMENT MODE: Using raw event data for testing');
        try {
          const rawEvent = typeof body === 'string' ? JSON.parse(body) : body;
          eventData = {
            type: rawEvent.type,
            data: { object: rawEvent.data.object },
            id: rawEvent.id
          };
          console.log('✅ USING RAW EVENT:', eventData.type, eventData.id);
        } catch (parseError) {
          console.error('❌ FAILED TO PARSE RAW EVENT:', parseError.message);
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid webhook payload' }));
          return;
        }
      } else {
        console.error('🔍 DEBUG INFO:');
        console.error('   - Body length:', body ? body.length : 'undefined');
        console.error('   - Signature present:', !!sig);
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Webhook signature verification failed' }));
        return;
      }
    }

    if (eventData.type === 'checkout.session.completed') {
      console.log('✅ CHECKOUT SESSION COMPLETED - STARTING FULFILLMENT');
      console.log('Session ID:', eventData.data.object.id);
      console.log('Customer Email:', eventData.data.object.customer_details?.email);

      const session = eventData.data.object;
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
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ received: true }));
        return;
      }

      console.log('🗄️  STARTING DATABASE INSERTS...');

      console.log('SUPABASE CONNECTION:', {
        url: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
        key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING'
      });

      const qrCodes = [];

      // Insert admission tickets
      for (let i = 0; i < admissionQty; i++) {
        console.log(`INSERTING TICKET ${i + 1}/${admissionQty}`);

        const ticketId = `ticket-${session.id}-${i + 1}`;
        const validateUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}/validate/${ticketId}`
          : `http://localhost:3000/validate/${ticketId}`;

        const qrCodeUrl = await generateTicketQr(validateUrl);

        const { data, error } = await supabase.from('tickets').insert({
          ticket_id: ticketId,
          event_id: eventId,
          purchaser_email: buyerEmail,
          purchaser_name: buyerName,
          qr_code_url: qrCodeUrl
        }).select().single();

        if (error) {
          console.error('TICKET INSERT ERROR:', error);
          throw new Error(`Ticket insert error: ${error.message}`);
        }

        console.log('TICKET INSERTED, ID:', data.id, 'TICKET_ID:', ticketId);
        qrCodes.push({ type: 'Admission Ticket', qr: qrCodeUrl, url: validateUrl });
      }

      // Insert parking passes
      for (let i = 0; i < parkingQty; i++) {
        console.log(`INSERTING PARKING PASS ${i + 1}/${parkingQty}`);

        const ticketId = `parking-${session.id}-${i + 1}`;
        const validateUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}/validate/${ticketId}`
          : `http://localhost:3000/validate/${ticketId}`;

        const qrCodeUrl = await generateTicketQr(validateUrl);

        const { data, error } = await supabase.from('parking_passes').insert({
          ticket_id: ticketId,
          event_id: eventId,
          purchaser_email: buyerEmail,
          purchaser_name: buyerName,
          qr_code_url: qrCodeUrl
        }).select().single();

        if (error) {
          console.error('PARKING INSERT ERROR:', error);
          throw new Error(`Parking insert error: ${error.message}`);
        }

        console.log('PARKING INSERTED, ID:', data.id, 'TICKET_ID:', ticketId);
        qrCodes.push({ type: 'Parking Pass', qr: qrCodeUrl, url: validateUrl });
      }

      console.log('ALL INSERTS COMPLETE, GENERATING EMAIL...');

      console.log('RESEND API KEY STATUS:', process.env.RESEND_API_KEY ? 'SET' : 'MISSING');
      console.log('EMAIL RECIPIENT:', buyerEmail);
      console.log('QR CODES COUNT:', qrCodes.length);

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
            <img src="${q.qr}" width="250" height="250" alt="${q.type} QR Code" style="border: 2px solid #000; border-radius: 10px; display: block; margin: 0 auto;"/>
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

      try {
        console.log('SENDING EMAIL VIA RESEND...');
        const emailResult = await resend.emails.send({
          from: 'Sports Tickets <delivered@resend.dev>',
          to: buyerEmail,
          subject: 'Your Tickets - Ready to Scan!',
          html: emailHtml,
          reply_to: 'support@sports-tickets.app'
        });

        console.log('EMAIL API RESPONSE:', JSON.stringify(emailResult, null, 2));

        if (emailResult.error) {
          console.error('RESEND API ERROR:', emailResult.error);
          throw new Error(`Email send failed: ${emailResult.error.message}`);
        }

        console.log('🎉 SUCCESS — EMAIL SENT, QR GENERATED, SUPABASE UPDATED');
        console.log('📧 EMAIL ID:', emailResult.data?.id || 'unknown');
        console.log('🎫 TOTAL ITEMS:', qrCodes.length, `(Tickets: ${admissionQty}, Parking: ${parkingQty})`);
        console.log('✅ FULFILLMENT COMPLETE FOR SESSION:', session.id);

      } catch (emailError) {
        console.error('EMAIL SENDING FAILED:', emailError);
        throw new Error(`Email send error: ${emailError.message}`);
      }
    }

    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ received: true }));

  } catch (error) {
    console.error('💥 WEBHOOK CRASHED:', error);
    console.error('💥 ERROR MESSAGE:', error.message);
    console.error('💥 ERROR STACK:', error.stack);
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Webhook handler failed', message: error.message }));
  }
};
