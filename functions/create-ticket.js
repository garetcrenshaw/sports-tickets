// functions/create-ticket.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

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
  try {
    const { ticketType, email, name, eventId } = JSON.parse(event.body);

    if (!PRICE_MAP[ticketType]) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid ticket type' }) };
    }

    const priceId = PRICE_MAP[ticketType];

    // Get price to check if $0
    const price = await stripe.prices.retrieve(priceId);
    const amount = price.unit_amount;

    let paymentIntent;

    if (amount === 0) {
      // FREE TICKET — SKIP PAYMENT
      paymentIntent = { id: 'free_' + Date.now(), amount: 0, status: 'succeeded' };
    } else {
      // REAL PAYMENT
      paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        payment_method_types: ['card'],
        metadata: { ticketType, eventId, email },
      });
    }

    // Save ticket to Supabase
    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert({
        email,
        name,
        event_id: eventId,
        ticket_type: ticketType,
        stripe_pi_id: paymentIntent.id,
        status: amount === 0 ? 'confirmed' : 'pending',
        amount: amount / 100,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({
        clientSecret: amount === 0 ? null : paymentIntent.client_secret,
        ticketId: ticket.id,
        isFree: amount === 0,
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};