-- Update SoCal Cup Events to: $18 Admission + $19 Parking
-- All-in pricing (tax included, no tax breakdown shown)
-- Business gets $30.49 net total, Platform gets $2.00 net total

-- Step 1: Update prices
UPDATE events 
SET 
  admission_price = 18.00,
  parking_price = 19.00
WHERE 
  event_name LIKE '%SoCal Cup%'
  OR event_name LIKE '%socal cup%';

-- Step 2: Update Stripe Price IDs
UPDATE events 
SET 
  stripe_admission_price_id = 'price_1Slck6RzFa5vaG1D1Lm1Ro40',
  stripe_parking_price_id = 'price_1SldoCRzFa5vaG1DxSlTNgaS'
WHERE 
  event_name LIKE '%SoCal Cup%'
  OR event_name LIKE '%socal cup%';

-- Step 3: Verify the update
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

