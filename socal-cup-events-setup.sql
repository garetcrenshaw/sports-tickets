-- ================================================================
-- SoCal Cup Events Setup - 2026 Season
-- Run this in Supabase SQL Editor
-- ================================================================
-- 
-- This script inserts all 16 SoCal Cup volleyball events for 2026
-- All events are at AIM Sportsplex, Seal Beach, CA
-- Each event has General Admission and Parking tickets
-- 
-- NOTE: You'll need to create Stripe Price IDs for each event's
-- admission and parking tickets and update the price_id fields below
-- ================================================================

-- Insert SoCal Cup Events (IDs 4-19, since 1-3 are already used)
INSERT INTO events (
  id, event_name, event_slug, event_date, event_time,
  venue_name, venue_city, venue_address, category,
  has_admission, admission_price, stripe_admission_price_id, admission_quantity_limit,
  has_parking, parking_price, stripe_parking_price_id, parking_quantity_limit,
  scanner_pin, owner_email, status
) VALUES
-- Event 4: 12-18 FRIENDLY 1/10
(
  '4',
  'SoCal Cup: 12-18 Friendly',
  'socal-cup-12-18-friendly-1-10',
  '2026-01-10',
  NULL, -- Time TBD
  'AIM Sportsplex',
  'Seal Beach, CA',
  '1709 Apollo Court, Seal Beach, CA 90740',
  'Volleyball',
  true,
  15.00, -- TODO: Update with actual price
  NULL, -- TODO: Add Stripe Admission Price ID
  10,
  true,
  15.00, -- TODO: Update with actual price
  NULL, -- TODO: Add Stripe Parking Price ID
  4,
  '4001', -- Scanner PIN
  'garetcrenshaw@gmail.com',
  'active'
),
-- Event 5: 14/13 TOURNEY 2 2/21
(
  '5',
  'SoCal Cup: 14/13 Tourney 2',
  'socal-cup-14-13-tourney-2-2-21',
  '2026-02-21',
  NULL,
  'AIM Sportsplex',
  'Seal Beach, CA',
  '1709 Apollo Court, Seal Beach, CA 90740',
  'Volleyball',
  true,
  15.00,
  NULL, -- TODO: Add Stripe Admission Price ID
  10,
  true,
  15.00,
  NULL, -- TODO: Add Stripe Parking Price ID
  4,
  '4002',
  'garetcrenshaw@gmail.com',
  'active'
),
-- Event 6: 12 TOURNEY 2 2/22
(
  '6',
  'SoCal Cup: 12 Tourney 2',
  'socal-cup-12-tourney-2-2-22',
  '2026-02-22',
  NULL,
  'AIM Sportsplex',
  'Seal Beach, CA',
  '1709 Apollo Court, Seal Beach, CA 90740',
  'Volleyball',
  true,
  15.00,
  NULL, -- TODO: Add Stripe Admission Price ID
  10,
  true,
  15.00,
  NULL, -- TODO: Add Stripe Parking Price ID
  4,
  '4003',
  'garetcrenshaw@gmail.com',
  'active'
),
-- Event 7: 14/13 TOURNEY 3 3/21
(
  '7',
  'SoCal Cup: 14/13 Tourney 3',
  'socal-cup-14-13-tourney-3-3-21',
  '2026-03-21',
  NULL,
  'AIM Sportsplex',
  'Seal Beach, CA',
  '1709 Apollo Court, Seal Beach, CA 90740',
  'Volleyball',
  true,
  15.00,
  NULL, -- TODO: Add Stripe Admission Price ID
  10,
  true,
  15.00,
  NULL, -- TODO: Add Stripe Parking Price ID
  4,
  '4004',
  'garetcrenshaw@gmail.com',
  'active'
),
-- Event 8: 12 TOURNEY 3 3/22
(
  '8',
  'SoCal Cup: 12 Tourney 3',
  'socal-cup-12-tourney-3-3-22',
  '2026-03-22',
  NULL,
  'AIM Sportsplex',
  'Seal Beach, CA',
  '1709 Apollo Court, Seal Beach, CA 90740',
  'Volleyball',
  true,
  15.00,
  NULL, -- TODO: Add Stripe Admission Price ID
  10,
  true,
  15.00,
  NULL, -- TODO: Add Stripe Parking Price ID
  4,
  '4005',
  'garetcrenshaw@gmail.com',
  'active'
),
-- Event 9: 14/13 TOURNEY 4 4/11
(
  '9',
  'SoCal Cup: 14/13 Tourney 4',
  'socal-cup-14-13-tourney-4-4-11',
  '2026-04-11',
  NULL,
  'AIM Sportsplex',
  'Seal Beach, CA',
  '1709 Apollo Court, Seal Beach, CA 90740',
  'Volleyball',
  true,
  15.00,
  NULL, -- TODO: Add Stripe Admission Price ID
  10,
  true,
  15.00,
  NULL, -- TODO: Add Stripe Parking Price ID
  4,
  '4006',
  'garetcrenshaw@gmail.com',
  'active'
),
-- Event 10: 12 TOURNEY 4 4/12
(
  '10',
  'SoCal Cup: 12 Tourney 4',
  'socal-cup-12-tourney-4-4-12',
  '2026-04-12',
  NULL,
  'AIM Sportsplex',
  'Seal Beach, CA',
  '1709 Apollo Court, Seal Beach, CA 90740',
  'Volleyball',
  true,
  15.00,
  NULL, -- TODO: Add Stripe Admission Price ID
  10,
  true,
  15.00,
  NULL, -- TODO: Add Stripe Parking Price ID
  4,
  '4007',
  'garetcrenshaw@gmail.com',
  'active'
),
-- Event 11: 14/13 TOURNEY 5 4/25
(
  '11',
  'SoCal Cup: 14/13 Tourney 5',
  'socal-cup-14-13-tourney-5-4-25',
  '2026-04-25',
  NULL,
  'AIM Sportsplex',
  'Seal Beach, CA',
  '1709 Apollo Court, Seal Beach, CA 90740',
  'Volleyball',
  true,
  15.00,
  NULL, -- TODO: Add Stripe Admission Price ID
  10,
  true,
  15.00,
  NULL, -- TODO: Add Stripe Parking Price ID
  4,
  '4008',
  'garetcrenshaw@gmail.com',
  'active'
),
-- Event 12: 12 TOURNEY 5 4/26
(
  '12',
  'SoCal Cup: 12 Tourney 5',
  'socal-cup-12-tourney-5-4-26',
  '2026-04-26',
  NULL,
  'AIM Sportsplex',
  'Seal Beach, CA',
  '1709 Apollo Court, Seal Beach, CA 90740',
  'Volleyball',
  true,
  15.00,
  NULL, -- TODO: Add Stripe Admission Price ID
  10,
  true,
  15.00,
  NULL, -- TODO: Add Stripe Parking Price ID
  4,
  '4009',
  'garetcrenshaw@gmail.com',
  'active'
),
-- Event 13: 14/13 CHAMPIONSHIP 5/16
(
  '13',
  'SoCal Cup: 14/13 Championship',
  'socal-cup-14-13-championship-5-16',
  '2026-05-16',
  NULL,
  'AIM Sportsplex',
  'Seal Beach, CA',
  '1709 Apollo Court, Seal Beach, CA 90740',
  'Volleyball',
  true,
  15.00,
  NULL, -- TODO: Add Stripe Admission Price ID
  10,
  true,
  15.00,
  NULL, -- TODO: Add Stripe Parking Price ID
  4,
  '4010',
  'garetcrenshaw@gmail.com',
  'active'
),
-- Event 14: 12 CHAMPIONSHIP 5/17
(
  '14',
  'SoCal Cup: 12 Championship',
  'socal-cup-12-championship-5-17',
  '2026-05-17',
  NULL,
  'AIM Sportsplex',
  'Seal Beach, CA',
  '1709 Apollo Court, Seal Beach, CA 90740',
  'Volleyball',
  true,
  15.00,
  NULL, -- TODO: Add Stripe Admission Price ID
  10,
  true,
  15.00,
  NULL, -- TODO: Add Stripe Parking Price ID
  4,
  '4011',
  'garetcrenshaw@gmail.com',
  'active'
),
-- Event 15: 15-18 FRIENDLY 5/23
(
  '15',
  'SoCal Cup: 15-18 Friendly',
  'socal-cup-15-18-friendly-5-23',
  '2026-05-23',
  NULL,
  'AIM Sportsplex',
  'Seal Beach, CA',
  '1709 Apollo Court, Seal Beach, CA 90740',
  'Volleyball',
  true,
  15.00,
  NULL, -- TODO: Add Stripe Admission Price ID
  10,
  true,
  15.00,
  NULL, -- TODO: Add Stripe Parking Price ID
  4,
  '4012',
  'garetcrenshaw@gmail.com',
  'active'
),
-- Event 16: 16/15 TOURNEY 3 5/30
(
  '16',
  'SoCal Cup: 16/15 Tourney 3',
  'socal-cup-16-15-tourney-3-5-30',
  '2026-05-30',
  NULL,
  'AIM Sportsplex',
  'Seal Beach, CA',
  '1709 Apollo Court, Seal Beach, CA 90740',
  'Volleyball',
  true,
  15.00,
  NULL, -- TODO: Add Stripe Admission Price ID
  10,
  true,
  15.00,
  NULL, -- TODO: Add Stripe Parking Price ID
  4,
  '4013',
  'garetcrenshaw@gmail.com',
  'active'
),
-- Event 17: 18/17 TOURNEY 3 5/31
(
  '17',
  'SoCal Cup: 18/17 Tourney 3',
  'socal-cup-18-17-tourney-3-5-31',
  '2026-05-31',
  NULL,
  'AIM Sportsplex',
  'Seal Beach, CA',
  '1709 Apollo Court, Seal Beach, CA 90740',
  'Volleyball',
  true,
  15.00,
  NULL, -- TODO: Add Stripe Admission Price ID
  10,
  true,
  15.00,
  NULL, -- TODO: Add Stripe Parking Price ID
  4,
  '4014',
  'garetcrenshaw@gmail.com',
  'active'
),
-- Event 18: 16/15 SPRING CHAMPIONSHIP 6/6
(
  '18',
  'SoCal Cup: 16/15 Spring Championship',
  'socal-cup-16-15-spring-championship-6-6',
  '2026-06-06',
  NULL,
  'AIM Sportsplex',
  'Seal Beach, CA',
  '1709 Apollo Court, Seal Beach, CA 90740',
  'Volleyball',
  true,
  15.00,
  NULL, -- TODO: Add Stripe Admission Price ID
  10,
  true,
  15.00,
  NULL, -- TODO: Add Stripe Parking Price ID
  4,
  '4015',
  'garetcrenshaw@gmail.com',
  'active'
),
-- Event 19: 18/17 SPRING CHAMPIONSHIP 6/7
(
  '19',
  'SoCal Cup: 18/17 Spring Championship',
  'socal-cup-18-17-spring-championship-6-7',
  '2026-06-07',
  NULL,
  'AIM Sportsplex',
  'Seal Beach, CA',
  '1709 Apollo Court, Seal Beach, CA 90740',
  'Volleyball',
  true,
  15.00,
  NULL, -- TODO: Add Stripe Admission Price ID
  10,
  true,
  15.00,
  NULL, -- TODO: Add Stripe Parking Price ID
  4,
  '4016',
  'garetcrenshaw@gmail.com',
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  event_name = EXCLUDED.event_name,
  event_slug = EXCLUDED.event_slug,
  event_date = EXCLUDED.event_date,
  event_time = EXCLUDED.event_time,
  venue_name = EXCLUDED.venue_name,
  venue_city = EXCLUDED.venue_city,
  venue_address = EXCLUDED.venue_address,
  category = EXCLUDED.category,
  has_admission = EXCLUDED.has_admission,
  admission_price = EXCLUDED.admission_price,
  stripe_admission_price_id = EXCLUDED.stripe_admission_price_id,
  admission_quantity_limit = EXCLUDED.admission_quantity_limit,
  has_parking = EXCLUDED.has_parking,
  parking_price = EXCLUDED.parking_price,
  stripe_parking_price_id = EXCLUDED.stripe_parking_price_id,
  parking_quantity_limit = EXCLUDED.parking_quantity_limit,
  scanner_pin = EXCLUDED.scanner_pin,
  updated_at = NOW();

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Check all SoCal Cup events
SELECT 
  id,
  event_name,
  event_date,
  venue_name,
  has_admission,
  admission_price,
  has_parking,
  parking_price,
  scanner_pin,
  status
FROM events
WHERE id::integer BETWEEN 4 AND 19
ORDER BY event_date;

-- ================================================================
-- NEXT STEPS
-- ================================================================
-- 
-- 1. Create Stripe Price IDs for each event:
--    - For each event, create 2 prices in Stripe:
--      * General Admission ticket (admission_price)
--      * Parking pass (parking_price)
-- 
-- 2. Update the SQL above with actual Stripe Price IDs:
--    - Replace NULL in stripe_admission_price_id
--    - Replace NULL in stripe_parking_price_id
-- 
-- 3. Update ticket prices if different from $15:
--    - Update admission_price and parking_price fields
-- 
-- 4. Test the B2C portal:
--    - Visit: http://localhost:3000/org/socal-cup
--    - Verify all 16 events appear
--    - Test checkout flow
-- 
-- ================================================================

