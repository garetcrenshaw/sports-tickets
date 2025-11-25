#!/usr/bin/env node

/**
 * Simple test script to verify webhook handler logic
 * Tests the handleCheckoutSession function directly
 */

console.log('🧪 TESTING WEBHOOK HANDLER LOGIC...\n');

// Mock session object that simulates what Stripe sends
const mockSession = {
  id: 'cs_test_mock_' + Date.now(),
  metadata: {
    admissionQuantity: '2',
    parkingQuantity: '1',
    buyerName: 'G',
    buyerEmail: 'garetcrenshaw@gmail.com',
    eventId: '1'
  },
  customer_details: {
    email: 'garetcrenshaw@gmail.com',
    name: 'G'
  },
  amount_total: 4500,
  payment_status: 'paid'
};

console.log('Mock session object:', JSON.stringify(mockSession, null, 2));

// Import and test the handleCheckoutSession function
const { handleCheckoutSession } = require('./api/webhook');

console.log('\n🚀 Calling handleCheckoutSession...\n');

handleCheckoutSession(mockSession).then(() => {
  console.log('\n✅ handleCheckoutSession completed successfully');
}).catch(err => {
  console.error('\n❌ handleCheckoutSession failed:', err.message);
  console.error(err.stack);
});
