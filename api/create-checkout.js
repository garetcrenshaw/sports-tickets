const Stripe = require('stripe');
const { setCors, sendJson, end, readJson } = require('./_utils');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return end(res, 200);
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const payload = await readJson(req);
    const { email, name, eventId = 1, admissionQuantity = 1, parkingQuantity = 0 } = payload || {};

    if (!email || !name) {
      return sendJson(res, 400, { error: 'Name and email are required' });
    }

    // Line items for admission and parking
    const lineItems = [
      admissionQuantity > 0 ? {
        price_data: {
          currency: 'usd',
          product_data: { name: 'Gameday Admission Ticket' },
          unit_amount: 1500, // $15.00
        },
        quantity: admissionQuantity,
      } : null,
      parkingQuantity > 0 ? {
        price_data: {
          currency: 'usd',
          product_data: { name: 'Gameday Parking Pass' },
          unit_amount: 1500, // $15.00
        },
        quantity: parkingQuantity,
      } : null
    ].filter(Boolean);

    const metadata = {
      eventId: eventId.toString(),
      admissionQuantity: admissionQuantity.toString(),
      parkingQuantity: parkingQuantity.toString(),
      buyerName: name,
      buyerEmail: email,
    };

    console.log('🎫 CREATE-CHECKOUT: Parsed payload:', { email, name, eventId, admissionQuantity, parkingQuantity });
    console.log('🎫 CREATE-CHECKOUT: Creating Stripe session with line items:', lineItems.length);
    console.log('🎫 CREATED METADATA:', JSON.stringify(metadata));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.SITE_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL || 'http://localhost:3000'}/cancel`,
      metadata: {
        eventId: eventId.toString(),
        admissionQuantity: admissionQuantity.toString(),
        parkingQuantity: parkingQuantity.toString(),
        buyerName: name,
        buyerEmail: email,
      },
    });

    console.log('✅ Stripe session created:', session.id);
    console.log('✅ Checkout URL:', session.url);

    return sendJson(res, 200, {
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('CREATE-CHECKOUT ERROR:', error);
    return sendJson(res, 500, { error: error.message });
  }
};

