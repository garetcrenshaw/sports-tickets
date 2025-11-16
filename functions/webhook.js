// functions/webhook.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Batch create tickets
async function createTickets(ticketsData) {
  const { data: tickets, error } = await supabase
    .from('tickets')
    .insert(ticketsData)
    .select();

  if (error) {
    console.error('BATCH TICKET INSERT ERROR:', error);
    throw error;
  }

  return tickets;
}

// Send one email with all tickets
async function sendTicketEmail(tickets, eventData, session) {
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  const firstTicket = tickets[0];
  const email = firstTicket.email;
  const name = firstTicket.name;
  const eventName = eventData.eventName || 'General Admission Event';
  const ticketType = firstTicket.ticket_type;
  const quantity = tickets.length;
  const totalAmount = session.amount_total / 100; // Convert from cents

  // Generate QR codes for all tickets
  const qrCodes = [];
  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    const validateUrl = `https://nsgamedaytickets.netlify.app/validate?ticket=${ticket.id}`;

    // Generate QR code as base64 data URL
    const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(validateUrl)}&format=png`;

    qrCodes.push({
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      qrUrl: qrDataUrl,
      validateUrl
    });
  }

  // Create subject
  const subject = quantity === 1
    ? `Your ${ticketType} ticket for ${eventName}`
    : `Your ${quantity} ${ticketType} tickets for ${eventName}`;

  // Create HTML body with all tickets
  let ticketsHtml = '';
  qrCodes.forEach((qr, index) => {
    ticketsHtml += `
      <div style="border: 1px solid #eee; border-radius: 8px; padding: 15px; margin: 10px 0; background: #f9f9f9;">
        <h3 style="margin: 0 0 10px 0; color: #333;">Ticket ${qr.ticketNumber}${quantity > 1 ? ` of ${quantity}` : ''}</h3>
        <div style="text-align: center; margin: 15px 0;">
          <img src="${qr.qrUrl}" alt="QR Code for Ticket ${qr.ticketNumber}" style="max-width: 150px;" />
        </div>
        <p style="margin: 5px 0;"><strong>Ticket ID:</strong> ${qr.ticketId}</p>
        <p style="margin: 5px 0;"><a href="${qr.validateUrl}" style="color: #1a73e8; text-decoration: none;">Validate This Ticket</a></p>
      </div>
    `;
  });

  try {
    await resend.emails.send({
      from: 'GameDay Tickets <tickets@gamedaytickets.io>',
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #1a73e8;">Hey ${name}!</h2>
          <p>Your ${quantity === 1 ? 'ticket is' : 'tickets are'} ready!</p>
          <p><strong>Event:</strong> ${eventName}</p>
          <p><strong>Type:</strong> ${ticketType}</p>
          <p><strong>Quantity:</strong> ${quantity} ticket${quantity > 1 ? 's' : ''}</p>
          ${totalAmount > 0 ? `<p><strong>Total Paid:</strong> $${totalAmount.toFixed(2)}</p>` : '<p><strong>Free Tickets</strong></p>'}

          <h3 style="color: #333; border-bottom: 2px solid #1a73e8; padding-bottom: 5px;">Your Tickets:</h3>
          ${ticketsHtml}

          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            Show the QR code(s) at the door for entry. Each QR code is unique to its ticket.
          </p>
          <p style="color: #1a73e8; font-weight: bold; margin-top: 20px;">See you at the game!</p>
        </div>
      `,
    });

    console.log(`Successfully sent one email with ${quantity} tickets to ${email}`);
  } catch (emailErr) {
    console.error('EMAIL SEND FAILED:', emailErr);
    throw emailErr;
  }
}

exports.handler = async (event) => {
  console.log('WEBHOOK EVENT TYPE:', event.headers['stripe-signature'] ? 'SIGNED' : 'UNSIGNED');

  // LOCAL TESTING: Mock success response
  const isLocalTest = process.env.NETLIFY_DEV === 'true' || event.headers.host?.includes('localhost');
  if (isLocalTest) {
    console.log('🧪 MOCK: 3 tickets created (local test mode)');
    console.log('MOCK: Email sending skipped');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ received: true, mock: true })
    };
  }

  try {
    // Verify webhook signature
    let stripeEvent;
    if (WEBHOOK_SECRET) {
      stripeEvent = stripe.webhooks.constructEvent(
        event.body,
        event.headers['stripe-signature'],
        WEBHOOK_SECRET
      );
    } else {
      // For testing without webhook secret
      stripeEvent = JSON.parse(event.body);
    }

    console.log('WEBHOOK VERIFIED:', stripeEvent.type);

    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      const { ticketType, eventId, email, quantity, unitPrice } = session.metadata;

      const qty = parseInt(quantity) || 1;
      const unitPriceCents = parseInt(unitPrice) || 2500; // fallback

      console.log('CHECKOUT COMPLETED:', {
        session_id: session.id,
        amount: session.amount_total,
        email,
        ticketType,
        quantity: qty,
        unitPrice: unitPriceCents
      });

      // Get customer details from session
      const customerEmail = session.customer_details?.email;
      const customerName = session.customer_details?.name || 'Valued Customer';

      // Create multiple tickets (one for each quantity)
      const ticketsData = [];
      for (let i = 0; i < qty; i++) {
        ticketsData.push({
          email: customerEmail,
          name: customerName,
          event_id: parseInt(eventId),
          ticket_type: ticketType,
          stripe_session_id: session.id,
          status: 'confirmed', // Confirmed immediately on successful payment
          amount: unitPriceCents / 100, // Store unit amount per ticket
          ticket_number: i + 1, // Add ticket number within the batch
        });
      }

      // Batch insert tickets
      const tickets = await createTickets(ticketsData);

      console.log(`Created ${tickets.length} tickets for session ${session.id}`);

      // Send one email with all tickets
      try {
        await sendTicketEmail(tickets, { eventName: 'General Admission Event' }, session);
        console.log(`Successfully sent one email with ${tickets.length} tickets`);
      } catch (emailErr) {
        console.error('EMAIL SEND FAILED:', emailErr);
        // Don't fail the webhook for email errors
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ received: true }),
    };

  } catch (err) {
    console.error('WEBHOOK ERROR:', err);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
