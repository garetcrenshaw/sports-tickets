// Vercel config: maxDuration 60
const { getStripeClient, requireEnv } = require('../src/lib/stripe');
const { createTickets, createParkingPasses } = require('../src/lib/db');
const { generateTicketQr } = require('../src/lib/qr');
const { sendTicketsEmail } = require('./send-ticket');
const { setCors, sendJson, end, readRawBody } = require('./_utils');

const stripe = getStripeClient();

const SITE_URL = process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`;
console.log(`FINAL FINAL SITE_URL — ${process.env.PORT || 3000} IS DEAD →`, SITE_URL);

function parseNonNegativeInt(value) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function buildTicketRows({ sessionId, count, eventId, name, email }) {
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const ticketId = `ticket-${sessionId}-${i + 1}`;
    const validateUrl = `${SITE_URL}/validate?ticket=${ticketId}`;
    const qrCodeUrl = await generateTicketQr(validateUrl);
    rows.push({
      ticket_id: ticketId,
      event_id: String(eventId),
      ticket_type: 'Gameday Tickets',
      purchaser_name: name,
      purchaser_email: email,
      qr_code_url: qrCodeUrl,
      status: 'purchased',
    });
  }
  return rows;
}

async function buildParkingRows({ sessionId, count, eventId, name, email }) {
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const ticketId = `parking-${sessionId}-${i + 1}`;
    const validateUrl = `${SITE_URL}/validate?parking=${ticketId}`;
    const qrCodeUrl = await generateTicketQr(validateUrl);
    rows.push({
      ticket_id: ticketId,
      event_id: String(eventId),
      ticket_type: 'Gameday Parking',
      purchaser_name: name,
      purchaser_email: email,
      qr_code_url: qrCodeUrl,
      status: 'purchased',
    });
  }
  return rows;
}

async function handleCheckoutSession(session) {
  const metadata = session.metadata || {};
  const admissionQtyFromMetadata = parseNonNegativeInt(metadata.admissionQuantity);
  const fallbackQuantity = parseNonNegativeInt(metadata.quantity);
  let admissionQty = admissionQtyFromMetadata ?? fallbackQuantity ?? 0;
  const parkingQty = parseNonNegativeInt(metadata.parkingQuantity) ?? 0;
  const email = session.customer_details?.email || metadata.buyerEmail || metadata.email;
  const name = metadata.buyerName || metadata.name || session.customer_details?.name || 'Guest';
  const eventName = metadata.eventName || metadata.eventTitle || 'General Admission';
  const eventId = metadata.eventId || '1';

  if (admissionQty === 0 && parkingQty === 0) {
    admissionQty = 1;
  }

  if (!email) {
    throw new Error('Missing customer email on checkout session');
  }

  const ticketRows = await buildTicketRows({
    sessionId: session.id,
    count: admissionQty,
    eventId,
    name,
    email,
  });

  const parkingRows = await buildParkingRows({
    sessionId: session.id,
    count: parkingQty,
    eventId,
    name,
    email,
  });

  const [createdTickets, createdParking] = await Promise.all([
    ticketRows.length ? createTickets(ticketRows) : Promise.resolve([]),
    parkingRows.length ? createParkingPasses(parkingRows) : Promise.resolve([]),
  ]);

  const ticketsForEmail = createdTickets.map((ticket, index) => ({
    ticketId: ticket.ticket_id,
    qrCodeUrl: ticket.qr_code_url,
    label: `Ticket ${index + 1}`,
    ticketType: ticket.ticket_type || 'Gameday Tickets',
  }));

  const parkingForEmail = createdParking.map((pass, index) => ({
    ticketId: pass.ticket_id,
    qrCodeUrl: pass.qr_code_url,
    label: `Parking Pass ${index + 1}`,
    ticketType: pass.ticket_type || 'Gameday Parking',
  }));

  if (!ticketsForEmail.length && !parkingForEmail.length) {
    console.warn('Checkout session completed with no items to fulfill', session.id);
    return;
  }

  await sendTicketsEmail({
    email,
    name,
    eventName,
    totalAmount: (session.amount_total || 0) / 100,
    tickets: ticketsForEmail,
    parkingPasses: parkingForEmail,
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

