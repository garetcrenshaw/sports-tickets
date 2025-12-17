-- ================================================================
-- SUPABASE DATABASE SETUP FOR SPORTS TICKETS
-- Run this in Supabase SQL Editor
-- ================================================================

-- Create tickets table
-- Note: The webhook creates tickets with unique IDs in format: {session_id}-{ticket_type}-{index}
-- e.g., cs_abc123-Admission_Ticket-1, cs_abc123-Parking_Pass-1
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT NOT NULL,  -- Original Stripe checkout session ID
  ticket_id TEXT UNIQUE NOT NULL,   -- Unique ID: {session_id}-{type}-{index}
  event_id TEXT NOT NULL,
  ticket_type TEXT NOT NULL DEFAULT 'General Admission',  -- e.g., 'Admission Ticket', 'Parking Pass'
  buyer_name TEXT,
  buyer_email TEXT,
  qr_data TEXT NOT NULL,  -- Base64 encoded QR code (without data URL prefix)
  status TEXT NOT NULL DEFAULT 'active',  -- active, validated, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ
);

-- Add stripe_session_id column if upgrading from older schema
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
-- Update column names if needed (for backward compatibility)
-- ALTER TABLE tickets RENAME COLUMN purchaser_name TO buyer_name;
-- ALTER TABLE tickets RENAME COLUMN purchaser_email TO buyer_email;
-- ALTER TABLE tickets RENAME COLUMN qr_code_url TO qr_data;
-- ALTER TABLE tickets RENAME COLUMN used_at TO validated_at;

CREATE INDEX IF NOT EXISTS idx_tickets_ticket_id ON tickets(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_session_id ON tickets(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_tickets_email ON tickets(buyer_email);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_type ON tickets(ticket_type);

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
  stripe_session_id,
  ticket_id,
  event_id,
  ticket_type,
  buyer_name,
  buyer_email,
  qr_data,
  status
) VALUES (
  'cs_test_session_001',
  'cs_test_session_001-Admission_Ticket-1',
  '1',
  'Admission Ticket',
  'Test Fan',
  'test@example.com',
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'active'
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
DELETE FROM tickets WHERE ticket_id LIKE 'cs_test_session_001%';
DELETE FROM parking_passes WHERE ticket_id LIKE 'test-parking%';

-- ================================================================
-- DONE! ✅
-- ================================================================
