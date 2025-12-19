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

    console.log('CREATE-CHECKOUT: Processing order', { name, email, eventId, admissionQuantity, parkingQuantity });

    // Map eventId to the correct Stripe Price IDs
    const eventPricing = {
      1: {
        admission: process.env.GA_PRICE_ID,
        parking: process.env.PARKING_PRICE_ID,
      },
      2: {
        admission: null, // Sportsplex Showdown has no admission
        parking: process.env.SPORTSPLEX_SHOWDOWN_PARKING_PRICE_ID,
      },
      3: {
        admission: process.env.SPORTSPLEX_EVENT_ADMISSION_PRICE_ID,
        parking: null, // Sportsplex Event has no parking
      },
    };

    const pricing = eventPricing[eventId] || eventPricing[1]; // Default to Event 1

    const lineItems = [];

    // Add admission tickets (only if this event has admission and quantity > 0)
    if (admissionQuantity > 0 && pricing.admission) {
      lineItems.push({
        price: pricing.admission,
        quantity: admissionQuantity,
      });
    }

    // Add parking passes (only if this event has parking and quantity > 0)
    if (parkingQuantity > 0 && pricing.parking) {
      lineItems.push({
        price: pricing.parking,
        quantity: parkingQuantity,
      });
    }

    // Validate that at least one item is being purchased
    if (lineItems.length === 0) {
      res.status(400).json({ error: 'At least one admission ticket or parking pass must be selected' });
      return;
    }

    // HARDCODED PRODUCTION URLS - GUARANTEED TO WORK
    const successUrl = 'https://sports-tickets.vercel.app/success?session_id={CHECKOUT_SESSION_ID}';
    const cancelUrl = 'https://sports-tickets.vercel.app/cancel';

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
    console.log('CREATE-CHECKOUT: Redirect URLs configured');

    res.status(200).json({ url: session.url });

  } catch (error) {
    console.error('CREATE-CHECKOUT: Error', error);
    res.status(500).json({ error: error.message });
  }
}
