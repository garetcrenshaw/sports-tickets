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
  // PROCESS BEFORE RESPONDING (Vercel kills after response)
  // ============================================
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    
    if (session.payment_status !== 'paid') {
      console.log('⚠️ Session not paid - skipping');
      return res.status(200).json({ received: true, skipped: 'not_paid' });
    }

    try {
      // MUST await - Vercel terminates after response!
      await processCheckoutSession(session);
      console.log('✅ Processing complete, sending response');
      return res.status(200).json({ received: true, event_id: stripeEvent.id, processed: true });
    } catch (err) {
      console.error('❌ Processing error:', err.message);
      // Still return 200 so Stripe doesn't retry
      return res.status(200).json({ received: true, error: err.message });
    }
  }

  // For other event types
  return res.status(200).json({ received: true, event_id: stripeEvent.id });
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

  const customerEmail = session.customer_details?.email || session.customer_email || 'unknown@example.com';
  const buyerName = session.customer_details?.name || session.metadata?.buyerName || 'Guest';
  // Capture billing address details (zip code for analytics)
  const billingAddress = session.customer_details?.address || {};
  const billingZip = billingAddress.postal_code || null;
  const billingCity = billingAddress.city || null;
  const billingState = billingAddress.state || null;
  
  console.log(`📍 Customer location: ${billingCity || 'N/A'}, ${billingState || 'N/A'} ${billingZip || 'N/A'}`);
  
  // Note: metadata uses camelCase (eventId), not snake_case (event_id)
  // IMPORTANT: Convert to integer for proper matching with events table
  const eventIdRaw = session.metadata?.eventId || session.metadata?.event_id || '1';
  const eventId = parseInt(eventIdRaw, 10) || 1;

  // Build all ticket and email records at once (NO QR generation here!)
  const ticketRecords = [];
  const emailRecords = [];

  // Sort line items to process PARKING first, then ADMISSION
  // This ensures parking QR codes are sent before admission QR codes
  const sortedLineItems = [...lineItems.data].sort((a, b) => {
    const aType = (a.description || a.price?.product?.name || '').toLowerCase();
    const bType = (b.description || b.price?.product?.name || '').toLowerCase();
    
    // Parking comes first (returns -1 if a is parking)
    if (aType.includes('parking') && !bType.includes('parking')) return -1;
    if (!aType.includes('parking') && bType.includes('parking')) return 1;
    return 0; // Keep original order for same type
  });

  for (const item of sortedLineItems) {
    const ticketType = item.description || item.price?.product?.name || 'General Admission';
    const quantity = item.quantity || 1;

    // SKIP SERVICE FEE ITEMS - These should NOT become tickets or emails
    const ticketTypeLower = ticketType.toLowerCase();
    if (ticketTypeLower.includes('service fee') || ticketTypeLower.includes('platform fee')) {
      console.log(`⏭️ Skipping fee item: ${ticketType}`);
      continue;
    }

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
        qr_url: '', // Empty - will be populated when email is sent
        billing_zip: billingZip,
        billing_city: billingCity,
        billing_state: billingState
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
    
    // IMMEDIATE EMAIL TRIGGER - Don't wait for cron!
    // Fire and forget - we don't await this
    triggerEmailWorker().catch(err => {
      console.log('⚠️ Immediate email trigger failed (cron will retry):', err.message);
    });
  }

  console.log('=== BACKGROUND PROCESSING COMPLETE ===');
}

// Trigger the email worker immediately (fire and forget)
async function triggerEmailWorker() {
  // Use production URL directly for immediate trigger
  const workerUrl = 'https://gamedaytickets.io/api/process-email-queue';
  
  console.log('🚀 Triggering immediate email delivery at:', workerUrl);
  
  try {
    const response = await fetch(workerUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      },
      timeout: 2000 // Don't wait too long
    });
    
    if (response.ok) {
      console.log('✅ Email worker triggered successfully');
    } else {
      console.log('⚠️ Email worker returned:', response.status);
    }
  } catch (err) {
    console.log('⚠️ Email trigger error (cron will retry):', err.message);
  }
}
