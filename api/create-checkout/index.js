import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Helper to build absolute URLs with correct path joining
function buildUrl(baseUrl, path) {
  try {
    // URL constructor handles trailing slashes automatically
    const url = new URL(path, baseUrl);
    return url.toString();
  } catch (error) {
    console.error('URL construction error:', error);
    // Fallback to manual concatenation
    const base = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
    const pathClean = path.startsWith('/') ? path : `/${path}`;
    return `${base}${pathClean}`;
  }
}

export default async function handler(req, res) {
  console.log('CREATE-CHECKOUT: Request received', req.method);

  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
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
      res.status(400).json({ error: 'At least one admission ticket or parking pass must be selected' });
      return;
    }

    // Get base URL from environment with fallbacks
    const baseUrl = process.env.NEXT_PUBLIC_URL 
      || process.env.SITE_URL 
      || process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : 'https://sports-tickets.vercel.app';

    console.log('CREATE-CHECKOUT: Using base URL:', baseUrl);

    // Build success and cancel URLs with proper path joining
    const successUrl = buildUrl(baseUrl, `/success?session_id={CHECKOUT_SESSION_ID}`);
    const cancelUrl = buildUrl(baseUrl, `/cancel`);

    console.log('CREATE-CHECKOUT: Success URL:', successUrl);
    console.log('CREATE-CHECKOUT: Cancel URL:', cancelUrl);

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
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    console.log('CREATE-CHECKOUT: Session created', session.id);
    console.log('CREATE-CHECKOUT: Stripe will redirect to:', successUrl);

    res.status(200).json({ url: session.url });

  } catch (error) {
    console.error('CREATE-CHECKOUT: Error', error);
    res.status(500).json({ error: error.message });
  }
}
