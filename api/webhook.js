// Vercel config: maxDuration 60
const { getStripeClient, requireEnv } = require('../src/lib/stripe');
const { createTickets, createParkingPasses } = require('../src/lib/db');
const { generateTicketQr } = require('../src/lib/qr');
const { Resend } = require('resend');
const { setCors, sendJson, end, readRawBody } = require('./_utils');

const resend = new Resend(requireEnv('RESEND_API_KEY'));

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
      event_id: parseInt(eventId, 10),
      purchaser_name: name,
      purchaser_email: email,
      type: 'admission',
      status: 'valid',
      qr_code: qrCodeUrl,
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
      event_id: parseInt(eventId, 10),
      purchaser_name: name,
      purchaser_email: email,
      type: 'parking',
      status: 'valid',
      qr_code: qrCodeUrl,
    });
  }
  return rows;
}

async function handleCheckoutSession(session) {
  console.log('📦 handleCheckoutSession START');
  
  const metadata = session.metadata || {};
  console.log('Raw metadata:', metadata);
  
  const admissionQtyFromMetadata = parseNonNegativeInt(metadata.admissionQuantity);
  const fallbackQuantity = parseNonNegativeInt(metadata.quantity);
  let admissionQty = admissionQtyFromMetadata ?? fallbackQuantity ?? 0;
  const parkingQty = parseNonNegativeInt(metadata.parkingQuantity) ?? 0;
  const email = session.customer_details?.email || metadata.buyerEmail || metadata.email;
  const name = metadata.buyerName || metadata.name || session.customer_details?.name || 'Guest';
  const eventName = metadata.eventName || metadata.eventTitle || 'General Admission';
  const eventId = metadata.eventId || '1';

  console.log('Parsed quantities:', { admissionQty, parkingQty });
  console.log('Customer info:', { email, name, eventName, eventId });

  if (admissionQty === 0 && parkingQty === 0) {
    admissionQty = 1;
    console.log('⚠️  No quantities specified, defaulting to 1 admission ticket');
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
    console.log(`✅ Created ${createdTickets.length} tickets in Supabase`);
    console.log(`✅ Created ${createdParking.length} parking passes in Supabase`);
  } catch (dbError) {
    console.error('❌ DATABASE ERROR - Not sending email:', dbError.message);
    throw new Error(`Database insert failed: ${dbError.message}`);
  }

  const ticketsForEmail = createdTickets.map((ticket, index) => ({
    ticketId: ticket.ticket_id,
    qrCodeUrl: ticket.qr_code,
    label: `Admission Ticket ${index + 1}`,
  }));

  const parkingForEmail = createdParking.map((pass, index) => ({
    ticketId: pass.ticket_id,
    qrCodeUrl: pass.qr_code,
    label: `Parking Pass ${index + 1}`,
  }));

  if (!ticketsForEmail.length && !parkingForEmail.length) {
    console.warn('⚠️  Checkout session completed with no items to fulfill', session.id);
    return;
  }

  console.log(`📧 Sending email to ${email}...`);

  // Build HTML sections for tickets and parking
  const admissionSection = ticketsForEmail.length > 0 ? `
    <div style="margin: 20px 0; padding: 20px; background: #f0f9ff; border-radius: 8px; border: 1px solid #0ea5e9;">
      <h3 style="margin: 0 0 15px 0; color: #0ea5e9;">🎫 Admission Tickets</h3>
      ${ticketsForEmail.map(ticket => `
        <div style="margin: 15px 0; padding: 15px; background: white; border-radius: 6px; border: 1px solid #e0e7ff;">
          <p style="margin: 0 0 10px 0; font-weight: bold; color: #1e40af;">${ticket.label}</p>
          <div style="text-align: center;">
            <img src="${ticket.qrCodeUrl}" alt="QR Code for ${ticket.label}" style="max-width: 200px; height: auto;" />
          </div>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #64748b; text-align: center;">Scan at entrance</p>
        </div>
      `).join('')}
    </div>
  ` : '';

  const parkingSection = parkingForEmail.length > 0 ? `
    <div style="margin: 20px 0; padding: 20px; background: #fef3c7; border-radius: 8px; border: 1px solid #f59e0b;">
      <h3 style="margin: 0 0 15px 0; color: #f59e0b;">🅿️ Parking Passes</h3>
      ${parkingForEmail.map(pass => `
        <div style="margin: 15px 0; padding: 15px; background: white; border-radius: 6px; border: 1px solid #fde68a;">
          <p style="margin: 0 0 10px 0; font-weight: bold; color: #92400e;">${pass.label}</p>
          <div style="text-align: center;">
            <img src="${pass.qrCodeUrl}" alt="QR Code for ${pass.label}" style="max-width: 200px; height: auto;" />
          </div>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #64748b; text-align: center;">Scan at parking gate</p>
        </div>
      `).join('')}
    </div>
  ` : '';

  const totalAmount = (session.amount_total || 0) / 100;

  try {
    await resend.emails.send({
      from: 'GameDay Tickets <tickets@gamedaytickets.io>',
      to: email,
      subject: 'Your Gameday Tickets & Parking',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: white; padding: 20px;">
          <div style="background: #1e293b; padding: 30px; border-radius: 12px;">
            <h1 style="margin: 0 0 20px 0; color: #60a5fa; text-align: center;">🎉 Your Tickets Are Ready!</h1>

            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
              Hi ${name || 'Guest'}! Your Gameday tickets and parking passes are ready to use.
            </p>

            <div style="background: #334155; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-size: 18px; font-weight: bold; color: #60a5fa;">
                Total Paid: $${totalAmount.toFixed(2)}
              </p>
            </div>

            ${admissionSection}
            ${parkingSection}

            <div style="margin: 30px 0; padding: 20px; background: #dc2626; border-radius: 8px;">
              <h4 style="margin: 0 0 10px 0; color: white;">📋 Important Instructions:</h4>
              <ul style="margin: 0; padding-left: 20px; color: #fca5a5;">
                <li>Show your QR codes at the entrance/parking gate</li>
                <li>Each QR code can only be scanned once</li>
                <li>Doors open at 6:00 PM</li>
                <li>Have your ID ready for verification</li>
              </ul>
            </div>

            <p style="margin: 20px 0 0 0; font-size: 14px; color: #94a3b8; text-align: center;">
              Questions? Contact us at support@gamedaytickets.io
            </p>
          </div>
        </div>
      `,
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

