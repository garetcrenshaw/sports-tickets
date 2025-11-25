// Vercel config: maxDuration 60
const { getStripeClient, requireEnv } = require('../src/lib/stripe.js');
const { createTickets, createParkingPasses } = require('../src/lib/db.js');
const { generateTicketQr } = require('../src/lib/qr.js');
const { sendTicketsEmail } = require('./lib/email.js');
const { setCors, sendJson, end, readRawBody } = require('./_utils.js');

const stripe = getStripeClient();
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

async function handleCheckoutSession(session) {
  console.log('🎫 WEBHOOK: Processing checkout.session.completed');
  console.log('🎫 WEBHOOK: Session ID:', session.id);

  // Retrieve full session with metadata and line_items
  console.log('🔍 WEBHOOK: Retrieving full session...');
  const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['line_items', 'customer_details']
  });
  console.log('✅ WEBHOOK: Full session retrieved');

  // Parse metadata
  const metadata = fullSession.metadata || {};
  console.log('📋 WEBHOOK METADATA:', JSON.stringify(metadata, null, 2));

  const admissionQuantity = parseInt(metadata.admissionQuantity || '0', 10);
  const parkingQuantity = parseInt(metadata.parkingQuantity || '0', 10);
  const buyerEmail = metadata.buyerEmail || fullSession.customer_details?.email;
  const buyerName = metadata.buyerName || fullSession.customer_details?.name || 'Customer';
  const eventId = parseInt(metadata.eventId || '1', 10);

  console.log('🔢 WEBHOOK: Parsed quantities - Admission:', admissionQuantity, 'Parking:', parkingQuantity);
  console.log('👤 WEBHOOK: Buyer - Name:', buyerName, 'Email:', buyerEmail);

  if (admissionQuantity <= 0 && parkingQuantity <= 0) {
    console.log('⚠️ WEBHOOK: No items to fulfill, skipping');
    return;
  }

  if (!buyerEmail) {
    throw new Error('Missing buyer email in session');
  }

  // Build ticket data for Supabase
  console.log('🏗️ WEBHOOK: Building ticket data...');
  const ticketRows = [];
  for (let i = 0; i < admissionQuantity; i++) {
    ticketRows.push({
      event_id: String(eventId),
      ticket_type: 'Gameday Admission',
      purchaser_name: buyerName,
      purchaser_email: buyerEmail,
      status: 'purchased',
    });
  }

  const parkingRows = [];
  for (let i = 0; i < parkingQuantity; i++) {
    parkingRows.push({
      event_id: String(eventId),
      ticket_type: 'Gameday Parking',
      purchaser_name: buyerName,
      purchaser_email: buyerEmail,
      status: 'purchased',
    });
  }

  console.log(`📝 WEBHOOK: Created ${ticketRows.length} ticket rows and ${parkingRows.length} parking rows`);

  // Insert into Supabase
  console.log('💾 WEBHOOK: Inserting into Supabase...');
  let createdTickets = [];
  let createdParking = [];

  try {
    const insertPromises = [];
    if (ticketRows.length > 0) {
      insertPromises.push(createTickets(ticketRows));
    } else {
      insertPromises.push(Promise.resolve([]));
    }

    if (parkingRows.length > 0) {
      insertPromises.push(createParkingPasses(parkingRows));
    } else {
      insertPromises.push(Promise.resolve([]));
    }

    [createdTickets, createdParking] = await Promise.all(insertPromises);

    console.log('✅ WEBHOOK: Supabase insert successful');
    console.log('🎫 WEBHOOK: Created tickets:', createdTickets.length);
    console.log('🅿️ WEBHOOK: Created parking passes:', createdParking.length);
    console.log('📊 WEBHOOK: Ticket data:', JSON.stringify(createdTickets, null, 2));
    console.log('📊 WEBHOOK: Parking data:', JSON.stringify(createdParking, null, 2));
  } catch (dbError) {
    console.error('❌ WEBHOOK: Supabase insert failed:', dbError.message);
    throw new Error(`Database error: ${dbError.message}`);
  }

  // Generate QR codes for all tickets and passes
  console.log('🎨 WEBHOOK: Generating QR codes...');
  const allItems = [...createdTickets, ...createdParking];

  for (const item of allItems) {
    try {
      const validateUrl = `${SITE_URL}/validate/${item.id}`;
      console.log(`🎯 WEBHOOK: Generating QR for ${item.id} -> ${validateUrl}`);
      const qrCodeDataUrl = await generateTicketQr(validateUrl);
      item.qrCodeUrl = qrCodeDataUrl;
      console.log(`✅ WEBHOOK: QR generated for ${item.id}`);
    } catch (qrError) {
      console.error(`❌ WEBHOOK: QR generation failed for ${item.id}:`, qrError.message);
      item.qrCodeUrl = 'https://via.placeholder.com/256x256?text=QR+Error';
    }
  }

  console.log('✅ WEBHOOK: All QR codes generated');

  // Prepare email data
  const ticketsForEmail = createdTickets.map((ticket, index) => ({
    ticketId: ticket.id,
    qrCodeUrl: ticket.qrCodeUrl,
    label: `Admission Ticket ${index + 1}`,
    ticketType: 'Gameday Admission',
  }));

  const parkingForEmail = createdParking.map((pass, index) => ({
    ticketId: pass.id,
    qrCodeUrl: pass.qrCodeUrl,
    label: `Parking Pass ${index + 1}`,
    ticketType: 'Gameday Parking',
  }));

  // Send email with all QR codes
  console.log('📧 WEBHOOK: Sending email...');
  try {
    await sendTicketsEmail({
      email: buyerEmail,
      name: buyerName,
      eventName: 'Gameday Event',
      totalAmount: (fullSession.amount_total || 0) / 100,
      tickets: ticketsForEmail,
      parkingPasses: parkingForEmail,
    });

    console.log('✅ WEBHOOK: Email sent successfully to', buyerEmail);
    console.log('📧 WEBHOOK: Email contained', ticketsForEmail.length, 'tickets and', parkingForEmail.length, 'parking passes');
  } catch (emailError) {
    console.error('❌ WEBHOOK: Email send failed:', emailError.message);
    console.error('📧 WEBHOOK: Email error details:', JSON.stringify(emailError, null, 2));
    // Continue - data is saved, just email failed
  }

  console.log('🎉 WEBHOOK: Fulfillment complete for session', session.id);
}

