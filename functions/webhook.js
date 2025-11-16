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
  const eventName = eventData.eventName || 'GameDay Event';
  const ticketType = firstTicket.ticket_type;
  const quantity = tickets.length;
  const totalAmount = session.amount_total / 100; // Convert from cents

  // Create subject
  const subject = quantity === 1
    ? `Your ${ticketType} ticket for ${eventName}`
    : `Your ${quantity} ${ticketType} tickets for ${eventName}`;

  // Create HTML body with all tickets
  let ticketsHtml = '';
  tickets.forEach((ticket, index) => {
    const validateUrl = `https://nsgamedaytickets.netlify.app/validate?ticket=${ticket.id}`;
    const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(validateUrl)}&format=png`;

    ticketsHtml += `
      <hr>
      <h3>TICKET ${ticket.ticket_number} OF ${quantity}</h3>
      <img src="${qrDataUrl}" width="200" />
      <p><strong>Section 101, Row A, Seat ${5 + index}</strong></p>
    `;
  });

  try {
    await resend.emails.send({
      from: 'GameDay Tickets <tickets@gamedaytickets.io>',
      to: email,
      subject,
      html: `
        <div style="font-family: Arial;">
          <h2>Hi ${name}!</h2>
          <p>You purchased <strong>${quantity} ${ticketType === 'ga' ? 'General Admission' : ticketType} ticket${quantity > 1 ? 's' : ''}</strong> for <strong>${eventName}</strong></p>
          <p><strong>Total: $${totalAmount.toFixed(2)}</strong></p>
          ${ticketsHtml}
          <hr>
          <p>See you at the game! 🎉</p>
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
        await sendTicketEmail(tickets, { eventName: 'GameDay Event' }, session);
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
