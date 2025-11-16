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

// Send emails for multiple tickets
async function sendTicketEmails(tickets, eventData) {
  const emailPromises = tickets.map(ticket =>
    fetch('https://' + event.headers.host + '/.netlify/functions/send-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketId: ticket.id,
        email: ticket.email,
        name: ticket.name,
        eventName: eventData.eventName || 'GameDay Event',
        ticketType: ticket.ticket_type,
        ticketNumber: ticket.ticket_number,
        totalQuantity: tickets.length,
      }),
    })
  );

  const responses = await Promise.all(emailPromises);

  for (let i = 0; i < responses.length; i++) {
    if (!responses[i].ok) {
      console.error(`EMAIL SEND FAILED for ticket ${tickets[i].id}:`, await responses[i].text());
    }
  }

  console.log(`Sent ${responses.length} emails for ${tickets.length} tickets`);
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

      // Send emails for all tickets
      try {
        await sendTicketEmails(tickets, { eventName: 'GameDay Event' });
        console.log(`Successfully sent emails for ${tickets.length} tickets`);
      } catch (emailErr) {
        console.error('EMAIL BATCH SEND FAILED:', emailErr);
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
