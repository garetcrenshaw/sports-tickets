-- Update SoCal Cup Events to All-In Pricing: $18.24
-- Customer sees one price (no tax breakdown shown)
-- Business gets $15.00 net, Platform gets $1.05 net

UPDATE events 
SET 
  admission_price = 18.24,
  parking_price = 18.24
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

