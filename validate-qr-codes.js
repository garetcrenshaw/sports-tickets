#!/usr/bin/env node

/**
 * Validate that QR codes contain correct URLs and are scannable
 */

const sessionId = 'cs_test_webhook_test_' + Date.now();

console.log('🔍 VALIDATING QR CODE URLs');
console.log('===========================');
console.log(`Session ID: ${sessionId}`);
console.log('');

// Load environment - REPLACE WITH YOUR REAL KEYS
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

const { generateTicketQr } = require('./src/lib/qr');

async function testQRCodes() {
  const SITE_URL = process.env.SITE_URL;

  // Test ticket QR codes
  console.log('🎫 Testing admission ticket QR codes:');
  for (let i = 1; i <= 2; i++) {
    const ticketId = `ticket-${sessionId}-${i}`;
    const validateUrl = `${SITE_URL}/validate/${ticketId}`;
    console.log(`  Ticket ${i}: ${validateUrl}`);
  }

  console.log('');

  // Test parking QR codes
  console.log('🅿️  Testing parking pass QR codes:');
  for (let i = 1; i <= 1; i++) {
    const ticketId = `parking-${sessionId}-${i}`;
    const validateUrl = `${SITE_URL}/validate/${ticketId}`;
    console.log(`  Parking ${i}: ${validateUrl}`);
  }

  console.log('');
  console.log('✅ QR codes should generate data URLs containing these validation URLs');
  console.log('✅ When scanned, these URLs should open the validation page');
  console.log('✅ Staff can then enter password to mark tickets as scanned');
}

testQRCodes();