const config = { api: { bodyParser: false } };

async function handler(req, res) {
  console.log('🔥 WEBHOOK: Received request');
  console.log('🔥 WEBHOOK: Method:', req.method);

  setCors(res);

  if (req.method === 'OPTIONS') {
    console.log('🔥 WEBHOOK: OPTIONS request - allowing');
    return end(res, 200);
  }

  if (req.method !== 'POST') {
    console.log('❌ WEBHOOK: Invalid method:', req.method);
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const webhookSecret = requireEnv('STRIPE_WEBHOOK_SECRET');
    console.log('🔐 WEBHOOK: Loading webhook secret...');

    const rawBody = await readRawBody(req);
    console.log('📦 WEBHOOK: Received body, length:', rawBody.length);

    const signature = req.headers['stripe-signature'];
    if (!signature) {
      throw new Error('Missing Stripe signature');
    }
    console.log('✍️ WEBHOOK: Verifying signature...');

    const stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    console.log('✅ WEBHOOK: Event verified, type:', stripeEvent.type);

    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      await handleCheckoutSession(session);
    } else {
      console.log('ℹ️ WEBHOOK: Ignoring event type:', stripeEvent.type);
    }

    console.log('✅ WEBHOOK: Processing complete');
    return sendJson(res, 200, { received: true });
  } catch (error) {
    console.error('❌ WEBHOOK: Error processing webhook:', error.message);
    console.error('❌ WEBHOOK: Error stack:', error.stack);
    return sendJson(res, 400, { error: error.message });
  }
};

module.exports = handler;
module.exports.handleCheckoutSession = handleCheckoutSession;

