-- ================================================================
-- PHASE 2: BUSINESS INTELLIGENCE SETUP
-- Option A: Simple (Self-Hosted Events)
-- Run this in Supabase SQL Editor
-- ================================================================

-- Step 1: Create Events Table (Master Registry)
-- ================================================================

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,                      -- "1", "2", "3"
  event_name TEXT NOT NULL,                 -- "Gameday Empire Showcase"
  event_slug TEXT UNIQUE NOT NULL,          -- "gameday-empire-showcase"
  event_date DATE NOT NULL,                 -- 2025-12-28
  event_time TIME,                          -- 19:30:00
  venue_name TEXT,                          -- "Downtown Arena"
  venue_city TEXT,                          -- "Los Angeles, CA"
  venue_address TEXT,                       -- Full address (optional)
  category TEXT,                            -- "Basketball", "Sports"
  
  -- Product Configuration
  has_admission BOOLEAN DEFAULT false,
  admission_price DECIMAL(10,2),            -- 15.00
  stripe_admission_price_id TEXT,           -- price_XXX
  admission_quantity_limit INTEGER DEFAULT 10,
  
  has_parking BOOLEAN DEFAULT false,
  parking_price DECIMAL(10,2),              -- 15.00
  stripe_parking_price_id TEXT,             -- price_XXX
  parking_quantity_limit INTEGER DEFAULT 4,
  
  -- Scanner Security
  scanner_pin TEXT NOT NULL UNIQUE,         -- "1234" (unique per event)
  
  -- Owner Information
  owner_email TEXT NOT NULL DEFAULT 'garetcrenshaw@gmail.com',
  owner_name TEXT,
  
  -- Status & Metadata
  status TEXT DEFAULT 'active',             -- active, ended, cancelled, draft
  notes TEXT,                               -- Internal notes
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_scanner_pin ON events(scanner_pin);

-- Step 2: Insert Your 3 Events
-- ================================================================

INSERT INTO events (
  id, event_name, event_slug, event_date, event_time,
  venue_name, venue_city, category,
  has_admission, admission_price, stripe_admission_price_id, admission_quantity_limit,
  has_parking, parking_price, stripe_parking_price_id, parking_quantity_limit,
  scanner_pin, owner_email, status
) VALUES
(
  '1',
  'Gameday Empire Showcase',
  'gameday-empire-showcase',
  '2025-12-28',
  '19:30:00',
  'Downtown Arena',
  'Los Angeles, CA',
  'Basketball',
  true,  -- has admission
  15.00,
  'price_1SZlOQRzFa5vaG1D2lVhytrV',  -- Event 1 Admission Price ID
  10,
  true,  -- has parking
  15.00,
  'price_1SZlOQRzFa5vaG1D8nscuSUH',  -- Event 1 Parking Price ID
  4,
  '1234',  -- Scanner PIN for Event 1
  'garetcrenshaw@gmail.com',
  'active'
),
(
  '2',
  'Sportsplex Showdown',
  'sportsplex-showdown',
  '2026-01-05',
  '18:00:00',
  'Sportsplex Center',
  'Los Angeles, CA',
  'Sports',
  false,  -- NO admission
  0,
  NULL,
  0,
  true,  -- parking only
  15.00,
  'price_1SfsiJRzFa5vaG1DgAUFvTSB',  -- Your Sportsplex Showdown Parking Price ID
  4,
  '5678',  -- Scanner PIN for Event 2
  'garetcrenshaw@gmail.com',
  'active'
),
(
  '3',
  'Sportsplex Event',
  'sportsplex-event',
  '2026-01-11',
  '16:00:00',
  'Sportsplex Center',
  'Los Angeles, CA',
  'Sports',
  true,  -- admission only
  15.00,
  'price_1SfsijRzFa5vaG1DU0iBJWL9',  -- Your Sportsplex Event Admission Price ID
  10,
  false,  -- NO parking
  0,
  NULL,
  0,
  '9012',  -- Scanner PIN for Event 3
  'garetcrenshaw@gmail.com',
  'active'
);

-- Step 3: Update Tickets Table (Add Event Metadata for Reporting)
-- ================================================================

-- Add columns to existing tickets table for easier reporting
DO $$
BEGIN
  -- Add event_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'event_name'
  ) THEN
    ALTER TABLE tickets ADD COLUMN event_name TEXT;
  END IF;

  -- Add event_date if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'event_date'
  ) THEN
    ALTER TABLE tickets ADD COLUMN event_date DATE;
  END IF;

  -- Add venue_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'venue_name'
  ) THEN
    ALTER TABLE tickets ADD COLUMN venue_name TEXT;
  END IF;
END $$;

-- Create index for reporting queries
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);

-- Step 4: Create Function to Auto-Populate Event Metadata on Ticket Insert
-- ================================================================

CREATE OR REPLACE FUNCTION populate_ticket_event_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Look up event details and populate ticket
  UPDATE tickets SET
    event_name = e.event_name,
    event_date = e.event_date,
    venue_name = e.venue_name
  FROM events e
  WHERE tickets.id = NEW.id 
    AND e.id = NEW.event_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-populate on insert
