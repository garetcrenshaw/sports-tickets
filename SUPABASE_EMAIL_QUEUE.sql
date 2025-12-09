-- ================================================================
-- EMAIL QUEUE TABLE FOR ASYNC DELIVERY
-- Purpose: Decouple email sending from webhook processing
-- Impact: Reduces webhook response time from 5-11s to 1-3s
-- ================================================================
-- 
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT_ID/editor
--
-- Expected result: "Success. No rows returned"
-- ================================================================

-- Create email queue table
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  qr_code_data TEXT NOT NULL,  -- Base64 data URL or storage URL
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

-- Add constraint to prevent duplicate emails for same ticket
-- This ensures if webhook is called twice (Stripe retry), 
-- we don't queue the same email twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_queue_unique_ticket 
  ON email_queue(ticket_id) 
  WHERE status IN ('pending', 'sent');

-- ================================================================
-- VERIFICATION QUERIES (run these to confirm setup)
-- ================================================================

-- 1. Verify table exists and has correct columns
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'email_queue'
ORDER BY ordinal_position;

-- Expected columns:
-- id, ticket_id, recipient_email, recipient_name, qr_code_data,
-- event_id, status, retry_count, last_error, created_at, processed_at

-- 2. Verify indexes exist
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename = 'email_queue';

-- Expected indexes:
-- email_queue_pkey (primary key on id)
-- idx_email_queue_status
-- idx_email_queue_created
-- idx_email_queue_ticket
-- idx_email_queue_unique_ticket

-- 3. Test insert (optional - will be removed)
INSERT INTO email_queue (
  ticket_id,
  recipient_email,
  recipient_name,
  qr_code_data,
  event_id,
  status
) VALUES (
  'test_ticket_001',
  'test@example.com',
  'Test User',
  'data:image/png;base64,test',
  '1',
  'pending'
) RETURNING *;

-- Should return the inserted row with generated id and timestamps

-- 4. Clean up test data
DELETE FROM email_queue WHERE ticket_id = 'test_ticket_001';

-- ================================================================
-- HEALTH MONITORING QUERIES (use these after deployment)
-- ================================================================

-- Daily email delivery rate
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM email_queue
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Jobs needing attention (failed after 3 retries)
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

-- Retry distribution (shows if retries are working)
SELECT 
  retry_count,
  COUNT(*) as count
FROM email_queue
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY retry_count
ORDER BY retry_count;

-- ================================================================
-- DONE! ✅
-- Next steps:
-- 1. Run the CREATE TABLE and INDEX statements above
-- 2. Run verification queries to confirm setup
-- 3. Proceed to Step 2: Update webhook code
-- ================================================================

