const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  console.log('GET-SESSION: Request received', req.method);

  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('session_id');

    console.log('GET-SESSION: Fetching session', sessionId);
    console.log('GET-SESSION: STRIPE_SECRET_KEY loaded:', process.env.STRIPE_SECRET_KEY ? 'YES' : 'NO');

    if (!sessionId) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Session ID required' }));
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'line_items']
    });

    if (!session) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Session not found' }));
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

    console.log('GET-SESSION: Session retrieved', session.id, session.payment_status);

    res.statusCode = 200;
    res.end(JSON.stringify(sessionData));

  } catch (error) {
    console.error('GET-SESSION: Error', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message }));
  }
};
