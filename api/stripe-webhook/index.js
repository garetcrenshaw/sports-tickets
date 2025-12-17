import Stripe from 'stripe';
import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';
import { buffer } from 'micro';

// CRITICAL: Disable body parsing for Stripe webhook signature verification
export const config = {
  api: {
    bodyParser: false, // Must be disabled to receive raw body for signature verification
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Timeout helper to prevent hangs
async function timeoutPromise(promise, ms, errorMsg) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(errorMsg)), ms)
    )
  ]);
}

export default async function handler(req, res) {
  console.log('=== WEBHOOK DEBUG START ===');
  console.log('--- MULTI-TICKET FULFILLMENT v1.0 ---');
  console.log('Environment check:');
  console.log('- STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'SET' : 'MISSING');
  console.log('- STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? 'SET' : 'MISSING');
  console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'MISSING');
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');

  // Check required environment variables
  const requiredEnvVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);
  if (missingEnvVars.length > 0) {
    console.error('Missing environment variables:', missingEnvVars);
    return res.status(500).json({
      error: {
        code: '500',
        message: `Missing environment variables: ${missingEnvVars.join(', ')}`
      }
    });
  }

  if (req.method !== 'POST') {
    console.log('Non-POST method:', req.method);
    return res.status(405).json({
      error: {
        code: '405',
        message: 'Method Not Allowed'
      }
    });
  }

  console.log('Webhook POST received. Headers:', JSON.stringify(req.headers, null, 2));

  let buf;
  try {
    // Use micro's buffer() to get raw body - works in both local and Vercel
    // This preserves the exact bytes needed for signature verification
    buf = await buffer(req);
    console.log('Raw body buffer length:', buf.length);
    console.log('Content-Length header:', req.headers['content-length']);

    const sig = req.headers['stripe-signature'];
    console.log('Stripe signature present:', !!sig);

    if (!sig) {
      console.error('No Stripe signature provided');
      // Always return 200 to acknowledge receipt, even on errors
      return res.status(200).json({
        error: {
          code: '400',
          message: 'No Stripe signature provided'
        }
      });
    }

    if (!buf || buf.length === 0) {
      console.error('No request body received');
      return res.status(200).json({
        error: {
          code: '400',
          message: 'No request body'
        }
      });
    }

    // Verify the event with Stripe - this is the critical step that fails without raw buffer
    const stripeEvent = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log('✅ Event verified:', stripeEvent.type, 'ID:', stripeEvent.id);

    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;
      console.log('=== CHECKOUT SESSION COMPLETED EVENT ===');
      console.log('Session ID:', session.id);
      console.log('Payment status:', session.payment_status);
      console.log('Customer email:', session.customer_details?.email);
      console.log('Customer name:', session.customer_details?.name);

      if (session.payment_status !== 'paid') {
        console.log('⚠️ Session not paid - ignoring event:', session.id);
        return res.status(200).json({ status: 'ignored', reason: 'payment not completed' });
      }
      
      console.log('✅ Payment confirmed - proceeding with fulfillment');

      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

      // Idempotency: Check if any tickets exist for this session
      console.log('Checking for existing tickets for session:', session.id);
      const { data: existingTickets, error: checkError } = await supabase
        .from('tickets')
        .select('id')
        .eq('stripe_session_id', session.id)
        .limit(1);

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Supabase check error:', checkError.code, checkError.message);
        await logError(supabase, session.id, `Database check failed: ${checkError.message}`);
        throw new Error(`Database check failed: ${checkError.message}`);
      }

      if (existingTickets && existingTickets.length > 0) {
        console.log('⚠️ DUPLICATE EVENT DETECTED - Tickets already exist for session:', session.id);
        console.log('   This webhook has already been processed - skipping');
        return res.status(200).json({ status: 'ignored', reason: 'duplicate event' });
      }
      
      console.log('✅ No duplicate found - proceeding with ticket creation');

      // Fetch line items from the checkout session
      console.log('Fetching line items for session:', session.id);
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        expand: ['data.price.product']
      });
      console.log(`✅ Found ${lineItems.data.length} line item(s)`);

      const customerEmail = session.customer_details?.email || 'garetcrenshaw@gmail.com';
      const buyerName = session.customer_details?.name || 'Anonymous';
      const eventId = session.metadata?.event_id || 'fallback';

      let totalTicketsCreated = 0;
      let totalEmailsQueued = 0;

      // Loop through each line item
      for (const item of lineItems.data) {
        const ticketType = item.description || item.price?.product?.name || 'General Admission';
        const quantity = item.quantity || 1;
        
        console.log(`\n--- Processing: ${ticketType} (qty: ${quantity}) ---`);

        // Loop through quantity to create individual tickets
        for (let i = 0; i < quantity; i++) {
          const ticketIndex = i + 1;
          
          // Generate unique QR content: sessionId-ticketType-index
          const qrContent = `${session.id}-${ticketType.replace(/\s+/g, '_')}-${ticketIndex}`;
          console.log(`Generating QR for ticket ${ticketIndex}/${quantity}: ${qrContent}`);
          
          // Generate QR code as data URL
          const qrDataUrl = await QRCode.toDataURL(qrContent, {
            width: 256,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' }
          });
          
          // Extract only the Base64 string (remove data:image/png;base64, prefix)
          const qrDataBase64 = qrDataUrl.split(',')[1];
          
          // Create unique ticket ID for this specific ticket
          const uniqueTicketId = `${session.id}-${ticketType.replace(/\s+/g, '_')}-${ticketIndex}`;

          const ticketData = {
            stripe_session_id: session.id,
            ticket_id: uniqueTicketId,
            event_id: eventId,
            ticket_type: ticketType,
            buyer_name: buyerName,
            buyer_email: customerEmail,
            qr_data: qrDataBase64,
            status: 'active'
          };

          console.log('Inserting ticket to Supabase:', {
            ...ticketData,
            qr_data: `[BASE64_DATA length: ${qrDataBase64.length}]`
          });
          
          // Insert ticket with timeout
          const { error: insertError } = await timeoutPromise(
            supabase.from('tickets').insert(ticketData),
            5000,
            'Supabase ticket insert timeout (5s)'
          );

          if (insertError) {
            console.error(`❌ Ticket insert error for ${uniqueTicketId}:`, insertError.code, insertError.message);
            await logError(supabase, session.id, `Ticket insert failed for ${uniqueTicketId}: ${insertError.message}`);
            // Continue with other tickets even if one fails
            continue;
          }
          
          console.log(`✅ Ticket ${ticketIndex}/${quantity} inserted: ${uniqueTicketId}`);
          totalTicketsCreated++;

          // Queue email for this specific ticket
          try {
            const emailJob = {
              ticket_id: uniqueTicketId,
              recipient_email: customerEmail,
              recipient_name: buyerName,
              qr_code_data: qrDataBase64,
              ticket_type: ticketType,
              event_id: eventId,
              status: 'pending',
              retry_count: 0
            };

            console.log(`Queueing email for ticket: ${uniqueTicketId}`);
            
            const { error: queueError } = await supabase
              .from('email_queue')
              .insert(emailJob);

            if (queueError) {
              console.error(`❌ Email queue failed for ${uniqueTicketId}:`, queueError.message);
              await logError(supabase, session.id, `Email queue failed for ${uniqueTicketId}: ${queueError.message}`);
            } else {
              console.log(`✅ Email queued for ticket: ${uniqueTicketId}`);
              totalEmailsQueued++;
            }
          } catch (queueError) {
            console.error(`❌ Email queue exception for ${uniqueTicketId}:`, queueError.message);
            await logError(supabase, session.id, `Email queue exception for ${uniqueTicketId}: ${queueError.message}`);
          }
        }
      }

      console.log('\n=== FULFILLMENT SUMMARY ===');
      console.log(`Total tickets created: ${totalTicketsCreated}`);
      console.log(`Total emails queued: ${totalEmailsQueued}`);
      console.log('=== FULFILLMENT COMPLETE ===\n');
    }

    // Always return 200 to acknowledge receipt
    return res.status(200).json({ status: 'success' });
  } catch (err) {
    console.error('❌ Webhook error:', err.message);
    console.error('Stack trace:', err.stack);

    // Always return 200 to acknowledge receipt, even on errors
    // This prevents Stripe from retrying endlessly
    return res.status(200).json({
      error: {
        code: '500',
        message: err.message || 'A server error has occurred'
      }
    });
  }
}

// Helper function to log errors to Supabase
async function logError(supabase, eventId, errorMessage) {
  try {
    await supabase.from('errors').insert({
      event_id: eventId,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  } catch (logErr) {
    console.error('Failed to log error to database:', logErr);
  }
}
// Force deploy change
// FINAL FINAL deployment force
