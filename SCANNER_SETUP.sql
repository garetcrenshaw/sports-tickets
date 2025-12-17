-- =============================================
-- SCANNER SYSTEM DATABASE SETUP
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Add scanned_at column to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS scanned_by TEXT; -- Which PIN/scanner marked it

-- 2. Create scanner_pins table
-- Each PIN is tied to a specific event
CREATE TABLE IF NOT EXISTS scanner_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin TEXT NOT NULL UNIQUE,           -- 4-digit PIN (stored as text for leading zeros)
  event_id TEXT NOT NULL,             -- Which event this PIN can scan for
  event_name TEXT NOT NULL,           -- Display name for the event
  scanner_name TEXT,                  -- Optional: "Gate A", "VIP Entrance", etc.
  is_active BOOLEAN DEFAULT true,     -- Can disable PINs without deleting
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ            -- Track when PIN was last used
);

-- Create index for fast PIN lookups
CREATE INDEX IF NOT EXISTS idx_scanner_pins_pin ON scanner_pins(pin);
CREATE INDEX IF NOT EXISTS idx_scanner_pins_event ON scanner_pins(event_id);

-- 3. Create scan_logs table (audit trail)
CREATE TABLE IF NOT EXISTS scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT NOT NULL,            -- The ticket that was scanned
  scanner_pin TEXT NOT NULL,          -- Which PIN was used
  event_id TEXT NOT NULL,             -- Which event
  scan_result TEXT NOT NULL,          -- 'valid', 'already_used', 'invalid', 'wrong_event'
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  device_info TEXT                    -- Optional: browser/device info
);

-- Create index for scan history lookups
CREATE INDEX IF NOT EXISTS idx_scan_logs_ticket ON scan_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_event ON scan_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_time ON scan_logs(scanned_at);

-- =============================================
-- SAMPLE DATA - Create some test PINs
-- =============================================

-- Example: Create PINs for Event ID "1"
INSERT INTO scanner_pins (pin, event_id, event_name, scanner_name) VALUES
  ('1234', '1', 'Game Day Event', 'Main Gate'),
  ('5678', '1', 'Game Day Event', 'VIP Entrance'),
  ('9999', '1', 'Game Day Event', 'Staff Gate')
ON CONFLICT (pin) DO NOTHING;

-- Example: Create PIN for a different event
INSERT INTO scanner_pins (pin, event_id, event_name, scanner_name) VALUES
  ('4321', '2', 'Concert Night', 'Main Gate')
ON CONFLICT (pin) DO NOTHING;

-- =============================================
-- USEFUL QUERIES
-- =============================================

-- View all scanner PINs:
-- SELECT * FROM scanner_pins ORDER BY event_id, scanner_name;

-- View scan history for an event:
-- SELECT * FROM scan_logs WHERE event_id = '1' ORDER BY scanned_at DESC LIMIT 50;

-- Count scans by result type:
-- SELECT scan_result, COUNT(*) FROM scan_logs GROUP BY scan_result;

-- Find tickets scanned in last hour:
-- SELECT * FROM tickets WHERE scanned_at > NOW() - INTERVAL '1 hour';

