import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { initSentryServer, captureException, captureMessage } from '../lib/sentry.js';

// Initialize Sentry for error tracking
initSentryServer();

// CRITICAL: Disable body parsing for Stripe webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Vercel-compatible raw body reader
async function getRawBody(req) {
  // In Vercel, when bodyParser is false, body might already be available
  if (req.body) {
    if (Buffer.isBuffer(req.body)) {
      return req.body;
    }
    if (typeof req.body === 'string') {
      return Buffer.from(req.body, 'utf8');
    }
  }
  
  // Otherwise read from stream
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => {
      chunks.push(chunk);
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    req.on('error', (err) => {
      reject(err);
    });
    // Timeout after 5 seconds
    setTimeout(() => {
      reject(new Error('Body read timeout'));
    }, 5000);
  });
}

// Stripe client will be initialized after env check
let stripe;

export default async function handler(req, res) {
  // Log immediately to confirm function is being called
  console.log('🚀 WEBHOOK HANDLER CALLED -', new Date().toISOString());
  console.log('Request method:', req.method);
  console.log('Request headers:', Object.keys(req.headers));
  
  // Top-level error handler to catch any unhandled errors
  try {
    const result = await handleWebhook(req, res);
    console.log('✅ Webhook handler completed successfully');
    return result;
  } catch (error) {
    console.error('❌ CRITICAL: Unhandled webhook error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // Capture in Sentry with critical tag
    captureException(error, {
      tags: {
        component: 'stripe-webhook',
        critical: true,
      },
      extra: {
        method: req.method,
        headers: Object.keys(req.headers),
      },
    });
    
    // Make sure we return a response even if there's an error
    try {
      return res.status(500).json({ 
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred',
        type: error.name || 'UnknownError'
      });
    } catch (responseError) {
      // If we can't even send a response, log it
      console.error('❌ CRITICAL: Could not send error response:', responseError);
      captureException(responseError, {
        tags: {
          component: 'stripe-webhook',
          critical: true,
          stage: 'error-response',
        },
      });
    }
  }
}

async function handleWebhook(req, res) {
  console.log('=== WEBHOOK HANDLER START ===');
  console.log('Timestamp:', new Date().toISOString());
  
  // Safety check - ensure req and res exist
  if (!req || !res) {
    console.error('❌ CRITICAL: req or res is undefined');
    throw new Error('Invalid request/response objects');
  }
  
  // Quick env check with detailed logging
  console.log('Checking environment variables...');
  const missingVars = [];
  if (!process.env.STRIPE_SECRET_KEY) missingVars.push('STRIPE_SECRET_KEY');
  if (!process.env.STRIPE_WEBHOOK_SECRET) missingVars.push('STRIPE_WEBHOOK_SECRET');
  if (!process.env.SUPABASE_URL) missingVars.push('SUPABASE_URL');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
  
  console.log('Environment check complete. Missing vars:', missingVars.length);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing environment variables:', missingVars.join(', '));
    return res.status(500).json({ 
      error: 'Configuration error',
      missing_vars: missingVars,
      message: 'Missing required environment variables'
    });
  }

  // Initialize Stripe client now that we know the key exists
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let stripeEvent;
  
  try {
    console.log('Reading request body...');
    let buf;
    try {
      // Try Vercel-compatible body reading
      buf = await getRawBody(req);
      console.log(`✅ Body read successfully: ${buf.length} bytes`);
    } catch (bodyError) {
      console.error('❌ Failed to read request body:', bodyError.message);
      console.error('Body error stack:', bodyError.stack);
      return res.status(400).json({ 
        error: 'Failed to read request body', 
        message: bodyError.message 
      });
    }
    
    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
      console.error('❌ Missing stripe-signature header');
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }
    
    if (!buf || buf.length === 0) {
      console.error('❌ Empty request body');
      return res.status(400).json({ error: 'Empty request body' });
    }

    console.log(`📦 Received webhook body: ${buf.length} bytes`);

    // Verify the event with Stripe
    stripeEvent = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log('✅ Event verified:', stripeEvent.type);
    
  } catch (err) {
    console.error('❌ Signature verification failed:', err.message);
    console.error('Error stack:', err.stack);
    return res.status(400).json({ error: 'Signature verification failed', message: err.message });
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
      
      // Capture in Sentry - this is critical for fulfillment
      captureException(err, {
        tags: {
          component: 'stripe-webhook',
          critical: true,
          stage: 'checkout-processing',
        },
        extra: {
          session_id: session.id,
          payment_status: session.payment_status,
          customer_email: session.customer_details?.email,
        },
      });
      
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
  
  // Validate Supabase config before creating client
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing');
  }
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('✅ Supabase client created with URL:', process.env.SUPABASE_URL?.substring(0, 30) + '...');

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

  const customerEmail = session.customer_details?.email || session.customer_email || session.metadata?.buyerEmail || '';
  const buyerName = session.customer_details?.name || session.metadata?.buyerName || 'Guest';
  
  
  // Capture billing address details (zip code for analytics)
  const billingAddress = session.customer_details?.address || {};
  const billingZip = billingAddress.postal_code || null;
  const billingCity = billingAddress.city || null;
  const billingState = billingAddress.state || null;
  
  // Capture marketing consent (if enabled in Stripe Dashboard)
  // Consent data structure: { promotions: 'opt_in' | 'opt_out' | null }
  const marketingConsent = session.consent?.promotions || null;
  const marketingOptIn = marketingConsent === 'opt_in';
  
  console.log(`📍 Customer location: ${billingCity || 'N/A'}, ${billingState || 'N/A'} ${billingZip || 'N/A'}`);
  if (marketingConsent !== null) {
    console.log(`📧 Marketing consent: ${marketingConsent} (opt-in: ${marketingOptIn})`);
  }
  
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

      // Ticket record - simple, just what we need
      ticketRecords.push({
        stripe_session_id: session.id,
        ticket_id: uniqueTicketId,
        event_id: eventId.toString(), // Convert to string - database ID is TEXT
        ticket_type: ticketType,
        buyer_name: buyerName,
        buyer_email: customerEmail,
        status: 'active',
        qr_url: '' // Empty - will be populated when processed
      });
    }
  }

  console.log(`Prepared ${ticketRecords.length} tickets`);

  // DEBUG: Log exact payload being sent to Supabase
  console.log('=== WEBHOOK DEBUG: EXACT COLUMN NAMES ===');
  console.log('First ticket record keys:', Object.keys(ticketRecords[0]));
  console.log('Inserting into tickets:', JSON.stringify(ticketRecords[0]));
  console.log('=== END DEBUG ===');

  // Insert tickets
  const ticketResult = await supabase.from('tickets').insert(ticketRecords);

  if (ticketResult.error) {
    console.error('❌ Ticket insert error:', ticketResult.error);
    console.error('Full error:', JSON.stringify(ticketResult.error, null, 2));
    throw new Error(`Failed to insert tickets: ${ticketResult.error.message}`);
  }
  
  console.log(`✅ ${ticketRecords.length} tickets inserted successfully`);

  // Get event name for email subject
  // Note: id is TEXT in database, so convert eventId to string for comparison
  const { data: eventData } = await supabase
    .from('events')
    .select('event_name')
    .eq('id', eventId.toString())
    .single();
  
  const eventName = eventData?.event_name || 'your event';

  // ═══════════════════════════════════════════════════════════════════════════
  // EMAIL TICKET DELIVERY - Always use Resend email delivery
  // ═══════════════════════════════════════════════════════════════════════════
  // Generate QR codes first (required for email delivery)
  console.log('📧 Generating QR codes for email delivery...');
  await generateQRCodes(ticketRecords, supabase);
  console.log('✅ QR codes generated');
  
  if (customerEmail) {
    console.log('📧 Queuing email delivery to:', customerEmail);
    
    // Build email queue records
    const emailRecords = ticketRecords.map(ticket => ({
      ticket_id: ticket.ticket_id,
      recipient_email: customerEmail,
      recipient_name: buyerName,
      ticket_type: ticket.ticket_type,
      event_id: eventId,
      status: 'pending',
      retry_count: 0
    }));
    
    const emailResult = await supabase.from('email_queue').insert(emailRecords);
    
    if (emailResult.error) {
      console.error('❌ Email queue error:', emailResult.error.message);
      console.error('Full error:', JSON.stringify(emailResult.error, null, 2));
      
      // Capture in Sentry - email queue failures are critical
      captureException(new Error(`Email queue insert failed: ${emailResult.error.message}`), {
        tags: {
          component: 'stripe-webhook',
          critical: true,
          stage: 'email-queue-insert',
        },
        extra: {
          session_id: session.id,
          customer_email: customerEmail,
          ticket_count: ticketRecords.length,
        },
      });
    } else {
      console.log(`✅ ${emailRecords.length} email(s) queued successfully`);
      // Trigger email worker immediately
      triggerEmailWorker();
    }
  } else {
    console.error('⚠️ No email address provided - cannot deliver tickets');
    console.error('⚠️ Customer email was:', customerEmail);
    
    // Capture in Sentry - missing email is critical
    captureMessage('Checkout completed but no email address provided', {
      level: 'warning',
      tags: {
        component: 'stripe-webhook',
        critical: true,
      },
      extra: {
        session_id: session.id,
        buyer_name: buyerName,
        ticket_count: ticketRecords.length,
      },
    });
  }

  console.log('=== BACKGROUND PROCESSING COMPLETE ===');
}

// Generate QR codes for all tickets and store in Supabase
async function generateQRCodes(tickets, supabase) {
  const QRCode = await import('qrcode');
  
  for (const ticket of tickets) {
    try {
      const qrBuffer = await QRCode.default.toBuffer(ticket.ticket_id);
      const filePath = `tickets/${ticket.ticket_id}-${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('qr-codes')
        .upload(filePath, qrBuffer, {
          contentType: 'image/png',
          upsert: true
        });
      
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('qr-codes')
          .getPublicUrl(filePath);
        
        // Update ticket with QR URL
        await supabase
          .from('tickets')
          .update({ qr_url: urlData.publicUrl })
          .eq('ticket_id', ticket.ticket_id);
        
        console.log(`✅ QR generated for ${ticket.ticket_id}`);
      }
    } catch (qrErr) {
      console.error(`⚠️ QR generation failed for ${ticket.ticket_id}:`, qrErr.message);
    }
  }
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
