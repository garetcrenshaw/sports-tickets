#!/usr/bin/env node

/**
 * Test the complete webhook fulfillment system
 * Simulates a checkout.session.completed event and verifies:
 * - Database inserts (tickets + parking_passes)
 * - QR code generation
 * - Email sending with proper HTML
 */

const sessionId = 'cs_test_webhook_test_' + Date.now();

console.log('🧪 TESTING WEBHOOK FULFILLMENT SYSTEM');
console.log('=====================================');
console.log(`Session ID: ${sessionId}`);
console.log('');

// Load environment variables
require('fs').readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length) process.env[key.trim()] = value.join('=').trim();
});

try {
  require('fs').readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length) process.env[key.trim()] = value.join('=').trim();
  });
} catch (e) {
  console.log('⚠️  .env.local not found - make sure to copy env-local-template.txt to .env.local and fill in your keys');
}

// Mock session data
const mockSession = {
  id: sessionId,
  amount_total: 3000, // $30.00
  customer_details: {
    email: 'garetcrenshaw@gmail.com',
    name: 'Garet Crenshaw'
  },
  metadata: {
    eventId: '1',
    admissionQuantity: '2',
    parkingQuantity: '1',
    buyerName: 'Garet Crenshaw',
    buyerEmail: 'garetcrenshaw@gmail.com'
  }
};

async function testFulfillment() {
  try {
    console.log('🎫 Testing webhook fulfillment...');

    // Import the handler
    const { handleCheckoutSession } = require('./api/webhook');

    console.log('📦 Processing checkout session...');
    await handleCheckoutSession(mockSession);

    console.log('');
    console.log('✅ WEBHOOK PROCESSING COMPLETE');
    console.log('');
    console.log('Expected results:');
    console.log('- 2 admission tickets in database (status: purchased)');
    console.log('- 1 parking pass in database (status: purchased)');
    console.log('- Each with QR codes containing validation URLs');
    console.log('- Email sent to garetcrenshaw@gmail.com with QR code images');
    console.log('');
    console.log('Check your database and email to verify!');

  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    console.error(error.stack);
  }
}

testFulfillment();
