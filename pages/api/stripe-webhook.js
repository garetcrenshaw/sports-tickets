// Vercel config: maxDuration 60
import { getStripeClient, requireEnv } from '../../src/lib/stripe.js';
import { createTickets, createParkingPasses } from '../../src/lib/db.js';
import { generateTicketQr } from '../../src/lib/qr.js';
import { sendTicketsEmail } from './send-ticket.js';
import { setCors, sendJson, end, readRawBody } from './_utils.js';

const stripe = getStripeClient();

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
console.log('WEBHOOK SITE_URL →', SITE_URL);

function parseNonNegativeInt(value) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function buildTicketRows({ count, eventId, name, email, sessionId }) {
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const ticketNumber = i + 1;
    rows.push({
      ticket_id: `ticket-${sessionId}-${ticketNumber}`,
      event_id: String(eventId),
      ticket_type: 'Gameday Admission',
      purchaser_name: name,
      purchaser_email: email,
      status: 'purchased',
    });
  }
  return rows;
}

async function buildParkingRows({ count, eventId, name, email, sessionId }) {
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const ticketNumber = i + 1;
    rows.push({
      ticket_id: `parking-${sessionId}-${ticketNumber}`,
      event_id: String(eventId),
      ticket_type: 'Gameday Parking',
      purchaser_name: name,
      purchaser_email: email,
      status: 'purchased',
    });
  }
  return rows;
}

async function handleCheckoutSession(session) {
  console.log('📦 handleCheckoutSession START');

  // Use the session data provided by the webhook (no API call needed)
  const fullSession = session;
  console.log('📋 USING SESSION DATA FROM WEBHOOK');

  const metadata = fullSession.metadata || {};
  console.log('WEBHOOK METADATA:', JSON.stringify(metadata));

  // Parse quantities from metadata or count line items
  let admissionQty = parseInt(metadata.admissionQuantity, 10) || 0;
  let parkingQty = parseInt(metadata.parkingQuantity, 10) || 0;

  // If metadata doesn't have quantities, parse from line_items
  if (admissionQty === 0 && parkingQty === 0 && fullSession.line_items?.data) {
    console.log('📋 PARSING QUANTITIES FROM LINE ITEMS...');
    for (const item of fullSession.line_items.data) {
      const priceId = item.price?.id;
      const quantity = item.quantity || 1;
      if (priceId === 'price_admission') { // You'll need to set these IDs in your create-checkout
        admissionQty += quantity;
      } else if (priceId === 'price_parking') {
        parkingQty += quantity;
      }
    }
    console.log('📋 PARSED FROM LINE ITEMS:', { admissionQty, parkingQty });
  }

  const buyerEmail = metadata.buyerEmail || fullSession.customer_details?.email;
  const buyerName = metadata.buyerName || fullSession.customer_details?.name || 'Customer';
  const eventName = metadata.eventName || metadata.eventTitle || 'General Admission';
  const eventId = parseInt(metadata.eventId, 10) || 1;

  console.log('PARSED:', { admissionQty, parkingQty, buyerEmail, buyerName, eventId });

  if (admissionQty + parkingQty === 0) {
    console.log('ZERO QUANTITIES — SKIPPING FULFILLMENT');
    return;
  }

  if (!buyerEmail) {
    throw new Error('Missing customer email on checkout session');
  }

  console.log(`🎫 Building ${admissionQty} ticket rows...`);
  const ticketRows = await buildTicketRows({
    count: admissionQty,
    eventId,
    name: buyerName,
    email: buyerEmail,
    sessionId: fullSession.id,
  });
  console.log(`✅ Built ${ticketRows.length} ticket rows`);

  console.log(`🅿️  Building ${parkingQty} parking rows...`);
  const parkingRows = await buildParkingRows({
    count: parkingQty,
    eventId,
    name: buyerName,
    email: buyerEmail,
    sessionId: fullSession.id,
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
    console.log(`✅ Created ${createdTickets.length} tickets in Supabase`);
    console.log('SUPABASE DATA - TICKETS:', JSON.stringify(createdTickets, null, 2));
    console.log(`✅ Created ${createdParking.length} parking passes in Supabase`);
    console.log('SUPABASE DATA - PARKING:', JSON.stringify(createdParking, null, 2));
  } catch (dbError) {
    console.error('❌ Supabase insert failed:', dbError.message);
    console.error('❌ Supabase error details:', JSON.stringify(dbError, null, 2));
    throw new Error(`Database insert failed: ${dbError.message}`);
  }

  // Generate QR codes using auto-generated IDs
  console.log('🎨 Generating QR codes...');
  for (const ticket of createdTickets) {
    const validateUrl = `${SITE_URL}/validate/${ticket.id}`;
    const qrCodeUrl = await generateTicketQr(validateUrl);
    ticket.qr_code_url = qrCodeUrl;
  }

  for (const pass of createdParking) {
    const validateUrl = `${SITE_URL}/validate/${pass.id}`;
    const qrCodeUrl = await generateTicketQr(validateUrl);
    pass.qr_code_url = qrCodeUrl;
  }
  console.log('✅ QR codes generated');

  const ticketsForEmail = createdTickets.map((ticket, index) => ({
    ticketId: ticket.id,
    qrCodeUrl: ticket.qr_code_url,
    label: `Ticket ${index + 1}`,
    ticketType: ticket.ticket_type || 'Gameday Tickets',
  }));

  const parkingForEmail = createdParking.map((pass, index) => ({
    ticketId: pass.id,
    qrCodeUrl: pass.qr_code_url,
    label: `Parking Pass ${index + 1}`,
    ticketType: pass.ticket_type || 'Gameday Parking',
  }));

  if (!ticketsForEmail.length && !parkingForEmail.length) {
    console.warn('⚠️  Checkout session completed with no items to fulfill', session.id);
    return;
  }

  console.log(`📧 Sending email to ${buyerEmail}...`);
  try {
    await sendTicketsEmail({
      email: buyerEmail,
      name: buyerName,
      eventName,
      totalAmount: (session.amount_total || 0) / 100,
      tickets: ticketsForEmail,
      parkingPasses: parkingForEmail,
    });
    console.log('EMAIL SENT TO:', buyerEmail);
    console.log('✅ Email sent successfully!');
  } catch (emailError) {
    console.error('RESEND ERROR:', emailError.message);
    console.error('❌ Email send failed:', emailError.message);
    console.error('❌ Email error details:', JSON.stringify(emailError, null, 2));
    // Email failed, but data is already in database - don't throw error
    console.log('⚠️  Data saved to Supabase but email failed - check Resend configuration');
  }

  console.log('📦 handleCheckoutSession COMPLETE');
}

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  console.log('🔥 WEBHOOK HIT IN PRODUCTION ===================================');
  console.log('WEBHOOK RECEIVED ===================================');
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
    console.log('FULL EVENT DATA:', JSON.stringify(stripeEvent.data.object));

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

// Export for testing
export { handleCheckoutSession };

