-- Update SoCal Cup Events to All-In Pricing: $18.20
-- Customer sees one price (no tax breakdown shown)
-- Business gets $15.00 net, Platform gets $0.97 net

-- Step 1: Update prices
UPDATE events 
SET 
  admission_price = 18.20,
  parking_price = 18.20
WHERE 
  event_name LIKE '%SoCal Cup%'
  OR event_name LIKE '%socal cup%';

-- Step 2: Verify the price update
SELECT 
  id,
  event_name,
  admission_price,
  parking_price,
  stripe_admission_price_id,
  stripe_parking_price_id
FROM events
WHERE 
  event_name LIKE '%SoCal Cup%'
  OR event_name LIKE '%socal cup%'
ORDER BY id;

-- Step 3: Update Stripe Price IDs
-- IMPORTANT: Replace 'price_YOUR_ADMISSION_ID' and 'price_YOUR_PARKING_ID' 
-- with your actual Price IDs from Stripe Dashboard
-- 
-- UPDATE events 
-- SET 
--   stripe_admission_price_id = 'price_YOUR_ADMISSION_ID',
--   stripe_parking_price_id = 'price_YOUR_PARKING_ID'
-- WHERE 
--   event_name LIKE '%SoCal Cup%'
--   OR event_name LIKE '%socal cup%';

-- Step 4: Final verification
-- SELECT 
--   id,
--   event_name,
--   admission_price,
--   parking_price,
--   stripe_admission_price_id,
--   stripe_parking_price_id
-- FROM events
-- WHERE 
--   event_name LIKE '%SoCal Cup%'
--   OR event_name LIKE '%socal cup%'
-- ORDER BY id;

