# 🧪 Local Testing Guide - Async Email Queue

## Prerequisites
- ✅ SQL executed in Supabase
- ✅ Webhook refactored
- ✅ Worker created
- ✅ CRON_SECRET added to .env.local
- ✅ Dev server running

---

## Test Flow Overview

```
User Purchase → Webhook → Queue Job → Worker → Send Email
     ↓            ↓           ↓          ↓          ↓
  Stripe      Insert to    Status=     Process    Email
  Checkout   email_queue   'pending'    queue     sent
```

---

## 🎯 Test 1: Manual Job Insertion (Fastest Test)

### Step 1: Insert a test job directly to Supabase

Go to Supabase SQL Editor and run:

```sql
-- Insert a test email job
INSERT INTO email_queue (
  ticket_id,
  recipient_email,
  recipient_name,
  qr_code_data,
  event_id,
  status,
  retry_count
) VALUES (
  'test_manual_' || NOW()::TEXT,
  'YOUR_EMAIL@example.com',  -- ⚠️ CHANGE THIS
  'Manual Test User',
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'test_event_1',
  'pending',
  0
) RETURNING *;
```

**Expected Result:** One row inserted with `status='pending'`

### Step 2: Manually trigger the worker

Open terminal and run:

```bash
# Export CRON_SECRET to environment (safer method)
export CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d'=' -f2-)

# Call worker endpoint (port 3000 for dev server)
curl -X POST http://localhost:3000/api/process-email-queue \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Expected Response:**
```json
{
  "success": true,
  "processed": 1,
  "success_count": 1,
  "failure_count": 0,
  "duration_ms": 1234
}
```

### Step 3: Verify in Supabase

```sql
-- Check if job was marked as 'sent'
SELECT 
  ticket_id,
  recipient_email,
  status,
  retry_count,
  processed_at
FROM email_queue
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Result:** 
- `status` changed from `'pending'` → `'sent'`
- `processed_at` timestamp set

### Step 4: Check your email inbox

✅ You should receive an email with:
- Subject: "Your Gameday Tickets + Parking are Ready!"
- A QR code image
- Event details

---

## 🎯 Test 2: End-to-End Purchase Flow

### Step 1: Start dev server

```bash
npm run dev
```

This starts:
- Vite frontend (port 3002)
- Vercel functions (port 3001)

### Step 2: Open Stripe CLI in new terminal

```bash
stripe listen --forward-to localhost:3001/api/stripe-webhook
```

**Look for:** `Ready! Your webhook signing secret is whsec_...`

### Step 3: Make a test purchase

1. Open: http://localhost:3002
2. Click "Buy Tickets Here"
3. Fill form:
   - Name: Test User
   - Email: YOUR_EMAIL@example.com
   - Admission: 1
   - Parking: 1
4. Click "Complete Purchase"
5. Use test card: `4242 4242 4242 4242`
6. Complete payment

### Step 4: Watch the logs

**Terminal 1 (Dev Server):** Look for:
```
POST /api/stripe-webhook
✅ Event verified: checkout.session.completed
✅ Ticket inserted successfully
✅ Email queued successfully
```

**Terminal 2 (Stripe CLI):** Look for:
```
→ checkout.session.completed [evt_xxxxx]
← [200] POST localhost:3001/api/stripe-webhook
```

### Step 5: Verify queue in Supabase

```sql
-- Check pending job
SELECT * FROM email_queue 
WHERE status = 'pending' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected:** One row with your ticket_id, status='pending'

### Step 6: Manually trigger worker (simulates cron)

```bash
# Export CRON_SECRET to environment
export CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d'=' -f2-)

# Trigger worker (port 3000 for dev server)
curl -X POST http://localhost:3000/api/process-email-queue \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Step 7: Verify email sent

