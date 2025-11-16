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

// Log price IDs on startup
console.log('PRICE MAP:', {
  ga: PRICE_MAP.ga || 'MISSING',
  free: PRICE_MAP.free || 'MISSING',
  parking: PRICE_MAP.parking || 'MISSING'
});

exports.handler = async (event) => {
  console.log('=== CREATE-CHECKOUT CALLED ===');
  console.log('EVENT BODY:', event.body);

  try {
    const { ticketType, email, name, eventId, quantity = 1 } = JSON.parse(event.body);
    console.log('PARSED:', { ticketType, email, name, eventId, quantity });

    if (!PRICE_MAP[ticketType]) {
      console.error('Invalid ticket type:', ticketType);
      return { 
        statusCode: 400, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Invalid ticket type: ${ticketType}` }) 
      };
    }

    const priceId = PRICE_MAP[ticketType];
    if (!priceId) {
      console.error(`Missing price ID for ${ticketType}. Check environment variables.`);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: `Configuration error: Missing price ID for ${ticketType}. Please set ${ticketType.toUpperCase()}_PRICE_ID in environment variables.` 
        })
      };
    }

    // Validate quantity
    if (quantity < 1 || quantity > 10) {
      return { 
        statusCode: 400, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Quantity must be between 1 and 10' }) 
      };
    }

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

    // Tickets and emails will be created by webhook on successful payment
    console.log(`Payment intent created for ${quantity} tickets, total: $${totalAmount / 100}`);

    const response = {
      clientSecret: totalAmount === 0 ? null : paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      isFree: totalAmount === 0,
      quantity,
      totalAmount: totalAmount / 100, // Amount in dollars
    };

    console.log('RETURNING SUCCESS:', response);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    };
  } catch (err) {
    console.error('FUNCTION ERROR:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};