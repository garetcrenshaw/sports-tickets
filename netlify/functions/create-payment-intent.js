const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51SNPmgRrKoC9NoMdHtrwLaiY1dH1coDH5FAzq5nn8527rtrHHMOMvsM0CcGLZZaagYb8gjM6k7Ug8hPIA6bdGfmK00gdaF2qzn');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { amount, email, eventId } = JSON.parse(event.body);
    const feeCents = Math.round(amount * 0.05);

    const intent = await stripe.paymentIntents.create({
      amount: amount + feeCents,
      currency: 'usd',
      receipt_email: email,
      metadata: { eventId, email },
      application_fee_amount: feeCents,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientSecret: intent.client_secret }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
