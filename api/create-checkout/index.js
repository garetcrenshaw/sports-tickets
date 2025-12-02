const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  console.log('CREATE-CHECKOUT: Request received', req.method);

  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  try {
    const { name, email, eventId, admissionQuantity, parkingQuantity } = req.body || {};

    console.log('CREATE-CHECKOUT: Processing order', { name, email, admissionQuantity, parkingQuantity });

    const lineItems = [];

    // Add admission tickets
    if (admissionQuantity > 0) {
      lineItems.push({
        price: process.env.GA_PRICE_ID,
        quantity: admissionQuantity,
      });
    }

    // Add parking passes
    if (parkingQuantity > 0) {
      lineItems.push({
        price: process.env.PARKING_PRICE_ID,
        quantity: parkingQuantity,
      });
    }

    // Validate that at least one item is being purchased
    if (lineItems.length === 0) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'At least one admission ticket or parking pass must be selected' }));
      return;
    }

    // REAL DOMAIN - NEVER CHANGES
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      metadata: {
        buyerName: name,
        buyerEmail: email,
        eventId: eventId?.toString(),
        admissionQuantity: admissionQuantity?.toString(),
        parkingQuantity: parkingQuantity?.toString(),
      },
      line_items: lineItems,
      success_url: 'https://gamedaytickets.io/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://gamedaytickets.io/cancel',
    });

    console.log('CREATE-CHECKOUT: Session created', session.id);

    res.statusCode = 200;
    res.end(JSON.stringify({ url: session.url }));

  } catch (error) {
    console.error('CREATE-CHECKOUT: Error', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message }));
  }
};
