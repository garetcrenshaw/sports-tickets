import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());

// === WEBHOOK — RAW BODY FIRST ===
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('WEBHOOK VERIFIED:', event.type);
  } catch (err) {
    console.log('WEBHOOK ERROR:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const eventId = session.metadata.eventId;

    console.log('PAYMENT SUCCESS:', session.id);
    console.log('Event ID:', eventId);
    console.log('Email:', session.customer_details?.email);

    const { data, error } = await supabase
      .from('tickets 2.0')
      .insert({
        stripe_session_id: session.id,
        event_id: parseInt(eventId),
        user_email: session.customer_details?.email || 'test@example.com',
        qr_code: `TICKET:${session.id}`,
        status: 'paid'
      })
      .select();

    if (error) {
      console.error('SUPABASE INSERT FAILED:', error.message);
    } else {
      console.log('TICKET SAVED TO SUPABASE:', data[0].id);
    }
  }

  res.json({ received: true });
});

// === JSON PARSER FOR OTHER ROUTES ===
app.use(express.json());

// === ENV VARS ===
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// === MOCK EVENTS ===
const events = [
  { id: 1, title: "Lakers vs Warriors", priceCents: 9900, date: "2025-12-01" },
  { id: 2, title: "Cowboys vs Eagles", priceCents: 7500, date: "2025-12-15" }
];

// === GET EVENTS ===
app.get('/api/events', (req, res) => {
  res.json(events);
});

// === REAL STRIPE CHECKOUT ===
app.post('/api/create-checkout', async (req, res) => {
  const { eventId } = req.body;
  if (!eventId) return res.status(400).json({ error: 'Missing eventId' });

  const event = events.find(e => e.id === eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: event.title },
          unit_amount: event.priceCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:5173',
      metadata: { eventId: eventId.toString() },
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// === GET TICKET FOR SUCCESS PAGE ===
app.get('/api/ticket/session/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const eventId = session.metadata.eventId;
    const event = events.find(e => e.id === parseInt(eventId));
    if (!event) throw new Error('Event not found');

    const qrDataURL = await QRCode.toDataURL(`TICKET:${sessionId}`);

    res.json({
      id: sessionId,
      event,
      qrCode: qrDataURL,
      email: session.customer_details?.email || 'test@example.com'
    });
  } catch (err) {
    console.error('Ticket fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// === START SERVER ===
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`BACKEND LIVE → http://localhost:${PORT}/api/events`);
});