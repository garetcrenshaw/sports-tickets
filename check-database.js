#!/usr/bin/env node

/**
 * Check what's actually in the Supabase database
 */

const sessionId = 'cs_test_b1vIpMi4YNhCZ4F0NnTdyiTR8pClQVg49SZGH8qeP5etTm9CzGu0DP1BPb';

console.log('🔍 CHECKING SUPABASE DATABASE FOR SESSION:', sessionId);
console.log('');

// Load environment manually - REPLACE WITH YOUR REAL KEYS
const envContent = `STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY_HERE
SUPABASE_URL=YOUR_SUPABASE_URL_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE
RESEND_API_KEY=YOUR_RESEND_API_KEY_HERE
SITE_URL=http://localhost:3000`;

envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length) {
    process.env[key.trim()] = value.join('=').trim();
  }
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDatabase() {
  console.log('📊 TICKETS TABLE:');
  const { data: tickets, error: ticketError } = await supabase
    .from('tickets')
    .select('*')
    .like('ticket_id', `ticket-${sessionId}%`)
    .order('ticket_id');

  if (ticketError) {
    console.log('❌ Error fetching tickets:', ticketError.message);
  } else {
    console.log(`Found ${tickets?.length || 0} tickets:`);
    tickets?.forEach((ticket, i) => {
      console.log(`  ${i+1}. ${ticket.ticket_id}`);
      console.log(`     Email: ${ticket.purchaser_email}`);
      console.log(`     Type: ${ticket.ticket_type}`);
      console.log(`     QR URL: ${ticket.qr_code_url ? ticket.qr_code_url.substring(0, 50) + '...' : 'MISSING'}`);
      console.log(`     Status: ${ticket.status}`);
      console.log('');
    });
  }

  console.log('🅿️  PARKING PASSES TABLE:');
  const { data: parking, error: parkingError } = await supabase
    .from('parking_passes')
    .select('*')
    .like('ticket_id', `parking-${sessionId}%`)
    .order('ticket_id');

  if (parkingError) {
    console.log('❌ Error fetching parking passes:', parkingError.message);
  } else {
    console.log(`Found ${parking?.length || 0} parking passes:`);
    parking?.forEach((pass, i) => {
      console.log(`  ${i+1}. ${pass.ticket_id}`);
      console.log(`     Email: ${pass.purchaser_email}`);
      console.log(`     Type: ${pass.ticket_type}`);
      console.log(`     QR URL: ${pass.qr_code_url ? pass.qr_code_url.substring(0, 50) + '...' : 'MISSING'}`);
      console.log(`     Status: ${pass.status}`);
      console.log('');
    });
  }

  if ((!tickets || tickets.length === 0) && (!parking || parking.length === 0)) {
    console.log('❌ NO DATA FOUND FOR THIS SESSION');
    console.log('');
    console.log('This means either:');
    console.log('1. Wrong Supabase project/credentials');
    console.log('2. Data was deleted');
    console.log('3. Session was never processed');
  } else {
    console.log('✅ DATA EXISTS!');
    console.log('If you got an email but no QR codes, the QR URLs might be broken.');
  }
}

checkDatabase().catch(console.error);
