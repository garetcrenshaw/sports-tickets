-- Update SoCal Cup Events to $17.00 (tax shown separately)
-- This ensures business gets $15.00 net and platform gets $1.21 net
-- Customer pays $17.00 + $1.47 tax = $18.47 total

UPDATE events 
SET 
  admission_price = 17.00,
  parking_price = 17.00
WHERE 
  event_name LIKE '%SoCal Cup%'
  OR event_name LIKE '%socal cup%';

-- Verify the update
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

