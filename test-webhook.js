#!/usr/bin/env node

/**
 * Simple test script to verify webhook handler logic
 * Tests the handleCheckoutSession function directly
 */

// Set up dummy environment variables for testing
process.env.RESEND_API_KEY = 'test_resend_api_key';
process.env.STRIPE_SECRET_KEY = 'test_stripe_secret_key';
process.env.SITE_URL = 'http://localhost:3000';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test_anon_key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role_key';

console.log('🧪 TESTING WEBHOOK HANDLER LOGIC...\n');

// Mock the Stripe client before importing webhook
const mockStripe = {
  checkout: {
    sessions: {
      retrieve: async (id, options) => {
        console.log('🧪 MOCK: Retrieving session', id, 'with options:', options);
        return {
          id: 'cs_test_mock_full_' + Date.now(),
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
          line_items: {
            data: [
              { price: { id: 'price_admission' }, quantity: 2 },
              { price: { id: 'price_parking' }, quantity: 1 }
            ]
          },
          amount_total: 4500,
          payment_status: 'paid'
        };
      }
    }
  }
};

// Override require to return mock clients
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === './src/lib/stripe') {
    return {
      getStripeClient: () => mockStripe,
      requireEnv: (key) => {
        const testValues = {
          'STRIPE_WEBHOOK_SECRET': 'whsec_test_mock_secret',
          'RESEND_API_KEY': 'test_resend_api_key',
          'SITE_URL': 'http://localhost:3000'
        };
        if (testValues[key]) return testValues[key];
        throw new Error(`Environment variable ${key} not found`);
      }
    };
  }
  if (id === 'stripe') {
    // Mock the entire stripe module as a constructor
    return function Stripe(secret) {
      return mockStripe;
    };
  }
  if (id === '../src/lib/db' || id === './src/lib/db') {
    return {
      createTickets: async (rows) => {
        console.log('🧪 MOCK: Creating tickets:', rows.length);
        return rows.map((row, i) => ({ ...row, id: `ticket_${i + 1}` }));
      },
      createParkingPasses: async (rows) => {
        console.log('🧪 MOCK: Creating parking passes:', rows.length);
        return rows.map((row, i) => ({ ...row, id: `parking_${i + 1}` }));
      }
    };
  }
  if (id === './src/lib/qr') {
    return {
      generateTicketQr: async (url) => {
        console.log('🧪 MOCK: Generating QR for:', url);
        return `data:image/png;base64,mock_qr_data_${url}`;
      }
    };
  }
  if (id === './send-ticket') {
    return {
      sendTicketsEmail: async (data) => {
        console.log('🧪 MOCK: Sending email to:', data.email);
        return { success: true };
      }
    };
  }
  return originalRequire.apply(this, arguments);
};

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
const { handleCheckoutSession } = require('./pages/api/stripe-webhook');

console.log('\n🚀 Calling handleCheckoutSession...\n');

handleCheckoutSession(mockSession).then(() => {
  console.log('\n✅ handleCheckoutSession completed successfully');
}).catch(err => {
  console.error('\n❌ handleCheckoutSession failed:', err.message);
  console.error(err.stack);
});
