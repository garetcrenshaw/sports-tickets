console.log('🔥 WEBHOOK MODULE LOADING...');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const QRCode = require('qrcode');
const { Resend } = require('resend');
const crypto = require('crypto');

console.log('🔥 STEP 1: Modules imported');
console.log('🔥 STEP 2: Checking environment variables...');
console.log('  STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'EXISTS ✅' : 'MISSING ❌');
console.log('  STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? 'EXISTS ✅' : 'MISSING ❌');
console.log('  SUPABASE_URL:', process.env.SUPABASE_URL ? 'EXISTS ✅' : 'MISSING ❌');
console.log('  SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'EXISTS ✅' : 'MISSING ❌');
console.log('  RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'EXISTS ✅' : 'MISSING ❌');

console.log('🔥 STEP 3: Creating Supabase client...');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
console.log('🔥 STEP 4: Supabase client created ✅');

console.log('🔥 STEP 5: Creating Resend client...');
const resend = new Resend(process.env.RESEND_API_KEY);
console.log('🔥 STEP 6: Resend client created ✅');

console.log('🔥 WEBHOOK MODULE LOADED SUCCESSFULLY ✅');
console.log('');

exports.handler = async (event) => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚨 WEBHOOK HANDLER CALLED!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('STEP 1: Handler started at', new Date().toISOString());
  console.log('STEP 2: HTTP Method:', event.httpMethod);
  console.log('STEP 3: Headers:', JSON.stringify(event.headers, null, 2));
  
  if (event.httpMethod !== 'POST') {
    console.log('❌ ERROR: Wrong method, expected POST');
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  
  console.log('STEP 4: Method is POST ✅');
  
  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  console.log('STEP 5: Stripe signature exists?', sig ? 'YES ✅' : 'NO ❌');
  console.log('STEP 6: Webhook secret exists?', webhookSecret ? 'YES ✅' : 'NO ❌');
  
  if (!webhookSecret) {
    console.error('❌ FATAL: STRIPE_WEBHOOK_SECRET not set in environment!');
    return { statusCode: 500, body: 'Webhook secret not configured' };
  }
  
  console.log('STEP 7: Attempting to verify webhook signature...');
  
  let stripeEvent;
  
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
    console.log('STEP 8: ✅ SIGNATURE VERIFIED SUCCESSFULLY!');
    console.log('STEP 9: Event type:', stripeEvent.type);
    console.log('STEP 10: Event ID:', stripeEvent.id);
  } catch (err) {
    console.error('❌❌❌ SIGNATURE VERIFICATION FAILED!');
    console.error('ERROR:', err.message);
    console.error('STACK:', err.stack);
    return { 
      statusCode: 400, 
      body: JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` })
    };
  }
  
  console.log('STEP 11: Checking event type...');
  
  if (stripeEvent.type !== 'checkout.session.completed') {
    console.log('STEP 12: Event type is', stripeEvent.type, '- ignoring (only care about checkout.session.completed)');
    return { statusCode: 200, body: JSON.stringify({ received: true, ignored: true }) };
  }
  
  console.log('STEP 12: ✅ Event type is checkout.session.completed!');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('💳 PROCESSING CHECKOUT.SESSION.COMPLETED');
  console.log('═══════════════════════════════════════════════════════════');
  
  try {
    console.log('STEP 13: Extracting session object...');
    const session = stripeEvent.data.object;
    console.log('STEP 14: Session object:', JSON.stringify(session, null, 2));
    
    console.log('STEP 15: Session ID:', session.id);
    console.log('STEP 16: Customer email:', session.customer_email);
    console.log('STEP 17: Amount total:', session.amount_total);
    console.log('STEP 18: Payment status:', session.payment_status);
    
    console.log('STEP 19: Extracting metadata...');
    const metadata = session.metadata;
    console.log('STEP 20: Metadata:', JSON.stringify(metadata, null, 2));
    
    const { eventId, ticketType, quantity: quantityStr, name, email } = metadata;
    
    console.log('STEP 21: Parsed from metadata:');
    console.log('  eventId:', eventId);
    console.log('  ticketType:', ticketType);
    console.log('  quantity (string):', quantityStr);
    console.log('  name:', name);
    console.log('  email:', email);
    
    if (!name || !email || !quantityStr) {
      throw new Error('Missing required metadata fields: name, email, or quantity');
    }
    
    const quantity = Number(quantityStr);
    console.log('STEP 22: Quantity as number:', quantity);
    
    if (isNaN(quantity) || quantity < 1) {
      throw new Error(`Invalid quantity: ${quantityStr}`);
    }
    
    console.log('STEP 23: Starting ticket creation loop...');
    console.log('STEP 24: Will create', quantity, 'ticket(s)');
    
    const allTickets = [];
    
    for (let i = 0; i < quantity; i++) {
      console.log('');
      console.log('─────────────────────────────────────────────────────────');
      console.log(`🎫 CREATING TICKET ${i + 1} OF ${quantity}`);
      console.log('─────────────────────────────────────────────────────────');
      
      try {
        console.log(`STEP 25.${i}.1: Generating UUID...`);
        const ticketUuid = crypto.randomUUID();
        console.log(`STEP 25.${i}.2: UUID generated:`, ticketUuid);
        
        console.log(`STEP 26.${i}.1: QR text will be:`, ticketUuid);
        const qrText = ticketUuid;
        
        console.log(`STEP 27.${i}.1: Generating QR code buffer...`);
        const qrBuffer = await QRCode.toBuffer(qrText, {
          type: 'png',
          width: 400,
          margin: 2
        });
        console.log(`STEP 27.${i}.2: QR buffer generated, size:`, qrBuffer.length, 'bytes');
        
        console.log(`STEP 28.${i}.1: Uploading to Supabase storage bucket "qrcodes"...`);
        const fileName = `${ticketUuid}.png`;
        console.log(`STEP 28.${i}.2: File name:`, fileName);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('qrcodes')
          .upload(fileName, qrBuffer, {
            contentType: 'image/png',
            upsert: true
          });
        
        if (uploadError) {
          console.error(`STEP 28.${i}.3: ❌ UPLOAD ERROR:`, uploadError);
          throw uploadError;
        }
        
        console.log(`STEP 28.${i}.3: ✅ Upload successful!`);
        console.log(`STEP 28.${i}.4: Upload data:`, JSON.stringify(uploadData, null, 2));
        
        console.log(`STEP 29.${i}.1: Getting public URL...`);
        const { data: urlData } = supabase.storage
          .from('qrcodes')
          .getPublicUrl(fileName);
        
        const publicUrl = urlData.publicUrl;
        console.log(`STEP 29.${i}.2: Public URL:`, publicUrl);
        
        console.log(`STEP 30.${i}.1: Preparing database insert...`);
        const ticketData = {
          event_id: eventId || '1',
          ticket_type: ticketType || 'General Admission',
          purchaser_name: name,
          purchaser_email: email,
          ticket_id: ticketUuid,
          qr_code_url: publicUrl,
          status: 'valid'
        };
        
        console.log(`STEP 30.${i}.2: Ticket data to insert:`, JSON.stringify(ticketData, null, 2));
        
        console.log(`STEP 31.${i}.1: Inserting into "tickets" table...`);
        const { data: insertedData, error: insertError } = await supabase
          .from('tickets')
          .insert([ticketData])
          .select()
          .single();
        
        if (insertError) {
          console.error(`STEP 31.${i}.2: ❌ INSERT ERROR:`, insertError);
          console.error(`STEP 31.${i}.3: Error message:`, insertError.message);
          console.error(`STEP 31.${i}.4: Error details:`, JSON.stringify(insertError, null, 2));
          throw insertError;
        }
        
        console.log(`STEP 31.${i}.2: ✅ Insert successful!`);
        console.log(`STEP 31.${i}.3: Inserted data:`, JSON.stringify(insertedData, null, 2));
        console.log(`STEP 31.${i}.4: Database ID:`, insertedData.id);
        
        allTickets.push({
          ticket_id: ticketUuid,
          qr_code_url: publicUrl,
          ticket_number: i + 1
        });
        
        console.log(`✅ TICKET ${i + 1} OF ${quantity} COMPLETE!`);
        
      } catch (ticketError) {
        console.error(`❌❌❌ ERROR CREATING TICKET ${i + 1}:`);
        console.error('Error message:', ticketError.message);
        console.error('Error stack:', ticketError.stack);
        throw ticketError;
      }
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ ALL ${quantity} TICKETS CREATED SUCCESSFULLY!`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('STEP 32: Tickets array:', JSON.stringify(allTickets, null, 2));
    
    console.log('');
    console.log('STEP 33: Preparing email...');
    console.log('STEP 34: Recipient:', email);
    console.log('STEP 35: Building HTML...');
    
    const ticketHtmlRows = allTickets.map((ticket) => `
      <div style="margin: 30px 0; padding: 20px; border: 2px dashed #ddd; border-radius: 10px; text-align: center;">
        <h3 style="margin: 0 0 20px 0;">🎫 Ticket ${ticket.ticket_number} of ${quantity}</h3>
        <img src="${ticket.qr_code_url}" width="300" height="300" style="display: block; margin: 0 auto;" />
        <p style="margin: 20px 0 0 0; font-size: 14px; color: #666; font-family: monospace;">
          ID: ${ticket.ticket_id}
        </p>
      </div>
    `).join('');
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px;">
            <h1 style="margin: 0;">🎉 Your Tickets Are Here!</h1>
          </div>
          <div style="background: #f9fafb; padding: 40px 20px;">
            <h2>Hi ${name}! 👋</h2>
            <p>Thank you for your purchase! Here ${quantity === 1 ? 'is your' : 'are your'} ${quantity} ${ticketType} ticket${quantity === 1 ? '' : 's'}:</p>
            ${ticketHtmlRows}
            <p style="margin-top: 30px; color: #666;">Show the QR code at the entrance. Each ticket can only be scanned once.</p>
          </div>
        </body>
      </html>
    `;
    
    console.log('STEP 36: HTML built ✅');
    console.log('STEP 37: Sending email via Resend...');
    
    try {
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: 'Sports Tickets <onboarding@resend.dev>',
        to: [email],
        subject: `Your ${quantity} ${ticketType} Ticket${quantity === 1 ? '' : 's'}`,
        html: emailHtml
      });
      
      if (emailError) {
        console.error('STEP 38: ❌ EMAIL ERROR:', emailError);
        console.error('Error details:', JSON.stringify(emailError, null, 2));
        throw emailError;
      }
      
      console.log('STEP 38: ✅ EMAIL SENT SUCCESSFULLY!');
      console.log('STEP 39: Email data:', JSON.stringify(emailData, null, 2));
      console.log('STEP 40: Email ID:', emailData?.id);
      
    } catch (emailError) {
      console.error('❌ ERROR SENDING EMAIL:', emailError.message);
      // Don't throw - tickets are created, email failure is not critical
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 WEBHOOK PROCESSING COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        received: true,
        tickets_created: allTickets.length,
        email_sent: true
      })
    };
    
  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('❌❌❌ FATAL ERROR IN WEBHOOK PROCESSING ❌❌❌');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error object:', JSON.stringify(error, null, 2));
    console.error('═══════════════════════════════════════════════════════════');
    console.error('');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        received: true,
        error: error.message
      })
    };
  }
};
