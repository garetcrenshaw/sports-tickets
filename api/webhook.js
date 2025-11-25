// Vercel config: maxDuration 60
const { getStripeClient, requireEnv } = require('../src/lib/stripe');
const { createTickets, createParkingPasses } = require('../src/lib/db');
const { generateTicketQr } = require('../src/lib/qr');
const { sendTicketsEmail } = require('./send-ticket');
const { setCors, sendJson, end, readRawBody } = require('./_utils');

const stripe = getStripeClient();

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
console.log('WEBHOOK SITE_URL →', SITE_URL);

function parseNonNegativeInt(value) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function buildTicketRows({ sessionId, count, eventId, name, email }) {
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const ticketId = `ticket-${sessionId}-${i + 1}`;
    const validateUrl = `${SITE_URL}/validate/${ticketId}`;
    const qrCodeUrl = await generateTicketQr(validateUrl);
    rows.push({
      ticket_id: ticketId,
      event_id: String(eventId),
      ticket_type: 'Gameday Admission',
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
    const validateUrl = `${SITE_URL}/validate/${ticketId}`;
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
  console.log('📦 handleCheckoutSession START');
  
  const metadata = session.metadata || {};
  console.log('Raw metadata:', metadata);
  
  const admissionQty = parseNonNegativeInt(metadata.admissionQuantity) || 0;
  const parkingQty = parseNonNegativeInt(metadata.parkingQuantity) || 0;
  const email = metadata.buyerEmail || session.customer_details?.email || 'stripe@example.com';
  const name = metadata.buyerName || session.customer_details?.name || 'Guest';
  const eventName = metadata.eventName || metadata.eventTitle || 'General Admission';
  const eventId = metadata.eventId || '1';

  console.log('Parsed quantities:', { admissionQty, parkingQty });
  console.log('Customer info:', { email, name, eventName, eventId });

  if (admissionQty === 0 && parkingQty === 0) {
    console.log('❌ ERROR: No quantities specified in metadata - cannot fulfill order');
    throw new Error('No admission or parking quantities specified in checkout metadata');
  }

  if (!email) {
    throw new Error('Missing customer email on checkout session');
  }

  console.log(`🎫 Building ${admissionQty} ticket rows...`);
  const ticketRows = await buildTicketRows({
    sessionId: session.id,
    count: admissionQty,
    eventId,
    name,
    email,
  });
  console.log(`✅ Built ${ticketRows.length} ticket rows`);

  console.log(`🅿️  Building ${parkingQty} parking rows...`);
  const parkingRows = await buildParkingRows({
    sessionId: session.id,
    count: parkingQty,
    eventId,
    name,
    email,
  });
  console.log(`✅ Built ${parkingRows.length} parking rows`);

  console.log('💾 Inserting into Supabase...');
  let createdTickets = [];
  let createdParking = [];

  try {
    [createdTickets, createdParking] = await Promise.all([
      ticketRows.length ? createTickets(ticketRows) : Promise.resolve([]),
      parkingRows.length ? createParkingPasses(parkingRows) : Promise.resolve([]),
    ]);
    console.log(`✅ Created ${createdTickets.length} tickets in Supabase:`, createdTickets.map(t => t.ticket_id));
    console.log(`✅ Created ${createdParking.length} parking passes in Supabase:`, createdParking.map(p => p.ticket_id));
  } catch (dbError) {
    console.error('❌ DATABASE ERROR - Not sending email:', dbError.message);
    console.error('❌ Database error details:', dbError);
    throw new Error(`Database insert failed: ${dbError.message}`);
  }

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
    console.warn('⚠️  Checkout session completed with no items to fulfill', session.id);
    return;
  }

  console.log(`📧 Sending email to ${email}...`);
  try {
    await sendTicketsEmail({
      email,
      name,
      eventName,
      totalAmount: (session.amount_total || 0) / 100,
      tickets: ticketsForEmail,
      parkingPasses: parkingForEmail,
    });
    console.log('✅ Email sent successfully!');
  } catch (emailError) {
    console.error('❌ EMAIL ERROR:', emailError.message);
    // Email failed, but data is already in database
    throw new Error(`Email send failed: ${emailError.message}`);
  }

  console.log('📦 handleCheckoutSession COMPLETE');
}

module.exports = async function handler(req, res) {
  console.log('🔥 WEBHOOK RECEIVED ===================================');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  
  setCors(res);

  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - responding 200');
    return end(res, 200);
  }

  if (req.method !== 'POST') {
    console.log('❌ Non-POST method:', req.method);
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const webhookSecret = requireEnv('STRIPE_WEBHOOK_SECRET');
    console.log('✅ Webhook secret loaded:', webhookSecret.substring(0, 15) + '...');
    
    const rawBody = await readRawBody(req);
    console.log('✅ Raw body received, length:', rawBody.length);
    
    const signature = req.headers['stripe-signature'];
    console.log('✅ Stripe signature:', signature ? signature.substring(0, 30) + '...' : 'MISSING!');

    const stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    console.log('✅ Webhook verified! Event type:', stripeEvent.type);
    console.log('Event ID:', stripeEvent.id);

    if (stripeEvent.type === 'checkout.session.completed') {
      console.log('🎫 Processing checkout.session.completed...');
      const session = stripeEvent.data.object;
      console.log('Session ID:', session.id);
      console.log('Customer email:', session.customer_details?.email);
      console.log('Metadata:', JSON.stringify(session.metadata, null, 2));
      
      await handleCheckoutSession(session);
      console.log('✅ ✅ ✅ WEBHOOK PROCESSING COMPLETE! ✅ ✅ ✅');
    } else {
      console.log(`ℹ️  Ignoring event type: ${stripeEvent.type}`);
    }

    return sendJson(res, 200, { received: true });
  } catch (error) {
    console.error('❌ ❌ ❌ WEBHOOK ERROR ❌ ❌ ❌');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Stack:', error.stack);
    return sendJson(res, 400, { error: error.message });
  }
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};

// Export for testing
module.exports.handleCheckoutSession = handleCheckoutSession;

