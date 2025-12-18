import { createClient } from '@supabase/supabase-js';
import { Resend } from '@resend/resend';
import QRCode from 'qrcode';

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
  console.log('=== EMAIL QUEUE WORKER v2.1 START ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('🔧 Using Supabase Storage for QR codes');

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
    console.log('🔄 Worker starting - fetching jobs to process...');
    
    // SIMPLE APPROACH: Fetch all non-failed jobs, then filter in JavaScript
    // This avoids complex Supabase query syntax issues
    console.log('Fetching all non-failed jobs from email_queue...');
    
    const { data: allJobs, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .neq('status', 'failed')
      .order('created_at', { ascending: true })
      .limit(100);

    if (fetchError) {
      console.error('❌ Database fetch failed:', fetchError.message);
      console.error('Full error:', JSON.stringify(fetchError));
      return sendJSON(res, 500, { 
        error: 'Database fetch failed',
        details: fetchError.message 
      });
    }

    console.log(`📊 Total rows fetched: ${allJobs?.length || 0}`);
    
    if (!allJobs || allJobs.length === 0) {
      console.log('⚠️ email_queue table is empty or all jobs have failed');
      return sendJSON(res, 200, { 
        processed: 0,
        message: 'Queue is empty'
      });
    }

    // Log what we got from the database
    console.log('First row columns:', Object.keys(allJobs[0]));
    console.log('First row sample:', JSON.stringify(allJobs[0], null, 2));

    // Filter to find jobs that need processing:
    // 1. Status is 'pending' (never sent)
    // 2. OR qr_url is empty/null (needs QR code generated)
    const pendingJobs = allJobs.filter(job => {
      const needsProcessing = job.status === 'pending';
      const needsQR = !job.qr_url || job.qr_url === '' || job.qr_url === null;
      return needsProcessing || needsQR;
    });

    console.log(`📧 Jobs needing processing: ${pendingJobs.length} (out of ${allJobs.length} total)`);

    if (pendingJobs.length === 0) {
      console.log('✅ All jobs are completed with QR codes');
      return sendJSON(res, 200, { 
        processed: 0,
        message: 'All jobs completed'
      });
    }

    console.log(`Processing ${pendingJobs.length} job(s), grouping by recipient...`);

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
      
      const recipientName = tickets[0].recipient_name || 'Guest';
      const jobIds = tickets.map(t => t.id);

      try {
        // Build the combined email with all tickets
        console.log('Building email with Supabase Storage QR codes...');
        
        // Generate QR codes, upload to Supabase Storage, and build HTML
        const ticketBlocksPromises = tickets.map(async (ticket, index) => {
          const ticketType = ticket.ticket_type || 'Event Ticket';
          let publicUrl = ticket.qr_url || ''; // Check if URL already exists
          
          // If no URL exists (or it's base64), generate and upload QR code
          if (!publicUrl || !publicUrl.startsWith('http')) {
            console.log(`Generating & uploading QR for ticket: ${ticket.ticket_id}`);
            
            try {
              // Generate QR code as Buffer (not Data URI)
              const qrBuffer = await QRCode.toBuffer(ticket.ticket_id);
              
              // Path: tickets/${ticket.ticket_id}-${Date.now()}.png
              const filePath = `tickets/${ticket.ticket_id}-${Date.now()}.png`;
              
              console.log(`Uploading to Supabase Storage: ${filePath}`);
              
              // Upload to Supabase Storage bucket 'qr-codes'
              const { error: uploadError } = await supabase.storage
                .from('qr-codes')
                .upload(filePath, qrBuffer, {
                  contentType: 'image/png',
                  upsert: true
                });
              
              if (uploadError) {
                console.error(`❌ Upload failed for ${ticket.ticket_id}:`, uploadError.message);
                // Fallback: use placeholder or skip
                publicUrl = '';
              } else {
                // Get public URL
                const { data: urlData } = supabase.storage
                  .from('qr-codes')
                  .getPublicUrl(filePath);
                
                publicUrl = urlData.publicUrl;
                console.log(`✅ Uploaded QR code: ${publicUrl}`);
                
                // CRITICAL: Update BOTH tickets AND email_queue tables with the URL
                const [ticketUpdate, emailQueueUpdate] = await Promise.all([
                  // Update tickets table
                  supabase
                    .from('tickets')
                    .update({ qr_url: publicUrl })
                    .eq('ticket_id', ticket.ticket_id),
                  // Update email_queue table
                  supabase
                    .from('email_queue')
                    .update({ qr_url: publicUrl })
                    .eq('ticket_id', ticket.ticket_id)
                ]);
                
                if (ticketUpdate.error) {
                  console.error(`⚠️ Failed to update tickets table: ${ticketUpdate.error.message}`);
                } else {
                  console.log(`✅ Saved URL to tickets table for ${ticket.ticket_id}`);
                }
                
                if (emailQueueUpdate.error) {
                  console.error(`⚠️ Failed to update email_queue table: ${emailQueueUpdate.error.message}`);
                } else {
                  console.log(`✅ Saved URL to email_queue table for ${ticket.ticket_id}`);
                }
              }
            } catch (qrErr) {
              console.error(`❌ QR generation/upload failed for ${ticket.ticket_id}:`, qrErr.message);
              publicUrl = '';
            }
          } else {
            console.log(`Using existing QR URL for ${ticket.ticket_id}`);
          }
          
          // Build HTML block for this ticket (Header + QR Image)
          // Color-code: Parking = Orange (#f97316), Admissions = Blue (#2563eb)
          const isParking = ticketType.toLowerCase().includes('parking');
          const accentColor = isParking ? '#f97316' : '#2563eb';
          const bgGradient = isParking 
            ? 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)' 
            : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)';
          const iconEmoji = isParking ? '🚗' : '🎟️';
          
          return `
            <!-- Ticket ${index + 1}: ${ticketType} -->
            <div style="margin-bottom: 30px; padding: 20px; background: ${bgGradient}; border: 2px solid ${accentColor}; border-radius: 16px;">
              <!-- Ticket Type Header -->
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; padding-bottom: 12px; border-bottom: 2px solid ${accentColor};">
                <span style="font-size: 24px;">${iconEmoji}</span>
                <h3 style="margin: 0; color: #1e293b; font-size: 18px; font-weight: 700;">
                  ${ticketType}
                </h3>
              </div>
              <p style="margin: 0 0 15px 0; color: #64748b; font-size: 12px;">
                Ticket ${index + 1} of ${tickets.length}
              </p>
              
              <!-- QR Code Image -->
              <div style="text-align: center; background: white; padding: 15px; border-radius: 12px;">
                ${publicUrl 
                  ? `<img src="${publicUrl}" alt="Ticket QR Code" style="width:200px; height:200px;" />`
                  : `<p style="color: #ef4444;">QR Code unavailable</p>`
                }
              </div>
              
              <p style="color: #64748b; font-size: 10px; margin: 15px 0 0; text-align: center; font-family: monospace;">
                ID: ${ticket.ticket_id}
              </p>
            </div>
          `;
        });
        
        // Wait for all QR codes to be generated and uploaded
        const ticketBlocks = (await Promise.all(ticketBlocksPromises)).join('');

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
        console.log(`Sending email to: ${recipientEmail}`);
        console.log('Resend API Key present:', !!process.env.RESEND_API_KEY);

        const emailResult = await resend.emails.send({
          from: 'GameDay Tickets <tickets@gamedaytickets.io>',
          to: recipientEmail,
          subject: subject,
          html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #0f172a 0%, #1e40af 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
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
              <div style="background: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
                <p style="color: #64748b; font-size: 12px; margin: 0 0 5px;">
                  ${tickets.length} ticket(s) • Event ID: ${tickets[0].event_id || 'N/A'}
                </p>
                <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                  GameDay Tickets • Automated Delivery System
                </p>
              </div>
            </div>
          `
        });

        console.log('📧 Resend response:', JSON.stringify(emailResult));
        
        if (emailResult.error) {
          throw new Error(`Resend error: ${emailResult.error.message || JSON.stringify(emailResult.error)}`);
        }
        
        console.log(`✅ Email sent successfully! Resend ID: ${emailResult.data?.id || emailResult.id || 'unknown'}`);

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
