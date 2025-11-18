const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { Resend } = require('resend');

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for server-side writes
);

const resend = new Resend(process.env.RESEND_API_KEY);

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  console.log('=== STRIPE WEBHOOK RECEIVED ===');
  
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    return jsonResponse(500, { error: 'Webhook secret not configured' });
  }

  let stripeEvent;

  try {
    // Verify webhook signature
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      webhookSecret
    );
    console.log('✅ Webhook signature verified');
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return jsonResponse(400, { error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    
    console.log('💳 Checkout session completed:', session.id);
    console.log('📧 Customer email:', session.customer_email);
    console.log('💰 Amount paid:', session.amount_total / 100);
    console.log('📋 Metadata:', session.metadata);

    try {
      // Extract metadata
      const { 
        eventId = '1',
        ticketType = 'General Admission',
        quantity = '1',
        name,
        email
      } = session.metadata;

      const numTickets = parseInt(quantity, 10);
      const customerEmail = email || session.customer_email;
      const customerName = name || 'Customer';

      console.log(`🎫 Creating ${numTickets} tickets for ${customerName} (${customerEmail})`);

      // Array to collect all ticket data
      const tickets = [];
      const qrCodeUrls = [];

      // Create individual tickets
      for (let i = 0; i < numTickets; i++) {
        const ticketId = uuidv4();
        const ticketNumber = i + 1;
        
        console.log(`📝 Creating ticket ${ticketNumber}/${numTickets}: ${ticketId}`);

        // Generate unique QR code value
        const qrValue = `https://yoursite.com/verify?ticket=${ticketId}`;
        
        // Generate QR code as data URL (base64)
        const qrCodeDataUrl = await QRCode.toDataURL(qrValue, {
          errorCorrectionLevel: 'H',
          type: 'image/png',
          width: 300,
          margin: 2,
        });

        // Convert data URL to buffer for storage
        const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
        const qrBuffer = Buffer.from(base64Data, 'base64');

        // Upload QR code to Supabase Storage
        const fileName = `${ticketId}.png`;
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('qrcodes')
          .upload(fileName, qrBuffer, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error(`❌ Failed to upload QR code for ticket ${ticketNumber}:`, uploadError);
          throw new Error(`QR upload failed: ${uploadError.message}`);
        }

        console.log(`✅ QR code uploaded: ${fileName}`);

        // Get public URL
        const { data: urlData } = supabase
          .storage
          .from('qrcodes')
          .getPublicUrl(fileName);

        const qrCodeUrl = urlData.publicUrl;
        qrCodeUrls.push(qrCodeUrl);

        // Insert ticket into database
        const ticketData = {
          id: ticketId,
          ticket_id: ticketId,
          event_id: parseInt(eventId, 10),
          ticket_type: ticketType,
          purchaser_name: customerName,
          purchaser_email: customerEmail,
          qr_code_url: qrCodeUrl,
          status: 'valid',
          stripe_session_id: session.id,
          price_cents: session.amount_total,
          created_at: new Date().toISOString()
        };

        const { data: insertData, error: insertError } = await supabase
          .from('tickets')
          .insert([ticketData])
          .select();

        if (insertError) {
          console.error(`❌ Failed to insert ticket ${ticketNumber}:`, insertError);
          throw new Error(`DB insert failed: ${insertError.message}`);
        }

        console.log(`✅ Ticket ${ticketNumber} saved to database`);
        tickets.push(ticketData);
      }

      console.log(`✅ All ${numTickets} tickets created successfully`);

      // Send email with all tickets
      await sendTicketEmail({
        to: customerEmail,
        name: customerName,
        quantity: numTickets,
        ticketType,
        qrCodeUrls,
        tickets
      });

      console.log('✅ Email sent successfully');

      return jsonResponse(200, { 
        received: true, 
        ticketsCreated: numTickets,
        message: 'Tickets created and email sent'
      });

    } catch (error) {
      console.error('❌ Error processing checkout:', error);
      
      // Still return 200 to acknowledge receipt to Stripe
      // But log the error for investigation
      return jsonResponse(200, { 
        received: true, 
        error: error.message,
        note: 'Webhook received but processing failed - check logs'
      });
    }
  }

  // Return 200 for other event types (acknowledge receipt)
  return jsonResponse(200, { received: true, type: stripeEvent.type });
};

async function sendTicketEmail({ to, name, quantity, ticketType, qrCodeUrls, tickets }) {
  console.log(`📧 Sending email to ${to} with ${quantity} QR codes`);

  // Generate HTML for each ticket
  const ticketHtml = qrCodeUrls.map((url, index) => `
    <div style="margin-bottom: 30px; padding: 20px; border: 2px solid #e5e7eb; border-radius: 12px; background: #f9fafb;">
      <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 18px;">
        🎫 Ticket ${index + 1} of ${quantity}
      </h3>
      <img src="${url}" alt="QR Code ${index + 1}" style="width: 200px; height: 200px; display: block; margin: 10px 0;" />
      <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
        <strong>Type:</strong> ${ticketType}<br/>
        <strong>Ticket ID:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${tickets[index].ticket_id.substring(0, 8)}...</code>
      </p>
    </div>
  `).join('');

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Tickets</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">
            🎉 Your Tickets Are Ready!
          </h1>
        </div>

        <!-- Content -->
        <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Greeting -->
          <p style="margin: 0 0 20px 0; font-size: 18px; color: #1f2937;">
            Hi <strong>${name}</strong>! 👋
          </p>
          
          <p style="margin: 0 0 30px 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
            Thank you for your purchase! Here ${quantity === 1 ? 'is your ticket' : `are your <strong>${quantity} tickets</strong>`} for <strong>${ticketType}</strong>.
          </p>

          <!-- Tickets -->
          ${ticketHtml}

          <!-- Instructions -->
          <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin-top: 30px;">
            <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 18px;">
              📱 How to Use Your Tickets
            </h3>
            <ul style="margin: 0; padding-left: 20px; color: #1e40af; line-height: 1.8;">
              <li>Present the QR code${quantity > 1 ? 's' : ''} at the entrance</li>
              <li>Each ticket can only be scanned once</li>
              <li>Save this email or take a screenshot</li>
              <li>Doors open at 6:00 PM</li>
            </ul>
          </div>

          <!-- Footer -->
          <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 14px;">
            <p style="margin: 0 0 10px 0;">
              Questions? Reply to this email or contact support.
            </p>
            <p style="margin: 0;">
              See you at the event! 🎊
            </p>
          </div>

        </div>

      </div>
    </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: 'Tickets <onboarding@resend.dev>', // Change to your verified domain
      to: [to],
      subject: `Your ${quantity} ${ticketType} Ticket${quantity > 1 ? 's' : ''} 🎫`,
      html: emailHtml,
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      throw new Error(`Email send failed: ${error.message}`);
    }

    console.log('✅ Email sent via Resend:', data);
    return data;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw error;
  }
}

