import { createClient } from '@supabase/supabase-js';
import { Resend } from '@resend/resend';

// Vercel serverless function config
export const config = {
  maxDuration: 60, // Allow up to 60s for batch processing (Vercel Pro+)
};

// Maximum retry attempts before marking as failed
const MAX_RETRIES = 3;

// Batch size per cron run (process 10 emails at a time)
const BATCH_SIZE = 10;

// Universal JSON response helper - uses ONLY Node.js native methods
function sendJSON(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

// Helper to normalize base64 strings (handles missing padding)
function normalizeBase64(str) {
  if (!str) return '';
  // Remove whitespace and newlines
  return str.trim().replace(/\s/g, '');
}

// Helper to compare secrets (tolerates base64 padding differences)
function secretsMatch(received, expected) {
  if (!received || !expected) return false;
  
  // Normalize both (remove whitespace, handle padding)
  const receivedNormalized = normalizeBase64(received);
  const expectedNormalized = normalizeBase64(expected);
  
  // Direct comparison
  if (receivedNormalized === expectedNormalized) return true;
  
  // Try with/without padding for base64
  const receivedWithoutPadding = receivedNormalized.replace(/=+$/, '');
  const expectedWithoutPadding = expectedNormalized.replace(/=+$/, '');
  
  return receivedWithoutPadding === expectedWithoutPadding;
}

export default async function handler(req, res) {
  const startTime = Date.now();
  console.log('=== EMAIL QUEUE WORKER START ===');
  console.log('Timestamp:', new Date().toISOString());

  // Security: Verify cron secret (prevents unauthorized calls)
  // Vercel Cron automatically sends this header
  const authHeader = req.headers.authorization || '';
  
  if (!process.env.CRON_SECRET) {
    console.error('❌ CRON_SECRET not configured in environment');
    return sendJSON(res, 500, { 
      error: 'CRON_SECRET environment variable not set' 
    });
  }

  // Extract token from "Bearer TOKEN" format
  const receivedToken = authHeader.replace(/^Bearer\s+/i, '');
  const expectedToken = process.env.CRON_SECRET;

  console.log('Auth check:');
  console.log('- Received token length:', receivedToken.length);
  console.log('- Expected token length:', expectedToken.length);
  console.log('- Received (first 10 chars):', receivedToken.substring(0, 10));
  console.log('- Expected (first 10 chars):', expectedToken.substring(0, 10));

  if (!secretsMatch(receivedToken, expectedToken)) {
    console.error('❌ Unauthorized request - token mismatch');
    console.error('Full received:', receivedToken);
    console.error('Full expected:', expectedToken);
    return sendJSON(res, 401, { 
      error: 'Unauthorized',
      message: 'Invalid CRON_SECRET'
    });
  }

  console.log('✅ Authorization verified');

  // Validate SUPABASE_URL format
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_URL.startsWith('http')) {
    console.error('❌ Invalid SUPABASE_URL:', process.env.SUPABASE_URL);
    return sendJSON(res, 500, {
      error: 'Configuration Error',
      message: 'SUPABASE_URL must start with http:// or https://'
    });
  }

  // Initialize clients
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    // Fetch pending jobs (status='pending' AND retry_count < 3)
    console.log(`Fetching pending jobs (LIMIT ${BATCH_SIZE})...`);
    const { data: pendingJobs, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('retry_count', MAX_RETRIES)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error('❌ Failed to fetch jobs:', fetchError.message);
      return sendJSON(res, 500, { 
        error: 'Database fetch failed',
        details: fetchError.message 
      });
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      console.log('✅ No pending email jobs in queue');
      return sendJSON(res, 200, { 
        processed: 0,
        message: 'Queue is empty'
      });
    }

    console.log(`📧 Processing ${pendingJobs.length} email job(s)...`);

    let successCount = 0;
    let failureCount = 0;

    // Process each job
    for (const job of pendingJobs) {
      console.log(`\n--- Job ${job.id} (ticket: ${job.ticket_id}) ---`);
      console.log(`Recipient: ${job.recipient_email}`);
      console.log(`Retry count: ${job.retry_count}`);

      try {
        // Send email via Resend
        console.log('Sending email...');
        
        // Determine ticket type display name
        const ticketTypeDisplay = job.ticket_type || 'Event Ticket';
        
        // Build the subject line based on ticket type
        const subject = `Your ${ticketTypeDisplay} is Ready!`;
        
        const emailResult = await resend.emails.send({
          from: 'tickets@gamedaytickets.io',
          to: job.recipient_email,
          subject: subject,
          html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #1a365d 0%, #2563eb 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🎟️ Your Ticket is Ready!</h1>
              </div>
              
              <!-- Ticket Type Banner -->
              <div style="background: #f8fafc; padding: 15px 20px; border-bottom: 2px solid #e2e8f0;">
                <p style="margin: 0; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Ticket Type</p>
                <h2 style="margin: 5px 0 0; color: #1e293b; font-size: 22px; font-weight: 600;">${ticketTypeDisplay}</h2>
              </div>
              
              <!-- Main Content -->
              <div style="padding: 30px 20px;">
                <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                  Thank you for your purchase, <strong>${job.recipient_name || 'Guest'}</strong>! 
                  Your ticket is confirmed and ready for use.
                </p>
                
                <!-- QR Code Section -->
                <div style="text-align: center; margin: 30px 0; padding: 25px; background: #f1f5f9; border-radius: 12px; border: 2px dashed #cbd5e1;">
                  <p style="color: #64748b; font-size: 13px; margin: 0 0 15px; text-transform: uppercase; letter-spacing: 0.5px;">
                    Scan this QR code at entry
                  </p>
                  <img src="data:image/png;base64,${job.qr_code_data}" alt="${ticketTypeDisplay} QR Code" style="max-width: 250px; height: auto; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
                </div>
                
                <!-- Ticket Details -->
                <div style="background: #fefce8; border-left: 4px solid #eab308; padding: 15px 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                  <p style="margin: 0; color: #854d0e; font-size: 14px;">
                    <strong>📋 Ticket Details</strong>
                  </p>
                  <p style="margin: 10px 0 0; color: #713f12; font-size: 14px;">
                    <strong>Event ID:</strong> ${job.event_id || 'N/A'}<br/>
                    <strong>Name:</strong> ${job.recipient_name || 'Guest'}<br/>
                    <strong>Type:</strong> ${ticketTypeDisplay}
                  </p>
                </div>
                
                <!-- Instructions -->
                <div style="margin-top: 25px;">
                  <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                    📱 <strong>Tip:</strong> Save this email or take a screenshot of the QR code for easy access at the venue.
                  </p>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0 0 5px;">
                  Ticket ID: ${job.ticket_id}
                </p>
                <p style="color: #cbd5e1; font-size: 11px; margin: 0;">
                  GameDay Tickets • Automated Delivery System
                </p>
              </div>
            </div>
          `
        });

        console.log(`✅ Email sent successfully (Resend ID: ${emailResult.id})`);

        // CRITICAL: Immediately mark as completed to prevent duplicate sends
        // This must happen right after successful send, before any other processing
        const { error: updateError } = await supabase
          .from('email_queue')
          .update({
            status: 'completed',
            sent_at: new Date().toISOString(),
            processed_at: new Date().toISOString()
          })
          .eq('id', job.id);

        if (updateError) {
          // Log error but don't re-throw - the email was already sent
          console.error(`⚠️ CRITICAL: Failed to mark email job ${job.id} as completed:`, updateError.message);
          console.error(`   This job may be re-sent on next cron run!`);
        } else {
          console.log(`✅ Job ${job.id} marked as completed in database`);
        }

        successCount++;

      } catch (emailError) {
        console.error(`❌ Email send failed: ${emailError.message}`);

        // Increment retry count
        const newRetryCount = job.retry_count + 1;
        const newStatus = newRetryCount >= MAX_RETRIES ? 'failed' : 'pending';

        console.log(`Updating retry count: ${job.retry_count} → ${newRetryCount}`);
        console.log(`New status: ${newStatus}`);

        const { error: updateError } = await supabase
          .from('email_queue')
          .update({
            retry_count: newRetryCount,
            status: newStatus,
            last_error: emailError.message
          })
          .eq('id', job.id);

        if (updateError) {
          console.error(`⚠️ Failed to update retry count: ${updateError.message}`);
        }

        // If max retries reached, log to errors table for manual intervention
        if (newStatus === 'failed') {
          console.error(`🚨 Job failed after ${MAX_RETRIES} attempts`);
          
          const { error: logError } = await supabase
            .from('errors')
            .insert({
              event_id: job.ticket_id,
              error: `Email delivery failed after ${MAX_RETRIES} attempts: ${emailError.message}`,
              timestamp: new Date().toISOString()
            });

          if (logError) {
            console.error(`⚠️ Failed to log error: ${logError.message}`);
          } else {
            console.log('✅ Error logged for manual intervention');
          }
        }

        failureCount++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`\n=== EMAIL QUEUE WORKER COMPLETE ===`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Processed: ${pendingJobs.length} jobs`);
    console.log(`Success: ${successCount}`);
    console.log(`Failures: ${failureCount}`);

    return sendJSON(res, 200, {
      success: true,
      processed: pendingJobs.length,
      success_count: successCount,
      failure_count: failureCount,
      duration_ms: duration
    });

  } catch (error) {
    console.error('❌ Worker error:', error.message);
    console.error('Stack trace:', error.stack);
    
    return sendJSON(res, 500, {
      error: 'Worker execution failed',
      message: error.message
    });
  }
}
