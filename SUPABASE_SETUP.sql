-- ================================================================
-- SUPABASE DATABASE SETUP FOR SPORTS TICKETS
-- Run this in Supabase SQL Editor
-- ================================================================

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT UNIQUE NOT NULL,
  event_id TEXT NOT NULL,
  ticket_type TEXT NOT NULL DEFAULT 'General Admission',
  purchaser_name TEXT,
  purchaser_email TEXT,
  qr_code_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'purchased',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tickets_ticket_id ON tickets(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_email ON tickets(purchaser_email);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- Create parking_passes table mirroring tickets
CREATE TABLE IF NOT EXISTS parking_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT UNIQUE NOT NULL,
  event_id TEXT NOT NULL,
  ticket_type TEXT NOT NULL DEFAULT 'parking',
  purchaser_name TEXT,
  purchaser_email TEXT,
  qr_code_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'purchased',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_parking_ticket_id ON parking_passes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_parking_status ON parking_passes(status);

-- ================================================================
-- STORAGE BUCKET POLICIES
-- The webhook auto-creates the "qrcodes" bucket if it does not exist,
-- but these policies ensure public read + service-role write access.
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
  status
) VALUES (
  'test-ticket-001',
  '1',
  'Gameday Tickets',
  'Test Fan',
  'test@example.com',
  'https://example.com/qr/test.png',
  'purchased'
) RETURNING *;

INSERT INTO parking_passes (
  ticket_id,
  event_id,
  ticket_type,
  purchaser_name,
  purchaser_email,
  qr_code_url,
  status
) VALUES (
  'test-parking-001',
  '1',
  'Gameday Parking',
  'Test Driver',
  'driver@example.com',
  'https://example.com/qr/parking.png',
  'purchased'
) RETURNING *;

-- Clean up test data
DELETE FROM tickets WHERE ticket_id = 'test-ticket-001';
DELETE FROM parking_passes WHERE ticket_id = 'test-parking-001';

-- ================================================================
-- DONE! ✅
-- ================================================================
