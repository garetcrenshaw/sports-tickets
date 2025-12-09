# 🛠️ Fulfillment Fix Implementation Guide

**Priority:** HIGH  
**Estimated Time:** 4-6 hours  
**Impact:** 10-15% improvement in success rate, 50% reduction in fulfillment time  

---

## 🎯 Fix #1: Async Email Queue (CRITICAL PATH)

### Current Architecture (BLOCKING)
```
┌─────────────────────────────────────────────────────────────┐
│ Stripe Webhook (30s timeout limit)                         │
├─────────────────────────────────────────────────────────────┤
│ 1. Verify signature          [500ms]                       │
│ 2. Check idempotency (DB)    [300ms]                       │
│ 3. Generate QR code           [100ms]                       │
│ 4. Insert ticket (timeout 5s) [2-5s] ⚠️ Can fail           │
│ 5. Send email (timeout 5s)    [2-5s] ⚠️ Can fail           │
│ 6. Return 200                 [10ms]                        │
└─────────────────────────────────────────────────────────────┘
Total Time: 5-11s (best case) | 30s+ (worst case)
Failure Point: Any step fails → Customer gets no ticket
```

### New Architecture (ASYNC)
```
┌──────────────────────────────────────────────────────────────┐
│ Stripe Webhook (fast response)                              │
├──────────────────────────────────────────────────────────────┤
│ 1. Verify signature          [500ms]                        │
│ 2. Check idempotency (DB)    [300ms]                        │
│ 3. Generate QR code           [100ms]                        │
│ 4. Insert ticket + Queue job [1-2s]  ✅ Reliable            │
│ 5. Return 200 immediately     [10ms]                         │
└──────────────────────────────────────────────────────────────┘
Total Time: 1-3s (webhook acknowledged)

┌──────────────────────────────────────────────────────────────┐
│ Background Email Worker (runs every 30-60s via cron)        │
├──────────────────────────────────────────────────────────────┤
│ 1. Fetch pending jobs (LIMIT 10)                            │
│ 2. Send email (with retry logic)                            │
│ 3. Mark as 'sent' or increment retry_count                  │
│ 4. Retry failed jobs (max 3 attempts)                       │
└──────────────────────────────────────────────────────────────┘
Result: 99%+ email delivery, no customer-facing failures
```

---

## 📋 Implementation Steps

### Step 1: Create Email Queue Table (5 min)

**File:** `SUPABASE_EMAIL_QUEUE.sql` (create new)

```sql
-- Email queue for async delivery
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  qr_code_data TEXT NOT NULL,  -- Base64 or storage URL
  event_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, sent, failed
  retry_count INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_created ON email_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_ticket ON email_queue(ticket_id);

-- Add constraint to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_queue_unique_ticket 
  ON email_queue(ticket_id) 
  WHERE status IN ('pending', 'sent');
```

**Action:** Run this in Supabase SQL Editor

---

### Step 2: Update Webhook to Queue Email (30 min)

**File:** `api/stripe-webhook/index.js`

**BEFORE (Lines 174-207):**
```javascript
try {
  const emailResult = await timeoutPromise(
    resend.emails.send({
      from: 'tickets@gamedaytickets.io',
      to: customerEmail,
      subject: 'Your Gameday Tickets + Parking are Ready!',
      html: `...`
    }),
    5000,
    'Resend email timeout (5s)'
  );
  console.log('✅ Email sent successfully:', emailResult.id);
} catch (emailError) {
  console.error('❌ Resend email error:', emailError.message);
  await logError(supabase, session.id, `Email send failed: ${emailError.message}`);
}
```

**AFTER:**
```javascript
// Queue email for background processing
try {
  const emailJob = {
    ticket_id: session.id,
    recipient_email: customerEmail,
    recipient_name: ticketData.purchaser_name,
    qr_code_data: qrDataUrl,  // Store QR data for email
    event_id: ticketData.event_id,
    status: 'pending',
    retry_count: 0
  };

  const { error: queueError } = await supabase
    .from('email_queue')
    .insert(emailJob);

  if (queueError) {
    console.error('❌ Email queue insert error:', queueError.message);
    await logError(supabase, session.id, `Email queue failed: ${queueError.message}`);
    // Still return 200 - manual intervention can resend
  } else {
    console.log('✅ Email queued for delivery:', session.id);
  }
} catch (queueError) {
  console.error('❌ Email queue exception:', queueError.message);
  await logError(supabase, session.id, `Email queue failed: ${queueError.message}`);
}
```

