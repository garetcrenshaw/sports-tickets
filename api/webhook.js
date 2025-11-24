// Vercel config: maxDuration 60
const { getStripeClient, requireEnv } = require('../src/lib/stripe');
const { createTickets } = require('../src/lib/db');
const { generateTicketQr } = require('../src/lib/qr');
const { sendTicketsEmail } = require('./send-ticket');
const { setCors, sendJson, end, readRawBody } = require('./_utils');

const stripe = getStripeClient();

const SITE_URL = process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`;
console.log(`FINAL FINAL SITE_URL — ${process.env.PORT || 3000} IS DEAD →`, SITE_URL);

function parsePositiveInt(value) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function handleCheckoutSession(session) {
  const metadata = session.metadata || {};
  const admissionQty = parsePositiveInt(metadata.admissionQuantity);
  const fallbackQuantity = parsePositiveInt(metadata.quantity);
  const quantity = Math.max(1, admissionQty ?? fallbackQuantity ?? 1);
  const email = session.customer_details?.email || metadata.buyerEmail || metadata.email;
  const name = metadata.buyerName || metadata.name || session.customer_details?.name || 'Guest';
  const eventName = metadata.eventName || metadata.eventTitle || 'General Admission';
  const eventId = metadata.eventId || 1;

  if (!email) {
    throw new Error('Missing customer email on checkout session');
  }

  const ticketsPayload = [];

  for (let i = 0; i < quantity; i += 1) {
    const ticketId = `${session.id}-${i + 1}`;
    const validateUrl = `${SITE_URL}/validate?ticket=${ticketId}`;
    const qrCodeUrl = await generateTicketQr(validateUrl);

    ticketsPayload.push({
      id: ticketId,
      session_id: session.id,
      ticket_number: i + 1,
      email,
      name,
      event_id: Number(eventId),
      status: 'pending',
      qr_code_url: qrCodeUrl,
    });
  }

  const createdTickets = await createTickets(ticketsPayload);

  await sendTicketsEmail({
    email,
    name,
    eventName,
    totalAmount: (session.amount_total || 0) / 100,
    tickets: createdTickets.map((ticket) => ({
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      qrCodeUrl: ticket.qr_code_url,
    })),
  });
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return end(res, 200);
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const webhookSecret = requireEnv('STRIPE_WEBHOOK_SECRET');
    const rawBody = (await readRawBody(req)).toString('utf8');
    const signature = req.headers['stripe-signature'];

    const stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (stripeEvent.type === 'checkout.session.completed') {
      await handleCheckoutSession(stripeEvent.data.object);
    }

    return sendJson(res, 200, { received: true });
  } catch (error) {
    console.error('WEBHOOK ERROR:', error);
    return sendJson(res, 400, { error: error.message });
  }
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};

