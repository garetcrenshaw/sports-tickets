const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Vercel-compatible Express-style handler
module.exports = async (req, res) => {
  // Handle preflight CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const sessionId = req.query?.session_id;

    if (!sessionId) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');
      res.status(400).json({ error: 'Session ID required' });
      return;
    }

    console.log('🔍 Fetching session:', sessionId);
    console.log('🔑 STRIPE_SECRET_KEY loaded:', process.env.STRIPE_SECRET_KEY ? 'YES (' + process.env.STRIPE_SECRET_KEY.substring(0, 10) + '...)' : 'NO');

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'line_items']
    });

    if (!session) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');
      res.status(404).json({ error: 'Session not found' });
      return;
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

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(sessionData);
  } catch (error) {
    console.error('GET SESSION ERROR:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: error.message });
  }
};