---

### Step 3: Create Email Worker Function (60 min)

**File:** `api/process-email-queue/index.js` (create new)

```javascript
import { createClient } from '@supabase/supabase-js';
import { Resend } from '@resend/resend';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

// Maximum retry attempts
const MAX_RETRIES = 3;

// Batch size per run
const BATCH_SIZE = 10;

export default async function handler(req, res) {
  console.log('🔄 Email queue processor started');

  // Security: Verify cron secret (prevent unauthorized calls)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Fetch pending jobs
    const { data: pendingJobs, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('retry_count', MAX_RETRIES)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error('❌ Failed to fetch jobs:', fetchError.message);
      return res.status(500).json({ error: fetchError.message });
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      console.log('✅ No pending email jobs');
      return res.status(200).json({ processed: 0 });
    }

    console.log(`📧 Processing ${pendingJobs.length} email jobs`);

    let successCount = 0;
    let failureCount = 0;

    // Process each job
    for (const job of pendingJobs) {
      try {
        console.log(`Sending email to ${job.recipient_email} (ticket: ${job.ticket_id})`);

        // Send email
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
            </div>
          `
        });

        console.log(`✅ Email sent: ${emailResult.id}`);

        // Mark as sent
        await supabase
          .from('email_queue')
          .update({
            status: 'sent',
            processed_at: new Date().toISOString()
          })
          .eq('id', job.id);

        successCount++;

      } catch (emailError) {
        console.error(`❌ Email failed for ${job.ticket_id}:`, emailError.message);

        // Increment retry count
        const newRetryCount = job.retry_count + 1;
        const newStatus = newRetryCount >= MAX_RETRIES ? 'failed' : 'pending';

        await supabase
          .from('email_queue')
          .update({
            retry_count: newRetryCount,
            status: newStatus,
            last_error: emailError.message
          })
          .eq('id', job.id);

        // Log to error table for manual intervention
        if (newStatus === 'failed') {
          await supabase.from('errors').insert({
            event_id: job.ticket_id,
            error: `Email delivery failed after ${MAX_RETRIES} attempts: ${emailError.message}`,
            timestamp: new Date().toISOString()
          });
        }

        failureCount++;
      }
    }

    console.log(`✅ Email processing complete: ${successCount} sent, ${failureCount} failed`);

    return res.status(200).json({
      processed: pendingJobs.length,
      success: successCount,
      failures: failureCount
    });

  } catch (error) {
    console.error('❌ Email processor error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
```

---

### Step 4: Configure Vercel Cron Job (10 min)

**File:** `vercel.json` (update/create)

```json
{
  "functions": {
    "api/**/*.js": {
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/process-email-queue",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

**What this does:**
- Runs `/api/process-email-queue` every 1 minute
- Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` header

---

### Step 5: Add Environment Variable (2 min)

**Local:** `.env.local`
```bash
CRON_SECRET=your-random-secret-here-min-32-chars
```

**Vercel:** (via dashboard or CLI)
```bash
vercel env add CRON_SECRET production
# Enter: your-random-secret-here-min-32-chars
```

**Generate secret:**
```bash
openssl rand -base64 32
```

---

### Step 6: Test Locally (30 min)

**Test 1: Queue Email (webhook)**
```bash
# Start dev server
npm run dev

# Make purchase (or trigger test webhook)
curl -X POST http://localhost:3001/api/stripe-webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"checkout.session.completed","data":{"object":{"id":"test_123"}}}'

# Check Supabase email_queue table
# Should have 1 row with status='pending'
```

**Test 2: Process Queue (worker)**
```bash
# Call worker endpoint manually
curl -X POST http://localhost:3001/api/process-email-queue \
  -H "Authorization: Bearer your-random-secret-here-min-32-chars"

# Check Supabase email_queue table
# Status should change from 'pending' → 'sent'

# Check email inbox
# Should receive email
```

**Test 3: Retry Logic (failure simulation)**
```bash
# Temporarily break Resend API key in .env.local
RESEND_API_KEY=invalid_key

# Trigger email job
# Check email_queue: retry_count should increment

# Call worker 3 times
curl ... (3x)

# Check email_queue: status should change to 'failed' after 3 attempts
# Check errors table: should have entry
```

---

### Step 7: Deploy to Production (15 min)

```bash
# Commit changes
git add .
git commit -m "feat: async email queue with retry logic"
git push origin main

# Add Vercel env var
vercel env add CRON_SECRET $(openssl rand -base64 32) production

# Deploy
vercel --prod

# Verify cron job is configured
vercel inspect --prod
# Look for "Cron Jobs: 1 configured"
```

---

### Step 8: Monitor & Verify (30 min)

**Check 1: Cron Execution Logs**
```bash
vercel logs --follow
# Look for: "Email queue processor started" every 1 minute
```

**Check 2: Supabase Email Queue Status**
```sql
-- Check queue health
SELECT 
  status,
  COUNT(*) as count,
  AVG(retry_count) as avg_retries
FROM email_queue
GROUP BY status;

-- Expected:
-- status='sent': 95%+
-- status='pending': < 5%
-- status='failed': < 1%
```

**Check 3: End-to-End Purchase Test**
```bash
# Make real purchase on production
# 1. Go to https://your-app.vercel.app/tickets
# 2. Buy ticket (4242 4242 4242 4242)
# 3. Check Supabase tickets table (should insert immediately)
# 4. Check Supabase email_queue table (status='pending')
# 5. Wait 1 minute (cron runs)
# 6. Check email_queue (status should change to 'sent')
# 7. Check email inbox (should receive within 2 minutes)
```

---

## 🎯 Success Criteria

- [ ] Webhook responds in < 3 seconds (down from 5-11s)
- [ ] Email queue table created and indexed
- [ ] Webhook inserts jobs to email_queue (no blocking)
- [ ] Cron job processes 10 emails/minute
- [ ] Email delivery rate > 95% (up from 70-80%)
- [ ] Failed emails retry 3 times before manual intervention
- [ ] All failures logged to errors table
- [ ] Zero customer-facing failures (ticket always saved)

---

## 🔍 Monitoring Queries

**Daily Health Check:**
```sql
-- Email delivery rate (last 24 hours)
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM email_queue
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Retry distribution
SELECT 
  retry_count,
  COUNT(*) as count
FROM email_queue
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY retry_count
ORDER BY retry_count;

-- Failed jobs (need manual intervention)
SELECT 
  ticket_id,
  recipient_email,
  last_error,
  retry_count,
  created_at
FROM email_queue
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

---

## 🚨 Troubleshooting

### Issue: Cron not running
**Check:**
```bash
vercel inspect --prod
# Look for "Cron Jobs: 1 configured"
```
**Fix:** Ensure `vercel.json` has `crons` section and redeploy.

### Issue: Worker returns 401 Unauthorized
**Check:** `CRON_SECRET` env var matches in `.env.local` and Vercel.
**Fix:**
```bash
vercel env rm CRON_SECRET production
vercel env add CRON_SECRET $(openssl rand -base64 32) production
vercel --prod
```

### Issue: Emails stuck in 'pending'
**Check:** Worker logs for errors.
**Manual Fix:**
```bash
# Force process queue
curl -X POST https://your-app.vercel.app/api/process-email-queue \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Issue: High retry_count (emails failing repeatedly)
**Check:** Resend API key validity.
**Fix:** Regenerate Resend API key and update Vercel env vars.

---

## 📊 Expected Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Webhook Response Time | 5-11s | 1-3s | **60-70% faster** |
| Email Delivery Rate | 70-80% | 95%+ | **+15-25%** |
| Manual Intervention | 10-15% | < 1% | **90% reduction** |
| Customer-Facing Failures | 10-15% | 0% | **100% elimination** |
| Webhook Timeout Rate | 5-10% | < 1% | **90% reduction** |

---

## 🎉 Next Steps After Implementation

### Week 2: QR Storage (Fix #2)
- Upload QR codes to Supabase Storage
- Store public URLs (not base64)
- Reduces email size by 80%

### Week 3: Multi-Item Support (Fix #4)
- Loop through quantities in webhook
- Create 1 DB row per ticket/parking
- Enable individual QR validation

### Week 4: Customer Portal (Fix #5)
- `/my-tickets` page (email lookup)
- Self-service ticket retrieval
- Reduces support burden by 50%

---

**Implementation Guide Complete**  
**Estimated Total Time:** 4-6 hours  
**Difficulty:** Medium (requires Vercel Cron + Supabase schema change)  
**Risk:** Low (backwards compatible, can rollback)  
**ROI:** **HIGH** (biggest single improvement to system reliability)

