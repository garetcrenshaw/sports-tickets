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
    // Fetch ALL pending jobs (we'll group by recipient)
    console.log(`Fetching pending jobs...`);
    const { data: pendingJobs, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('retry_count', MAX_RETRIES)
      .order('created_at', { ascending: true })
      .limit(100); // Higher limit since we're grouping

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

    console.log(`📧 Found ${pendingJobs.length} pending job(s), grouping by recipient...`);

    // Group jobs by recipient email
    const jobsByRecipient = {};
    for (const job of pendingJobs) {
      const email = job.recipient_email;
      if (!jobsByRecipient[email]) {
        jobsByRecipient[email] = [];
      }
      jobsByRecipient[email].push(job);
    }

    const recipientCount = Object.keys(jobsByRecipient).length;
    console.log(`📬 Grouped into ${recipientCount} recipient(s)`);

    let successCount = 0;
    let failureCount = 0;
    let totalTicketsProcessed = 0;

    // Process each recipient group (ONE email per recipient with ALL their tickets)
    for (const [recipientEmail, tickets] of Object.entries(jobsByRecipient)) {
      console.log(`\n--- Processing ${tickets.length} ticket(s) for: ${recipientEmail} ---`);
      
      // Debug: Log the first ticket's keys to see what columns we have
      console.log('Available columns in job:', Object.keys(tickets[0]));
      
      const recipientName = tickets[0].recipient_name || 'Guest';
      const jobIds = tickets.map(t => t.id);

      try {
        // Build the combined email with all tickets
        console.log('Building combined email template...');
        
        // Generate HTML for each ticket
        const ticketBlocks = tickets.map((ticket, index) => {
          const ticketType = ticket.ticket_type || 'Event Ticket';
          
          // Handle both possible column names: qr_code_data OR qr_data
          const qrData = ticket.qr_code_data || ticket.qr_data || '';
          
          // Debug log
          console.log(`Ticket ${index + 1}: qr_code_data=${ticket.qr_code_data ? 'present' : 'missing'}, qr_data=${ticket.qr_data ? 'present' : 'missing'}, using length: ${qrData.length}`);
          
          if (!qrData) {
            console.error(`⚠️ WARNING: No QR data found for ticket ${ticket.ticket_id}`);
          }
          
          return `
            <!-- Ticket ${index + 1}: ${ticketType} -->
            <div style="margin-bottom: 30px; padding-bottom: 30px; border-bottom: ${index < tickets.length - 1 ? '2px dashed #e2e8f0' : 'none'};">
              <!-- Ticket Type Header -->
              <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 12px 16px; border-radius: 8px 8px 0 0; border: 1px solid #e2e8f0; border-bottom: none;">
                <p style="margin: 0; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Ticket ${index + 1} of ${tickets.length}</p>
                <h3 style="margin: 4px 0 0; color: #1e293b; font-size: 18px; font-weight: 600;">${ticketType}</h3>
              </div>
              
              <!-- QR Code -->
              <div style="text-align: center; padding: 25px; background: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
                <img src="data:image/png;base64,${qrData}" alt="${ticketType} QR Code" style="width: 200px; height: 200px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />
                <p style="color: #94a3b8; font-size: 11px; margin: 12px 0 0; font-family: monospace;">
                  ID: ${ticket.ticket_id}
                </p>
              </div>
            </div>
          `;
        }).join('');

        // Count ticket types for subject line
        const ticketTypes = {};
        tickets.forEach(t => {
          const type = t.ticket_type || 'Event Ticket';
          ticketTypes[type] = (ticketTypes[type] || 0) + 1;
        });
        const ticketSummary = Object.entries(ticketTypes)
          .map(([type, count]) => `${count}x ${type}`)
          .join(', ');

        const subject = tickets.length === 1 
          ? `Your ${tickets[0].ticket_type || 'Event Ticket'} is Ready!`
          : `Your ${tickets.length} Tickets are Ready! (${ticketSummary})`;

        console.log(`Subject: ${subject}`);
        console.log('Sending combined email via Resend...');

        const emailResult = await resend.emails.send({
          from: 'tickets@gamedaytickets.io',
          to: recipientEmail,
          subject: subject,
          html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #1a365d 0%, #2563eb 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                  🎟️ ${tickets.length === 1 ? 'Your Ticket is Ready!' : `Your ${tickets.length} Tickets are Ready!`}
                </h1>
                <p style="color: #93c5fd; margin: 10px 0 0; font-size: 14px;">
                  ${ticketSummary}
                </p>
              </div>
              
              <!-- Greeting -->
              <div style="padding: 25px 20px 15px;">
                <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0;">
                  Thank you for your purchase, <strong>${recipientName}</strong>! 
                  ${tickets.length === 1 
                    ? 'Your ticket is confirmed and ready for use.' 
                    : `All ${tickets.length} of your tickets are confirmed and ready for use.`}
                </p>
              </div>
              
              <!-- All Tickets -->
              <div style="padding: 10px 20px 30px;">
                ${ticketBlocks}
              </div>
              
              <!-- Instructions -->
              <div style="background: #fefce8; border-left: 4px solid #eab308; padding: 15px 20px; margin: 0 20px 20px; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #854d0e; font-size: 14px;">
                  <strong>📱 Important:</strong> Save this email or screenshot each QR code. 
                  ${tickets.length > 1 ? 'Each ticket has a unique QR code that must be scanned separately at entry.' : 'Show this QR code at entry.'}
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0 0 5px;">
                  ${tickets.length} ticket(s) • Event ID: ${tickets[0].event_id || 'N/A'}
                </p>
                <p style="color: #cbd5e1; font-size: 11px; margin: 0;">
                  GameDay Tickets • Automated Delivery System
                </p>
              </div>
            </div>
          `
        });

        console.log(`✅ Combined email sent successfully (Resend ID: ${emailResult.id})`);

        // CRITICAL: Bulk update ALL jobs for this recipient as completed
        const { error: updateError } = await supabase
          .from('email_queue')
          .update({
            status: 'completed',
            sent_at: new Date().toISOString(),
            processed_at: new Date().toISOString()
          })
          .in('id', jobIds);

        if (updateError) {
          console.error(`⚠️ CRITICAL: Failed to mark ${jobIds.length} jobs as completed:`, updateError.message);
          console.error(`   Job IDs: ${jobIds.join(', ')}`);
        } else {
          console.log(`✅ All ${jobIds.length} jobs marked as completed`);
        }

        successCount++;
        totalTicketsProcessed += tickets.length;

      } catch (emailError) {
        console.error(`❌ Email send failed for ${recipientEmail}: ${emailError.message}`);

        // Increment retry count for all jobs in this group
        for (const job of tickets) {
          const newRetryCount = job.retry_count + 1;
          const newStatus = newRetryCount >= MAX_RETRIES ? 'failed' : 'pending';

          const { error: updateError } = await supabase
            .from('email_queue')
            .update({
              retry_count: newRetryCount,
              status: newStatus,
              last_error: emailError.message,
              processed_at: new Date().toISOString()
            })
            .eq('id', job.id);

          if (updateError) {
            console.error(`⚠️ Failed to update job ${job.id}: ${updateError.message}`);
          }

          // Log failed jobs to errors table
          if (newStatus === 'failed') {
            await supabase.from('errors').insert({
              event_id: job.ticket_id,
              error: `Email delivery failed after ${MAX_RETRIES} attempts: ${emailError.message}`,
              timestamp: new Date().toISOString()
            });
          }
        }

        failureCount++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`\n=== EMAIL QUEUE WORKER COMPLETE ===`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Recipients processed: ${recipientCount}`);
    console.log(`Emails sent: ${successCount}`);
    console.log(`Emails failed: ${failureCount}`);
    console.log(`Total tickets in emails: ${totalTicketsProcessed}`);

    return sendJSON(res, 200, {
      success: true,
      recipients_processed: recipientCount,
      emails_sent: successCount,
      emails_failed: failureCount,
      tickets_processed: totalTicketsProcessed,
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
