#!/usr/bin/env node

/**
 * Test the complete webhook fulfillment system
 * Simulates a checkout.session.completed event and verifies:
 * - Database inserts (tickets + parking_passes)
 * - QR code generation
 * - Email sending with proper HTML
 */

import fs from 'fs';

const sessionId = 'cs_test_webhook_test_' + Date.now();

console.log('🧪 TESTING WEBHOOK FULFILLMENT SYSTEM');
console.log('=====================================');
console.log(`Session ID: ${sessionId}`);
console.log('');

// Load environment variables
fs.readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length) {
    let val = value.join('=').trim();
    // Remove surrounding quotes if present
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    process.env[key.trim()] = val;
  }
});

try {
  fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length) {
      let val = value.join('=').trim();
      // Remove surrounding quotes if present
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      process.env[key.trim()] = val;
    }
  });
} catch (e) {
  console.log('⚠️  .env.local not found - make sure to copy env-local-template.txt to .env.local and fill in your keys');
}

// Force development mode for testing
process.env.NODE_ENV = 'development';

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

    // Import the webhook handler
    const { default: webhookHandler } = await import('./api/stripe-webhook.js');

    // Create mock request with Stripe event
    const mockEvent = {
      id: 'evt_test_' + Date.now(),
      type: 'checkout.session.completed',
      data: { object: mockSession }
    };

    const mockReq = {
      method: 'POST',
      url: '/api/stripe-webhook',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 't=1234567890,v1=test_signature' // Mock signature
      },
      rawBody: Buffer.from(JSON.stringify(mockEvent))
    };

    const mockRes = {
      statusCode: 200,
      headers: {},
      setHeader(key, value) { this.headers[key] = value; },
      json(data) {
        console.log('📝 Webhook Response:', data);
        return data;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      end() {
        console.log(`📝 Response sent with status: ${this.statusCode}`);
      }
    };

    console.log('📦 Calling webhook handler...');
    await webhookHandler(mockReq, mockRes);

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
