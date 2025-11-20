const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? require('stripe')(stripeKey.trim()) : null;
const { setCors, sendJson, end, readJson } = require('./_utils');

if (!stripeKey) {
  console.error('❌ STRIPE_SECRET_KEY is missing entirely');
} else {
  console.log('✅ Stripe key loaded');
  console.log('   Starts with:', stripeKey.substring(0, 10) + '...');
  console.log('   Length:', stripeKey.length, '(expected: ~90-100 chars)');
  if (stripeKey.length < 80) {
    console.error('⚠️ WARNING: Key is too short! Expected ~90-100 chars, got', stripeKey.length);
  }
  if (!stripeKey.startsWith('sk_test_') && !stripeKey.startsWith('sk_live_')) {
    console.error('❌ STRIPE_SECRET_KEY does not start with sk_test_ or sk_live_');
  }
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return end(res, 200);
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  if (!stripe) {
    console.error('❌ Stripe client not initialized - check STRIPE_SECRET_KEY');
    return sendJson(res, 500, { error: 'Stripe not configured' });
  }

  try {
    const SITE_URL = process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`;
    console.log('FINAL FINAL SITE_URL — 5173 IS DEAD →', SITE_URL);

    const payload = await readJson(req);
    const {
      email,
      name,
      eventId = 1,
      admissionQuantity = 0,
      parkingQuantity = 0,
    } = payload || {};

    console.log('🎫 CREATE-CHECKOUT: Parsed payload:', { email, name, eventId, admissionQuantity, parkingQuantity });

    if (!email || !name) {
      return sendJson(res, 400, { error: 'Name and email are required' });
    }

    const admissionQty = Number(admissionQuantity) || 0;
    const parkingQty = Number(parkingQuantity) || 0;

    if (admissionQty < 0 || parkingQty < 0) {
      return sendJson(res, 400, { error: 'Quantities cannot be negative' });
    }
    if (admissionQty > 10) {
      return sendJson(res, 400, { error: 'You can buy up to 10 game tickets per order' });
    }
    if (parkingQty > 4) {
      return sendJson(res, 400, { error: 'You can add up to 4 parking passes per order' });
    }
    if (admissionQty === 0 && parkingQty === 0) {
      return sendJson(res, 400, { error: 'Select at least one ticket or parking pass' });
    }

    const gaPriceId = process.env.GA_PRICE_ID || 'price_1STzm4RzFa5vaG1DBe0qzBRZ';
    const parkingPriceId = process.env.PARKING_PRICE_ID || 'price_1SUjeVRzFa5vaG1DyZKlZF08';

    const lineItems = [];

    if (admissionQty > 0) {
      if (!gaPriceId) {
        return sendJson(res, 500, { error: 'Ticket price not configured' });
      }
      lineItems.push({ price: gaPriceId, quantity: admissionQty });
    }

    if (parkingQty > 0) {
      if (!parkingPriceId) {
        return sendJson(res, 500, { error: 'Parking price not configured' });
      }
      lineItems.push({ price: parkingPriceId, quantity: parkingQty });
    }

    const metadata = {
      eventId: '1',
      admissionQuantity: admissionQuantity.toString(),
      parkingQuantity: parkingQuantity.toString(),
      buyerName: name,
      buyerEmail: email,
    };

    console.log('🎫 CREATE-CHECKOUT: Creating Stripe session with:', {
      email,
      name,
      eventId,
      metadata,
      lineItemsCount: lineItems.length,
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email,
      success_url: `${SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/`,
      metadata,
      line_items: lineItems,
    });

    console.log('✅ Stripe session created:', session.id);
    console.log('SESSION CREATED WITH METADATA:', session.metadata);
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

