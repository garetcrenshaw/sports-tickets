const { getStripeClient, requireEnv } = require('../../src/lib/stripe');
const { createTickets } = require('../../src/lib/db');
const { generateTicketQr } = require('../../src/lib/qr');
const { sendTicketsEmail } = require('./send-ticket');

const stripe = getStripeClient();
const SITE_URL = process.env.SITE_URL || 'http://localhost:5173';

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

async function handleCheckoutSession(session) {
  const metadata = session.metadata || {};
  const quantity = Math.max(1, parseInt(metadata.quantity, 10) || 1);
  const email = session.customer_details?.email || metadata.email;
  const name = metadata.name || session.customer_details?.name || 'Guest';
  const eventName = metadata.eventName || 'General Admission';
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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  try {
    const webhookSecret = requireEnv('STRIPE_WEBHOOK_SECRET');
    const signature = event.headers['stripe-signature'];
    const rawBody = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;

    const stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (stripeEvent.type === 'checkout.session.completed') {
      await handleCheckoutSession(stripeEvent.data.object);
    }

    return jsonResponse(200, { received: true });
  } catch (error) {
    console.error('WEBHOOK ERROR:', error);
    return jsonResponse(400, { error: error.message });
  }
};

exports.config = {
  bodyParser: false,
};
