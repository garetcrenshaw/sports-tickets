// Quick script to check database prices and Price IDs
// Run with: node check-database-prices.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function checkPrices() {
  console.log('🔍 Checking SoCal Cup events in database...\n');

  const { data: events, error } = await supabase
    .from('events')
    .select('id, event_name, admission_price, parking_price, stripe_admission_price_id, stripe_parking_price_id')
    .or('event_name.ilike.%SoCal Cup%,event_name.ilike.%socal cup%')
    .order('id');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!events || events.length === 0) {
    console.log('⚠️  No SoCal Cup events found in database');
    return;
  }

  console.log(`Found ${events.length} SoCal Cup event(s):\n`);

  events.forEach(event => {
    console.log(`Event ID: ${event.id}`);
    console.log(`Name: ${event.event_name}`);
    console.log(`Admission Price: $${event.admission_price || 'NULL'}`);
    console.log(`Parking Price: $${event.parking_price || 'NULL'}`);
    console.log(`Stripe Admission Price ID: ${event.stripe_admission_price_id || 'NULL'}`);
    console.log(`Stripe Parking Price ID: ${event.stripe_parking_price_id || 'NULL'}`);
    console.log('---\n');
  });

  // Check what's expected
  console.log('✅ Expected:');
  console.log('  Admission Price: $18.00');
  console.log('  Parking Price: $19.00');
  console.log('  Price IDs should match your $18/$19 Stripe products\n');

  // Check if any are wrong
  const wrongPrices = events.filter(e => 
    e.admission_price !== 18.00 || 
    e.parking_price !== 19.00 ||
    !e.stripe_admission_price_id ||
    !e.stripe_parking_price_id
  );

  if (wrongPrices.length > 0) {
    console.log('❌ Issues found:');
    wrongPrices.forEach(event => {
      if (event.admission_price !== 18.00) {
        console.log(`  - Event ${event.id}: Admission price is $${event.admission_price}, should be $18.00`);
      }
      if (event.parking_price !== 19.00) {
        console.log(`  - Event ${event.id}: Parking price is $${event.parking_price}, should be $19.00`);
      }
      if (!event.stripe_admission_price_id) {
        console.log(`  - Event ${event.id}: Missing stripe_admission_price_id`);
      }
      if (!event.stripe_parking_price_id) {
        console.log(`  - Event ${event.id}: Missing stripe_parking_price_id`);
      }
    });
  } else {
    console.log('✅ All prices and Price IDs look correct!');
  }
}

checkPrices().catch(console.error);

