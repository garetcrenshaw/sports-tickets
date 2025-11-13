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
    const { ticketType, email, name, eventId } = JSON.parse(event.body);

    if (!PRICE_MAP[ticketType]) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid ticket type' }) };
    }

    const priceId = PRICE_MAP[ticketType];
    console.log('PRICE ID:', priceId);

    const price = await stripe.prices.retrieve(priceId);
    const amount = price.unit_amount;
    console.log('AMOUNT:', amount);

    let paymentIntent;

    if (amount === 0) {
      paymentIntent = { id: 'free_' + Date.now(), amount: 0, status: 'succeeded' };
    } else {
      paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        payment_method_types: ['card'],
        metadata: { ticketType, eventId, email },
      });
    }

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

    if (error) {
      console.error('SUPABASE ERROR:', error);
      throw error;
    }

    // SEND EMAIL
    try {
      const response = await fetch('https://' + event.headers.host + '/.netlify/functions/send-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticket.id,
          email,
          name,
          eventName: 'GameDay Event',
          ticketType,
        }),
      });

      if (!response.ok) {
        console.error('EMAIL SEND FAILED:', await response.text());
      }
    } catch (emailErr) {
      console.error('EMAIL SEND FAILED:', emailErr);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        clientSecret: amount === 0 ? null : paymentIntent.client_secret,
        ticketId: ticket.id,
        isFree: amount === 0,
      }),
    };
  } catch (err) {
    console.error('FUNCTION ERROR:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};