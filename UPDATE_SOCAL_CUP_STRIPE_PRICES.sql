-- ═══════════════════════════════════════════════════════════════════════════
-- UPDATE SOCAL CUP EVENTS WITH STRIPE PRICE IDs
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- INSTRUCTIONS:
-- 1. Create products in Stripe Dashboard (see STRIPE_SETUP_WALKTHROUGH.md)
-- 2. Copy your Price IDs from Stripe
-- 3. Replace 'price_YOUR_ADMISSION_ID' and 'price_YOUR_PARKING_ID' below
-- 4. Run this SQL in Supabase
--
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE events 
SET 
  admission_price = 17.00,
  parking_price = 17.00,
  stripe_admission_price_id = 'price_YOUR_ADMISSION_ID_HERE',
  stripe_parking_price_id = 'price_YOUR_PARKING_ID_HERE'
WHERE event_name LIKE '%SoCal Cup%';

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFY THE UPDATE
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
  id,
  event_name,
  event_date,
  admission_price,
  parking_price,
  stripe_admission_price_id,
  stripe_parking_price_id
FROM events
WHERE event_name LIKE '%SoCal Cup%'
ORDER BY event_date;

