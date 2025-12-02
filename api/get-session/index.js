import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const { session_id } = req.query;

  if (!session_id) return res.status(400).json({ error: 'No session_id' });

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items'],
    });

    res.status(200).json(session);
  } catch (err) {
    console.error('GET SESSION FAILED:', err.message);
    res.status(500).json({ error: err.message });
  }
}