```sql
-- Check job status changed
SELECT 
  ticket_id,
  status,
  retry_count,
  processed_at
FROM email_queue 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected:** `status='sent'`, `processed_at` timestamp

### Step 8: Check email inbox

✅ Email should arrive within 30 seconds

---

## 🎯 Test 3: Worker Error Handling

### Test retry logic by using invalid Resend API key

### Step 1: Temporarily break Resend API key

Edit `.env.local`:
```bash
RESEND_API_KEY=invalid_key_for_testing
```

### Step 2: Insert test job

```sql
INSERT INTO email_queue (
  ticket_id,
  recipient_email,
  recipient_name,
  qr_code_data,
  event_id,
  status
) VALUES (
  'test_retry_' || NOW()::TEXT,
  'test@example.com',
  'Retry Test',
  'data:image/png;base64,test',
  'test_event_1',
  'pending'
);
```

### Step 3: Call worker (should fail)

```bash
# Export CRON_SECRET
export CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d'=' -f2-)

# Call worker (port 3000)
curl -X POST http://localhost:3000/api/process-email-queue \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Expected:** `"failure_count": 1`

### Step 4: Check retry count

```sql
SELECT 
  ticket_id,
  status,
  retry_count,
  last_error
FROM email_queue 
WHERE ticket_id LIKE 'test_retry_%'
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected:**
- `status='pending'` (will retry)
- `retry_count=1`
- `last_error` contains error message

### Step 5: Call worker 2 more times

```bash
# Retry 2
curl -X POST http://localhost:3000/api/process-email-queue \
  -H "Authorization: Bearer $CRON_SECRET"

# Retry 3 (final attempt)
curl -X POST http://localhost:3000/api/process-email-queue \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Step 6: Verify marked as failed

```sql
SELECT 
  ticket_id,
  status,
  retry_count,
  last_error
FROM email_queue 
WHERE ticket_id LIKE 'test_retry_%';
```

**Expected:**
- `status='failed'` (after 3 attempts)
- `retry_count=3`

### Step 7: Check errors table

```sql
SELECT * FROM errors 
WHERE event_id LIKE 'test_retry_%'
ORDER BY timestamp DESC 
LIMIT 1;
```

**Expected:** Error logged for manual intervention

### Step 8: Restore Resend API key

Edit `.env.local` and restore the correct key.

---

## 📊 Monitoring Queries

### Queue Health Dashboard

```sql
-- Overall queue status
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM email_queue
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Expected: sent=95%+, pending=<5%, failed=<1%
```

### Recent Jobs

```sql
-- Last 10 jobs
SELECT 
  ticket_id,
  recipient_email,
  status,
  retry_count,
  created_at,
  processed_at
FROM email_queue
ORDER BY created_at DESC
LIMIT 10;
```

### Failed Jobs (Need Attention)

```sql
-- Failed jobs in last 7 days
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

## ✅ Success Criteria

After testing, you should see:

- ✅ Webhook responds in <3 seconds (check dev server logs)
- ✅ Jobs inserted to email_queue with status='pending'
- ✅ Worker processes jobs successfully
- ✅ Jobs marked as 'sent' after processing
- ✅ Emails received in inbox
- ✅ Retry logic works (3 attempts before failed)
- ✅ Failed jobs logged to errors table

---

## 🐛 Troubleshooting

### Issue: Worker returns 401 Unauthorized

**Check:** CRON_SECRET matches in .env.local
**Fix:**
```bash
# Verify CRON_SECRET
grep CRON_SECRET .env.local

# Export and test with correct secret
export CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d'=' -f2-)
curl -X POST http://localhost:3000/api/process-email-queue \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Issue: Worker returns 500 error

**Check:** Worker logs for error details
**Common causes:**
- Missing RESEND_API_KEY
- Missing SUPABASE_URL
- Database connection failed

### Issue: Email not received

**Check:**
1. Resend dashboard: https://resend.com/emails
2. Look for recent sends
3. Check spam/junk folder
4. Verify email address in email_queue table

### Issue: Jobs stuck in 'pending'

**Check:**
1. Worker executing? (call manually with curl)
2. RESEND_API_KEY valid?
3. Check last_error column for clues

---

## 🚀 Ready for Production?

If all tests pass, you're ready to deploy!

Next: See DEPLOYMENT_GUIDE.md for production deployment steps.

