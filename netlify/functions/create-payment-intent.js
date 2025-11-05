const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };

  const body = JSON.parse(event.body);
  const amount = 2500;
  const email = body.email;
  const eventId = 'test';

  try {
    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      receipt_email: email,
      metadata: { eventId, email },
      // REMOVED: application_fee_amount (requires Connect)
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ clientSecret: intent.client_secret }),
    };
  } catch (err) {
    console.error('Stripe error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
