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
        const emailResult = await resend.emails.send({
          from: 'tickets@gamedaytickets.io',
          to: job.recipient_email,
          subject: 'Your Gameday Tickets + Parking are Ready!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Thank you for your purchase!</h2>
              <p>Here is your ticket for the event.</p>
              <div style="text-align: center; margin: 20px 0;">
                <img src="${job.qr_code_data}" alt="QR Code" style="max-width: 300px;" />
              </div>
              <p><strong>Event ID:</strong> ${job.event_id || 'N/A'}</p>
              <p><strong>Name:</strong> ${job.recipient_name || 'Guest'}</p>
              <p>Please show this QR code at the entrance.</p>
              <hr style="margin: 30px 0;" />
              <p style="color: #666; font-size: 12px;">
                Transaction ID: ${job.ticket_id}
              </p>
              <p style="color: #999; font-size: 11px;">
                Delivered by automated system
              </p>
            </div>
          `
        });

        console.log(`✅ Email sent successfully (Resend ID: ${emailResult.id})`);

        // Mark as sent
        const { error: updateError } = await supabase
          .from('email_queue')
          .update({
            status: 'sent',
            processed_at: new Date().toISOString()
          })
          .eq('id', job.id);

        if (updateError) {
          console.error(`⚠️ Failed to mark as sent: ${updateError.message}`);
        } else {
          console.log('✅ Job marked as sent in database');
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
