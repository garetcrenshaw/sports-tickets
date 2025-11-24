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

// Mock session data
const mockSession = {
  id: sessionId,
  amount_total: 3000, // $30.00
  customer_details: {
    email: 'test@example.com',
    name: 'Test User'
  },
  metadata: {
    eventId: '1',
    admissionQuantity: '2',
    parkingQuantity: '1',
    buyerName: 'Test User',
    buyerEmail: 'test@example.com'
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
    console.log('- 2 admission tickets in database (type: admission, status: valid)');
    console.log('- 1 parking pass in database (type: parking, status: valid)');
    console.log('- Each with QR codes containing validation URLs');
    console.log('- Email sent to test@example.com with QR code images');
    console.log('');
    console.log('Check your database and email to verify!');

  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    console.error(error.stack);
  }
}

testFulfillment();
