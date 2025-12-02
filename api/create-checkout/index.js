import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

    // VERCEL PRODUCTION URLS - NEVER CHANGES
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
      success_url: `https://sports-tickets.vercel.app/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://sports-tickets.vercel.app/cancel`,
    });

    console.log('CREATE-CHECKOUT: Session created', session.id);

    res.status(200).json({ url: session.url });

  } catch (error) {
    console.error('CREATE-CHECKOUT: Error', error);
    res.status(500).json({ error: error.message });
  }
}