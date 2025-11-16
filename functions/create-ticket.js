// functions/create-ticket.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'SET' : 'MISSING');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'MISSING');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PRICE_MAP = {
  ga: process.env.GA_PRICE_ID,
  free: process.env.FREE_PRICE_ID,
  parking: process.env.PARKING_PRICE_ID,
};

exports.handler = async (event) => {
  console.log('EVENT:', event.body);

  try {
    const { ticketType, email, name, eventId, quantity = 1 } = JSON.parse(event.body);

    if (!PRICE_MAP[ticketType]) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid ticket type' }) };
    }

    // Validate quantity
    if (quantity < 1 || quantity > 10) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Quantity must be between 1 and 10' }) };
    }

    // Simple inventory check (mock: assume 100 seats available per ticket type)
    const AVAILABLE_SEATS = 100;
    if (quantity > AVAILABLE_SEATS) {
      return { statusCode: 400, body: JSON.stringify({ error: `Only ${AVAILABLE_SEATS} seats available for ${ticketType}` }) };
    }

    const priceId = PRICE_MAP[ticketType];
    console.log('PRICE ID:', priceId);
    console.log('QUANTITY:', quantity);

    const price = await stripe.prices.retrieve(priceId);
    const unitAmount = price.unit_amount;
    const totalAmount = unitAmount * quantity;
    console.log('UNIT AMOUNT:', unitAmount, 'TOTAL AMOUNT:', totalAmount);

    let paymentIntent;

    if (totalAmount === 0) {
      paymentIntent = { id: 'free_' + Date.now(), amount: 0, status: 'succeeded' };
    } else {
      paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: 'usd',
        payment_method_types: ['card'],
        metadata: {
          ticketType,
          eventId,
          email,
          quantity: quantity.toString(),
          unitPrice: unitAmount.toString()
        },
      });
    }

    // Create multiple tickets (one for each quantity)
    const ticketsData = [];
    for (let i = 0; i < quantity; i++) {
      ticketsData.push({
        email,
        name,
        event_id: eventId,
        ticket_type: ticketType,
        stripe_pi_id: paymentIntent.id,
        status: totalAmount === 0 ? 'confirmed' : 'pending',
        amount: unitAmount / 100, // Store unit amount per ticket
        ticket_number: i + 1, // Add ticket number within the batch
      });
    }

    const { data: tickets, error } = await supabase
      .from('tickets')
      .insert(ticketsData)
      .select();

    if (error) {
      console.error('SUPABASE ERROR:', error);
      throw error;
    }

    console.log(`Created ${tickets.length} tickets for quantity ${quantity}`);

    // SEND EMAIL FOR EACH TICKET
    try {
      const emailPromises = tickets.map(ticket =>
        fetch('https://' + event.headers.host + '/.netlify/functions/send-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketId: ticket.id,
            email,
            name,
            eventName: 'GameDay Event',
            ticketType,
            ticketNumber: ticket.ticket_number,
            totalQuantity: quantity,
          }),
        })
      );

      const responses = await Promise.all(emailPromises);

      for (let i = 0; i < responses.length; i++) {
        if (!responses[i].ok) {
          console.error(`EMAIL SEND FAILED for ticket ${tickets[i].id}:`, await responses[i].text());
        }
      }

      console.log(`Sent ${responses.length} emails for ${quantity} tickets`);
    } catch (emailErr) {
      console.error('EMAIL SEND FAILED:', emailErr);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        clientSecret: totalAmount === 0 ? null : paymentIntent.client_secret,
        ticketIds: tickets.map(t => t.id),
        isFree: totalAmount === 0,
        quantity,
      }),
    };
  } catch (err) {
    console.error('FUNCTION ERROR:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};