DROP TRIGGER IF EXISTS trigger_populate_ticket_metadata ON tickets;
CREATE TRIGGER trigger_populate_ticket_metadata
AFTER INSERT ON tickets
FOR EACH ROW
EXECUTE FUNCTION populate_ticket_event_metadata();

-- Step 5: Backfill Existing Tickets with Event Metadata
-- ================================================================

UPDATE tickets t
SET 
  event_name = e.event_name,
  event_date = e.event_date,
  venue_name = e.venue_name
FROM events e
WHERE t.event_id = e.id
  AND t.event_name IS NULL;

-- Step 6: Create Views for Easy Reporting
-- ================================================================

-- View: Revenue by Event
CREATE OR REPLACE VIEW revenue_by_event AS
SELECT 
  e.id as event_id,
  e.event_name,
  e.event_date,
  e.venue_name,
  e.category,
  COUNT(DISTINCT t.id) as total_tickets_sold,
  COUNT(CASE WHEN t.ticket_type LIKE '%Admission%' THEN 1 END) as admission_tickets,
  COUNT(CASE WHEN t.ticket_type LIKE '%Parking%' THEN 1 END) as parking_tickets,
  SUM(
    CASE 
      WHEN t.ticket_type LIKE '%Admission%' THEN e.admission_price
      WHEN t.ticket_type LIKE '%Parking%' THEN e.parking_price
      ELSE 0
    END
  ) as total_revenue,
  COUNT(CASE WHEN t.status = 'used' THEN 1 END) as scanned_tickets,
  CASE 
    WHEN COUNT(t.id) > 0 THEN
      ROUND(COUNT(CASE WHEN t.status = 'used' THEN 1 END)::NUMERIC / COUNT(t.id) * 100, 2)
    ELSE 0
  END as scan_rate_percent,
  e.status as event_status
FROM events e
LEFT JOIN tickets t ON t.event_id = e.id
GROUP BY e.id, e.event_name, e.event_date, e.venue_name, e.category, e.admission_price, e.parking_price, e.status
ORDER BY e.event_date DESC;

-- View: Daily Sales Summary
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT 
  t.created_at::DATE as sale_date,
  e.event_name,
  e.event_id,
  t.ticket_type,
  COUNT(*) as quantity,
  SUM(
    CASE 
      WHEN t.ticket_type LIKE '%Admission%' THEN e.admission_price
      WHEN t.ticket_type LIKE '%Parking%' THEN e.parking_price
      ELSE 0
    END
  ) as revenue
FROM tickets t
JOIN events e ON t.event_id = e.id
GROUP BY t.created_at::DATE, e.event_name, e.event_id, t.ticket_type, e.admission_price, e.parking_price
ORDER BY sale_date DESC, e.event_name;

-- View: Event Performance Dashboard
CREATE OR REPLACE VIEW event_performance_dashboard AS
SELECT 
  e.event_name,
  e.event_date,
  e.venue_name,
  e.scanner_pin,
  e.status as event_status,
  COUNT(DISTINCT t.id) as total_tickets,
  SUM(
    CASE 
      WHEN t.ticket_type LIKE '%Admission%' THEN e.admission_price
      WHEN t.ticket_type LIKE '%Parking%' THEN e.parking_price
      ELSE 0
    END
  ) as total_revenue,
  COUNT(CASE WHEN t.status = 'used' THEN 1 END) as tickets_scanned,
  COUNT(CASE WHEN t.status = 'active' THEN 1 END) as tickets_unused,
  MIN(t.created_at) as first_sale,
  MAX(t.created_at) as last_sale,
  COUNT(DISTINCT t.buyer_email) as unique_customers,
  CASE 
    WHEN COUNT(t.id) > 0 THEN
      ROUND(COUNT(CASE WHEN t.status = 'used' THEN 1 END)::NUMERIC / COUNT(t.id) * 100, 2)
    ELSE 0
  END as scan_rate
FROM events e
LEFT JOIN tickets t ON t.event_id = e.id
GROUP BY e.id, e.event_name, e.event_date, e.venue_name, e.scanner_pin, e.status, e.admission_price, e.parking_price
ORDER BY e.event_date DESC;

-- ================================================================
-- VERIFICATION QUERIES (Run these to verify setup)
-- ================================================================

-- Check events table
SELECT * FROM events ORDER BY event_date;

-- Check tickets with event metadata
SELECT 
  ticket_id, 
  event_id, 
  event_name, 
  event_date, 
  ticket_type, 
  status 
FROM tickets 
LIMIT 10;

-- Check revenue by event
SELECT * FROM revenue_by_event;

-- Check event performance
SELECT * FROM event_performance_dashboard;

-- ================================================================
-- SUCCESS! Your events table is now set up!
-- 
-- Next Steps:
-- 1. Update Event 1 Price IDs with your actual GA_PRICE_ID and PARKING_PRICE_ID
-- 2. Test scanner PIN validation (coming next)
-- 3. Set up automated daily reports (coming next)
-- ================================================================

