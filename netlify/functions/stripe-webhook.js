const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const QRCode = require('qrcode');
const { Resend } = require('resend');
const crypto = require('crypto');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  console.log('');
  console.log('='.repeat(60));
  console.log('🔔 WEBHOOK RECEIVED!');
  console.log('='.repeat(60));
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('📍 Method:', event.httpMethod);
  
  // Verify webhook signature
  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not set!');
    return { statusCode: 500, body: JSON.stringify({ error: 'Webhook secret missing' }) };
  }
  
  let stripeEvent;
  
  try {
    console.log('🔐 Verifying webhook signature...');
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
    console.log('✅ Signature verified!');
    console.log('📦 Event type:', stripeEvent.type);
  } catch (err) {
    console.error('❌ Signature verification failed:', err.message);
    return { statusCode: 400, body: JSON.stringify({ error: err.message }) };
  }
  
  // Only handle checkout.session.completed
  if (stripeEvent.type !== 'checkout.session.completed') {
    console.log('ℹ️  Ignoring event type:', stripeEvent.type);
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  }
  
  console.log('');
  console.log('💳 Processing checkout.session.completed');
  console.log('='.repeat(60));
  
  try {
    const session = stripeEvent.data.object;
    const metadata = session.metadata;
    
    console.log('📦 Session ID:', session.id);
    console.log('📦 Metadata:', JSON.stringify(metadata, null, 2));
    console.log('💰 Amount paid:', session.amount_total / 100, 'USD');
    
    // Extract metadata
    const {
      eventId,
      ticketType,
      quantity: quantityStr,
      name,
      email
    } = metadata;
    
    if (!name || !email || !quantityStr) {
      throw new Error('Missing required metadata: name, email, or quantity');
    }
    
    const quantity = parseInt(quantityStr, 10);
    
    console.log('');
    console.log('👤 Purchaser:', name);
    console.log('📧 Email:', email);
    console.log('🎫 Ticket type:', ticketType);
    console.log('🔢 Quantity:', quantity);
    console.log('🏟️  Event ID:', eventId);
    console.log('');
    
    // Array to collect all ticket data
    const allTickets = [];
    
    // Loop to create each ticket
    for (let i = 0; i < quantity; i++) {
      console.log('-'.repeat(60));
      console.log(`🎫 Creating ticket ${i + 1} of ${quantity}...`);
      console.log('-'.repeat(60));
      
      // Generate unique ticket ID
      const ticketUuid = crypto.randomUUID();
      console.log('🆔 Generated UUID:', ticketUuid);
      
      // Generate QR code data
      const qrData = `https://yourdomain.com/verify?ticket=${ticketUuid}`;
      console.log('📱 QR data:', qrData);
      
      // Generate QR code as PNG buffer
      console.log('📱 Generating QR code PNG buffer...');
      const qrBuffer = await QRCode.toBuffer(qrData, {
        type: 'png',
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      console.log('✅ QR buffer created, size:', qrBuffer.length, 'bytes');
      
      // Upload to Supabase Storage
      const fileName = `${ticketUuid}.png`;
      console.log('☁️  Uploading to Supabase bucket "qrcodes"...');
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('qrcodes')
        .upload(fileName, qrBuffer, {
          contentType: 'image/png',
          upsert: true
        });
      
      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw uploadError;
      }
      
      console.log('✅ Upload successful:', uploadData);
      
      // Get public URL
      console.log('🔗 Getting public URL...');
      const { data: urlData } = supabase.storage
        .from('qrcodes')
        .getPublicUrl(fileName);
      
      const publicUrl = urlData.publicUrl;
      console.log('✅ Public URL:', publicUrl);
      
      // Insert into database - EXACT schema match
      console.log('💾 Inserting into database...');
      const ticketData = {
        event_id: eventId || '1',
        ticket_type: ticketType || 'General Admission',
        purchaser_name: name,
        purchaser_email: email,
        ticket_id: ticketUuid,
        qr_code_url: publicUrl,
        status: 'valid',
        created_at: new Date().toISOString()
      };
      
      console.log('💾 Ticket data:', JSON.stringify(ticketData, null, 2));
      
      const { data: insertedTicket, error: insertError } = await supabase
        .from('tickets')
        .insert([ticketData])
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ Database insert error:', insertError);
        console.error('❌ Error details:', JSON.stringify(insertError, null, 2));
        throw insertError;
      }
      
      console.log('✅ Ticket inserted successfully!');
      console.log('✅ Database ID:', insertedTicket.id);
      
      allTickets.push({
        ticket_id: ticketUuid,
        qr_code_url: publicUrl,
        ticket_number: i + 1
      });
      
      console.log(`✅ Ticket ${i + 1} of ${quantity} complete!`);
      console.log('');
    }
    
    console.log('='.repeat(60));
    console.log(`✅ All ${quantity} tickets created successfully!`);
    console.log('='.repeat(60));
    console.log('');
    
    // Send email with all QR codes
    console.log('📧 Preparing email...');
    console.log('📧 Recipient:', email);
    console.log('📧 Ticket count:', allTickets.length);
    
    // Build HTML email
    const ticketHtmlRows = allTickets.map((ticket) => `
      <div style="margin: 30px 0; padding: 20px; border: 2px dashed #ddd; border-radius: 10px; text-align: center;">
        <h3 style="margin: 0 0 20px 0; color: #333;">🎫 Ticket ${ticket.ticket_number} of ${quantity}</h3>
        <img src="${ticket.qr_code_url}" alt="QR Code" width="300" height="300" style="display: block; margin: 0 auto; border-radius: 8px;" />
        <p style="margin: 20px 0 0 0; font-size: 14px; color: #666; font-family: monospace;">
          ID: ${ticket.ticket_id}
        </p>
      </div>
    `).join('');
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 32px;">🎉 Your Tickets Are Here!</h1>
          </div>
          
          <!-- Body -->
          <div style="background: #f9fafb; padding: 40px 20px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 20px; margin: 0 0 10px 0;">
              Hi <strong>${name}</strong>! 👋
            </p>
            
            <p style="font-size: 16px; margin: 0 0 30px 0; color: #666;">
              Thank you for your purchase! Here ${quantity === 1 ? 'is your' : 'are your'} <strong>${quantity}</strong> ${ticketType} ticket${quantity === 1 ? '' : 's'}:
            </p>
            
            ${ticketHtmlRows}
            
            <!-- Instructions -->
            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 30px 0; border-radius: 4px;">
              <h3 style="margin: 0 0 15px 0; color: #1e40af;">📱 How to Use</h3>
              <ul style="margin: 0; padding-left: 20px; color: #1e40af;">
                <li>Show the QR code at the entrance</li>
                <li>Each ticket can only be scanned once</li>
                <li>Doors open at 6:00 PM</li>
                <li>Bring a valid ID</li>
              </ul>
            </div>
            
            <!-- Important -->
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 4px;">
              <h3 style="margin: 0 0 15px 0; color: #92400e;">⚠️ Important</h3>
              <ul style="margin: 0; padding-left: 20px; color: #92400e;">
                <li>Save this email</li>
                <li>Don't share your QR codes</li>
                <li>Arrive early to avoid lines</li>
              </ul>
            </div>
            
            <!-- Footer -->
            <p style="font-size: 14px; color: #999; text-align: center; margin: 40px 0 0 0; padding-top: 20px; border-top: 1px solid #ddd;">
              Questions? Reply to this email<br/>
              <strong>Event:</strong> ${ticketType} • <strong>Tickets:</strong> ${quantity}
            </p>
          </div>
        </body>
      </html>
    `;
    
    console.log('📧 Sending email via Resend...');
    
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Sports Tickets <onboarding@resend.dev>',
      to: [email],
      subject: `Your ${quantity} ${ticketType} Ticket${quantity === 1 ? '' : 's'} - QR Codes Inside`,
      html: emailHtml
    });
    
    if (emailError) {
      console.error('❌ Resend email error:', emailError);
      console.error('❌ Error details:', JSON.stringify(emailError, null, 2));
      throw emailError;
    }
    
    console.log('✅ QR email sent successfully!');
    console.log('✅ Email ID:', emailData?.id);
    console.log('');
    console.log('='.repeat(60));
    console.log('🎉 WEBHOOK PROCESSING COMPLETE!');
    console.log('='.repeat(60));
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
    console.error('='.repeat(60));
    console.error('❌❌❌ FATAL ERROR ❌❌❌');
    console.error('='.repeat(60));
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    console.error('='.repeat(60));
    console.error('');
    
    // Still return 200 to prevent Stripe retries
    return {
      statusCode: 200,
      body: JSON.stringify({
        received: true,
        error: error.message
      })
    };
  }
};
