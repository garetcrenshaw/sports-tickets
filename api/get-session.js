const Stripe = require('stripe');
const { setCors, sendJson, end, readJson } = require('./_utils');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return end(res, 200);
  }

  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const sessionId = req.url.split('?session_id=')[1];

    if (!sessionId) {
      return sendJson(res, 400, { error: 'Session ID required' });
    }

    console.log('🔍 Fetching session:', sessionId);

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'line_items']
    });

    if (!session) {
      return sendJson(res, 404, { error: 'Session not found' });
    }

    // Return session details for success page
    const sessionData = {
      id: session.id,
      amount_total: session.amount_total,
      currency: session.currency,
      customer_email: session.customer_details?.email,
      customer_name: session.customer_details?.name,
      payment_status: session.payment_status,
      line_items: session.line_items?.data || [],
      metadata: session.metadata || {}
    };

    console.log('✅ Session retrieved:', session.id, session.payment_status);

    return sendJson(res, 200, sessionData);
  } catch (error) {
    console.error('GET SESSION ERROR:', error);
    return sendJson(res, 500, { error: error.message });
  }
};
