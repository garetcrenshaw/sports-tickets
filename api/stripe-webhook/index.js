import Stripe from 'stripe';
import { buffer } from 'micro';

// Critical for Vercel
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = new Stripe(process.env.STRIPE_SECRET_KEY).webhooks.constructEvent(buf.toString(), sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('Webhook verified:', event.type);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('Processing completed session:', session.id);

    // 1. Create Supabase client (service role)
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // 2. Insert tickets + parking (hardcoded 2+1 for now)
    const { data: tickets, error: ticketError } = await supabase
      .from('tickets') // ← change to your actual table name if different
      .insert([
        { session_id: session.id, purchaser_email: session.customer_details.email, type: 'admission' },
        { session_id: session.id, purchaser_email: session.customer_details.email, type: 'admission' },
        { session_id: session.id, purchaser_email: session.customer_details.email, type: 'parking' },
      ])
      .select();

    if (ticketError) {
      console.error('Supabase insert failed:', ticketError);
      return res.status(500).json({ error: 'DB insert failed', details: ticketError.message });
    }

    // 3. Generate + upload QR codes
    const QRCode = (await import('qrcode')).default;
    const qrUrls = [];
    for (const t of tickets) {
      const url = `${process.env.NEXT_PUBLIC_URL}/validate?ticket=${t.id}`;
      const qrDataUrl = await QRCode.toDataURL(url);
      const base64 = qrDataUrl.split(',')[1];
      const { error: uploadErr } = await supabase.storage
        .from('qr-codes')
        .upload(`public/${t.id}.png`, Buffer.from(base64, 'base64'), { contentType: 'image/png', upsert: true });

      if (uploadErr) console.error('QR upload failed:', uploadErr);
      qrUrls.push(`https://${process.env.SUPABASE_URL.replace('.co', '.co/storage/v1/object/public')}/qr-codes/public/${t.id}.png`);
    }

    // 4. Send email via Resend
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'tickets@sports-tickets.vercel.app',
      to: session.customer_details.email,
      subject: 'Your Game Day Tickets!',
      html: `
        <h1>Thanks for your purchase!</h1>
        <p>Here are your tickets:</p>
        ${qrUrls.map(url => `<img src="${url}" width="300" style="margin:10px;" />`).join('')}
        <p>See you at the game!</p>
      `,
    });

    console.log('Email sent + QRs uploaded for session:', session.id);
  }

  res.status(200).json({ received: true });
}
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
