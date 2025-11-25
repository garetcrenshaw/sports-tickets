const Stripe = require('stripe');
const { setCors, sendJson, end, readJson } = require('./_utils');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  console.log('GET-SESSION HIT');
  console.log('🎯 get-session API called:', req.method, req.url);

  setCors(res);

  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request handled');
    return end(res, 200);
  }

  if (req.method !== 'GET') {
    console.log('❌ Method not allowed:', req.method);
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const sessionId = req.url.split('?session_id=')[1];

    if (!sessionId) {
      console.log('❌ No session ID in URL');
      return sendJson(res, 400, { error: 'Session ID required' });
    }

    console.log('🔍 Fetching session:', sessionId);
    console.log('🔑 STRIPE_SECRET_KEY loaded:', process.env.STRIPE_SECRET_KEY ? 'YES (' + process.env.STRIPE_SECRET_KEY.substring(0, 10) + '...)' : 'NO');

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
