import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { buffer } from 'micro';

// CRITICAL: Disable body parsing for Stripe webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  console.log('=== WEBHOOK v2.0 - FAST RESPONSE ===');
  
  // Quick env check
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET || 
      !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing required environment variables');
    return res.status(500).json({ error: 'Configuration error' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let stripeEvent;
  
  try {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];
    
    if (!sig || !buf || buf.length === 0) {
      return res.status(200).json({ error: 'Missing signature or body' });
    }

    // Verify the event with Stripe
    stripeEvent = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log('✅ Event verified:', stripeEvent.type);
    
  } catch (err) {
    console.error('❌ Signature verification failed:', err.message);
    return res.status(200).json({ error: 'Signature verification failed' });
  }

  // ============================================
  // IMMEDIATE RESPONSE - Tell Stripe "Thank You"
  // ============================================
  res.status(200).json({ received: true, event_id: stripeEvent.id });
  console.log('✅ Responded to Stripe immediately');

  // ============================================
  // BACKGROUND PROCESSING - Fire and Forget
  // ============================================
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    
    if (session.payment_status !== 'paid') {
      console.log('⚠️ Session not paid - skipping');
      return;
    }

    // Don't await - let this run in background
    processCheckoutSession(session).catch(err => {
      console.error('Background processing error:', err.message);
    });
  }
}

// ============================================
// BACKGROUND PROCESSOR - Runs after response sent
// ============================================
async function processCheckoutSession(session) {
  console.log('=== BACKGROUND PROCESSING START ===');
  console.log('Session ID:', session.id);
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Idempotency check
  const { data: existing } = await supabase
    .from('email_queue')
    .select('id')
    .like('ticket_id', `${session.id}%`)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log('⚠️ Already processed - skipping');
    return;
  }

  // Fetch line items
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    expand: ['data.price.product']
  });
  console.log(`Found ${lineItems.data.length} line item(s)`);

  const customerEmail = session.customer_details?.email || 'unknown@example.com';
  const buyerName = session.customer_details?.name || 'Guest';
  const eventId = session.metadata?.event_id || 'default';

  // Build all ticket and email records at once (NO QR generation here!)
  const ticketRecords = [];
  const emailRecords = [];

  for (const item of lineItems.data) {
    const ticketType = item.description || item.price?.product?.name || 'General Admission';
    const quantity = item.quantity || 1;

    for (let i = 0; i < quantity; i++) {
      const ticketIndex = i + 1;
      const uniqueTicketId = `${session.id}-${ticketType.replace(/\s+/g, '_')}-${ticketIndex}`;

      // Ticket record - qr_url will be populated by email processor
      ticketRecords.push({
        stripe_session_id: session.id,
        ticket_id: uniqueTicketId,
        event_id: eventId,
        ticket_type: ticketType,
        buyer_name: buyerName,
        buyer_email: customerEmail,
        status: 'active',
        qr_url: '' // Empty - will be populated when email is sent
      });

      // Email queue record - NO qr_code_data, will be generated before sending
      emailRecords.push({
        ticket_id: uniqueTicketId,
        recipient_email: customerEmail,
        recipient_name: buyerName,
        ticket_type: ticketType,
        event_id: eventId,
        status: 'pending',
        retry_count: 0
      });
    }
  }

  console.log(`Prepared ${ticketRecords.length} tickets and ${emailRecords.length} email jobs`);

  // DEBUG: Log exact payload being sent to Supabase
  console.log('=== WEBHOOK DEBUG: EXACT COLUMN NAMES ===');
  console.log('First ticket record keys:', Object.keys(ticketRecords[0]));
  console.log('First email record keys:', Object.keys(emailRecords[0]));
  console.log('Inserting into email_queue:', JSON.stringify(emailRecords[0]));
  console.log('Inserting into tickets:', JSON.stringify(ticketRecords[0]));
  console.log('=== END DEBUG ===');

  // PARALLEL INSERTS using Promise.all - much faster!
  const [ticketResult, emailResult] = await Promise.all([
    supabase.from('tickets').insert(ticketRecords),
    supabase.from('email_queue').insert(emailRecords)
  ]);

  if (ticketResult.error) {
    console.error('❌ Ticket insert error:', ticketResult.error.message);
  } else {
    console.log(`✅ ${ticketRecords.length} tickets inserted`);
  }

  if (emailResult.error) {
    console.error('❌ Email queue error:', emailResult.error.message);
  } else {
    console.log(`✅ ${emailRecords.length} email jobs queued`);
  }

  console.log('=== BACKGROUND PROCESSING COMPLETE ===');
}
