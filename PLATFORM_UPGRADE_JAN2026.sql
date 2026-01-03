-- ═══════════════════════════════════════════════════════════════════════════
-- PLATFORM UPGRADE - January 2026
-- All-In Pricing + SMS Ticket Delivery
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. ADD PHONE COLUMN TO TICKETS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS buyer_phone TEXT;

-- Index for phone lookups
CREATE INDEX IF NOT EXISTS idx_tickets_buyer_phone 
ON tickets(buyer_phone);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. UPDATE EVENTS TO ALL-IN PRICING ($17)
-- ═══════════════════════════════════════════════════════════════════════════

-- Update all SoCal Cup events to $17 all-in pricing
UPDATE events 
SET 
  admission_price = 17.00,
  parking_price = 17.00
WHERE event_name LIKE '%SoCal Cup%';

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. STRIPE PRICE IDS - Update after creating in Stripe Dashboard
-- ═══════════════════════════════════════════════════════════════════════════

-- After creating $17 products in Stripe, run these updates:
-- 
-- UPDATE events 
-- SET 
--   stripe_admission_price_id = 'price_XXXXXXXX',  -- $17 admission
--   stripe_parking_price_id = 'price_YYYYYYYY'     -- $17 parking
-- WHERE event_name LIKE '%SoCal Cup%';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. VERIFY CHANGES
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
  event_name,
  admission_price,
  parking_price,
  stripe_admission_price_id,
  stripe_parking_price_id
FROM events
WHERE event_name LIKE '%SoCal Cup%'
ORDER BY event_date;

