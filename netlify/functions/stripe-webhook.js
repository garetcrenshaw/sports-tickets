const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const QRCode = require('qrcode');
const { Resend } = require('resend');
const { v4: uuidv4 } = require('uuid');

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

async function generateQRCode(ticketId) {
  try {
    // Generate QR code as data URL (base64 PNG)
    const qrValue = `https://yoursite.com/verify?ticket=${ticketId}`;
    console.log('📱 QR code value:', qrValue);
    
    const qrDataUrl = await QRCode.toDataURL(qrValue, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    console.log('✅ QR code data URL generated (length:', qrDataUrl.length, 'chars)');
    return qrDataUrl;
  } catch (error) {
    console.error('❌ Error generating QR code:', error);
    throw error;
  }
}

async function uploadQRToSupabase(ticketId, qrDataUrl) {
  try {
    console.log('☁️  Converting QR to buffer...');
    // Convert data URL to buffer
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    console.log('✅ Buffer created, size:', buffer.length, 'bytes');
    
    // Upload to Supabase Storage
    const fileName = `${ticketId}.png`;
    console.log('☁️  Uploading to bucket "qrcodes" as:', fileName);
    
    const { data, error } = await supabase.storage
      .from('qrcodes')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      console.error('❌ Supabase upload error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('✅ Upload successful:', data);

    // Get public URL
    console.log('🔗 Getting public URL...');
    const { data: publicUrlData } = supabase.storage
      .from('qrcodes')
      .getPublicUrl(fileName);

    console.log('✅ Public URL obtained:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('❌ Error uploading QR to Supabase:', error);
    throw error;
  }
}

async function createTicketInDatabase(ticketData) {
  console.log('📝 Inserting into database:', ticketData);
  
  const { data, error } = await supabase
    .from('tickets')
    .insert([ticketData])
    .select()
    .single();

  if (error) {
    console.error('❌ Database insert error:', error);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
    throw error;
  }

  console.log('✅ Row inserted successfully:', data);
  return data;
}

async function sendTicketEmail(email, name, tickets, quantity, ticketType) {
  try {
    console.log('📧 Building email HTML...');
    console.log('📧 Recipients:', email);
    console.log('📧 Tickets to include:', tickets.length);
    
    // Build HTML email with all QR codes
    const ticketRows = tickets.map((ticket, index) => `
      <tr>
        <td style="padding: 20px; text-align: center; border: 2px dashed #ddd;">
          <h3 style="margin: 0 0 16px 0; color: #333;">Ticket ${index + 1} of ${quantity}</h3>
          <img src="${ticket.qr_code_url}" alt="QR Code" width="250" height="250" style="display: block; margin: 0 auto;" />
          <p style="margin: 16px 0 0 0; font-size: 14px; color: #666;">
            <strong>Ticket ID:</strong> ${ticket.ticket_id}
          </p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">
            <strong>Type:</strong> ${ticketType}
          </p>
        </td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Your Tickets Are Here!</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px; margin: 0 0 20px 0;">
              Hi <strong>${name}</strong>! 👋
            </p>
            
            <p style="font-size: 16px; margin: 0 0 30px 0;">
              Thank you for your purchase! Here ${quantity === 1 ? 'is your' : 'are your'} <strong>${quantity}</strong> ${ticketType} ticket${quantity === 1 ? '' : 's'}:
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
              ${ticketRows}
            </table>

            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 0 0 30px 0;">
              <h3 style="margin: 0 0 12px 0; color: #1e40af;">📱 How to Use Your Tickets</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Show the QR code(s) at the entrance</li>
                <li>Each ticket can only be scanned once</li>
                <li>Doors open at 6:00 PM</li>
                <li>Have your ID ready for verification</li>
              </ul>
            </div>

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 0 0 30px 0;">
              <h3 style="margin: 0 0 12px 0; color: #92400e;">⚠️ Important</h3>
              <ul style="margin: 0; padding-left: 20px; color: #92400e;">
                <li>Save this email or take screenshots</li>
                <li>Don't share your QR codes publicly</li>
                <li>Arrive early to avoid lines</li>
              </ul>
            </div>

            <p style="font-size: 14px; color: #666; margin: 30px 0 0 0; text-align: center; border-top: 1px solid #ddd; padding-top: 20px;">
              Questions? Reply to this email or visit our support page.<br/>
              <strong>Event:</strong> General Admission • <strong>Total Tickets:</strong> ${quantity}
            </p>
          </div>
        </body>
      </html>
    `;

    console.log('📧 Sending email via Resend...');
    
    const { data, error } = await resend.emails.send({
      from: 'Sports Tickets <onboarding@resend.dev>', // Update with your verified domain
      to: [email],
      subject: `Your ${quantity} General Admission Ticket${quantity === 1 ? '' : 's'} - QR Codes Inside`,
      html: html,
    });

    if (error) {
      console.error('❌ Resend email error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('✅ Email sent successfully!');
    console.log('✅ Email ID:', data?.id);
    return data;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
}

exports.handler = async (event) => {
  // Log environment check on first call
  console.log('');
  console.log('=================================================');
  console.log('🔔 STRIPE WEBHOOK RECEIVED');
  console.log('=================================================');
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('📍 Method:', event.httpMethod);
  console.log('');
  console.log('🔧 Environment Check:');
  console.log('🔑 SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('🔑 SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
  console.log('🔑 RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('🔑 STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing');
  console.log('🔑 STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? '✅ Set' : '❌ Missing');
  console.log('');
  
  if (event.httpMethod !== 'POST') {
    console.log('❌ Wrong method, rejecting');
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured in environment');
    return jsonResponse(500, { error: 'Webhook secret not configured' });
  }

  console.log('🔐 Webhook secret found');
  console.log('🔐 Signature present:', sig ? 'Yes' : 'No');

  let stripeEvent;

  try {
    // Verify webhook signature
    console.log('🔐 Verifying webhook signature...');
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      webhookSecret
    );
    console.log('✅ Webhook signature verified successfully');
    console.log('📦 Event type:', stripeEvent.type);
  } catch (err) {
    console.error('❌ Webhook signature verification FAILED');
    console.error('❌ Error:', err.message);
    return jsonResponse(400, { error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  if (stripeEvent.type === 'checkout.session.completed') {
    console.log('=================================================');
    console.log('💳 Starting webhook: checkout.session.completed');
    console.log('=================================================');
    
    const session = stripeEvent.data.object;
    const metadata = session.metadata;

    console.log('📦 Session ID:', session.id);
    console.log('📦 Session metadata:', JSON.stringify(metadata, null, 2));
    console.log('💰 Amount total:', session.amount_total);

    try {
      // Extract metadata
      const {
        eventId = '1',
        ticketType = 'General Admission',
        quantity: quantityStr = '1',
        name,
        email
      } = metadata;

      const quantity = parseInt(quantityStr, 10);

      console.log('👤 Purchaser name:', name);
      console.log('📧 Purchaser email:', email);
      console.log('🎫 Ticket type:', ticketType);
      console.log('🔢 Quantity:', quantity);
      console.log('🏟️  Event ID:', eventId);

      if (!name || !email) {
        throw new Error('Missing name or email in metadata');
      }

      // Create tickets array
      const tickets = [];

      // Loop to create each individual ticket
      for (let i = 0; i < quantity; i++) {
        console.log('');
        console.log(`🎫 ========== Creating ticket ${i + 1}/${quantity} ==========`);

        // Generate unique ticket ID
        const ticketId = uuidv4();
        console.log('🆔 Generated ticket ID:', ticketId);
        
        // Generate QR code
        console.log('📱 Generating QR code...');
        const qrDataUrl = await generateQRCode(ticketId);
        console.log('✅ QR code generated');
        
        // Upload QR to Supabase Storage
        console.log('☁️  Uploading QR to Supabase Storage...');
        const qrPublicUrl = await uploadQRToSupabase(ticketId, qrDataUrl);
        console.log('✅ QR uploaded. Public URL:', qrPublicUrl);
        
        // Create ticket data - ONLY using columns that exist in your table
        const ticketData = {
          ticket_id: ticketId,           // text
          event_id: eventId,             // text
          ticket_type: ticketType,       // text
          purchaser_name: name,          // text
          purchaser_email: email,        // text
          qr_code_url: qrPublicUrl,      // text
          status: 'valid'                // text (or 'purchased' if that's your default)
          // Note: id, created_at, used_at will be auto-generated by database
        };

        console.log('💾 Ticket data to insert:', JSON.stringify(ticketData, null, 2));

        // Insert into database
        const createdTicket = await createTicketInDatabase(ticketData);
        
        tickets.push(createdTicket);
        console.log(`✅ Ticket ${i + 1}/${quantity} created successfully!`);
        console.log('');
      }

      console.log('=================================================');
      console.log(`✅ All ${quantity} tickets created successfully`);
      console.log('=================================================');

      // Send email with all tickets
      console.log('📧 Preparing to send email...');
      console.log('📧 Recipient:', email);
      console.log('📧 Number of QR codes:', tickets.length);
      
      await sendTicketEmail(email, name, tickets, quantity, ticketType);
      
      console.log('✅ Email sent successfully!');
      console.log('=================================================');

      return jsonResponse(200, {
        received: true,
        tickets_created: tickets.length,
        email_sent: true
      });

    } catch (error) {
      console.error('=================================================');
      console.error('❌❌❌ ERROR PROCESSING WEBHOOK ❌❌❌');
      console.error('=================================================');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('=================================================');
      
      // Return 200 to acknowledge receipt (prevent retries)
      // but log the error for investigation
      return jsonResponse(200, {
        received: true,
        error: error.message,
        note: 'Webhook acknowledged but processing failed'
      });
    }
  } else {
    console.log(`ℹ️  Unhandled event type: ${stripeEvent.type}`);
    return jsonResponse(200, { received: true, unhandled: true });
  }
};
