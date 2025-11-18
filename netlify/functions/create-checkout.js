// ===== STRIPE KEY VALIDATION =====
const stripeKey = process.env.STRIPE_SECRET_KEY;

// Safety check: key exists
if (!stripeKey) {
  console.error("❌ STRIPE_SECRET_KEY is missing entirely");
  console.error("Available env vars:", Object.keys(process.env).filter(k => k.includes('STRIPE')));
}

// Safety check: key type
if (stripeKey && !stripeKey.startsWith("sk_test_") && !stripeKey.startsWith("sk_live_")) {
  console.error("❌ STRIPE_SECRET_KEY does not start with sk_test_ or sk_live_");
  console.error("   This is likely the PUBLISHABLE key (pk_test_...) by mistake!");
  console.error("   You need the SECRET key from Stripe dashboard");
}

// Log what we got
if (stripeKey) {
  console.log("✅ Stripe key loaded");
  console.log("   Starts with:", stripeKey.substring(0, 10) + "...");
  console.log("   Length:", stripeKey.length, "(expected: ~90-100 chars)");
  
  if (stripeKey.length < 80) {
    console.error("⚠️  WARNING: Key is too short! Expected ~90-100 chars, got", stripeKey.length);
    console.error("   Key might be truncated or wrong type");
  }
} else {
  console.error("❌ No Stripe key found!");
}

// Clean the key (remove any whitespace)
const cleanKey = stripeKey ? stripeKey.trim() : null;

// Initialize Stripe (will fail if key is invalid)
const stripe = cleanKey ? require('stripe')(cleanKey) : null;

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  console.log('=== CREATE-CHECKOUT CALLED ===');
  console.log('METHOD:', event.httpMethod);
  console.log('BODY:', event.body);
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(200, {});
  }
  
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  // Check if Stripe is configured
  if (!stripe) {
    console.error('❌ Stripe client not initialized - check your STRIPE_SECRET_KEY');
    return jsonResponse(500, { 
      error: 'Server configuration error - Stripe key missing or invalid',
      hint: 'Check server logs for details'
    });
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { email, name, quantity = 1, ticketType, eventId } = payload;

    console.log('Parsed payload:', { email, name, quantity, ticketType, eventId });

    if (!email || !name) {
      return jsonResponse(400, { error: 'Name and email are required' });
    }

    if (quantity < 1 || quantity > 10) {
      return jsonResponse(400, { error: 'Quantity must be between 1 and 10' });
    }

    const priceId = process.env.GA_PRICE_ID;
    
    if (!priceId) {
      console.error('❌ GA_PRICE_ID not found in environment');
      return jsonResponse(500, { error: 'Price ID not configured' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY not found in environment');
      return jsonResponse(500, { error: 'Stripe not configured' });
    }

    const siteUrl = process.env.SITE_URL || 'http://localhost:5173';

    console.log('Creating Stripe session with:', { 
      email, 
      name, 
      quantity, 
      priceId,
      siteUrl 
    });
    
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email,
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}`,
      metadata: {
        email,
        name,
        quantity: String(quantity),
        ticketType: ticketType || 'General Admission',
        eventName: 'General Admission',
        eventId: String(eventId || '1')
      },
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
    });

    console.log('✅ Stripe session created:', session.id);
    return jsonResponse(200, { sessionId: session.id });
  } catch (error) {
    console.error('CREATE-CHECKOUT ERROR:', error);
    return jsonResponse(500, { error: error.message });
  }
};
