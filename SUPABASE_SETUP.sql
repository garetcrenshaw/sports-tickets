-- ================================================================
-- SUPABASE DATABASE SETUP FOR SPORTS TICKETS
-- Run this in Supabase SQL Editor
-- ================================================================

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT UNIQUE NOT NULL,
  event_id TEXT NOT NULL,
  ticket_type TEXT NOT NULL,
  purchaser_name TEXT NOT NULL,
  purchaser_email TEXT NOT NULL,
  qr_code_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'valid',
  stripe_session_id TEXT,
  price_paid_cents INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  validated_by TEXT
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_id ON tickets(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_email ON tickets(purchaser_email);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at DESC);

-- Add comments
COMMENT ON TABLE tickets IS 'Stores individual ticket records with unique QR codes';
COMMENT ON COLUMN tickets.ticket_id IS 'Unique identifier for QR code validation';
COMMENT ON COLUMN tickets.status IS 'valid, used, or cancelled';

-- ================================================================
-- STORAGE BUCKET POLICIES
-- Create bucket "qrcodes" in Storage UI first, then run this:
-- ================================================================

-- Allow public read access to qrcodes bucket
CREATE POLICY "Public QR codes are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'qrcodes');

-- Allow service role to upload (for webhook function)
CREATE POLICY "Service role can upload QR codes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'qrcodes' AND auth.role() = 'service_role');

-- Allow service role to update
CREATE POLICY "Service role can update QR codes"
ON storage.objects FOR UPDATE
USING (bucket_id = 'qrcodes' AND auth.role() = 'service_role');

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Check table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'tickets'
ORDER BY ordinal_position;

-- Check if indexes exist
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename = 'tickets';

-- Test insert (should work)
INSERT INTO tickets (
  ticket_id,
  event_id,
  ticket_type,
  purchaser_name,
  purchaser_email,
  qr_code_url,
  status,
  price_paid_cents
) VALUES (
  'test-ticket-001',
  '1',
  'General Admission',
  'Test User',
  'test@example.com',
  'https://example.com/qr/test.png',
  'valid',
  1500
) RETURNING *;

-- Clean up test data
DELETE FROM tickets WHERE ticket_id = 'test-ticket-001';

-- ================================================================
-- DONE! ✅
-- ================================================================
