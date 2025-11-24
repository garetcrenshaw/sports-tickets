#!/usr/bin/env node

/**
 * Process a completed Stripe checkout session manually
 * Usage: node process-completed-session.js <session_id>
 *
 * This bypasses the webhook and directly processes a completed session.
 * Find the session ID in your Stripe dashboard or from the success page URL.
 */

const sessionId = process.argv[2];

if (!sessionId) {
  console.log('');
  console.log('❌ ERROR: Missing session ID');
  console.log('');
  console.log('Usage: node process-completed-session.js <session_id>');
  console.log('');
  console.log('Find the session ID from:');
  console.log('1. Stripe Dashboard → Payments → Session ID');
  console.log('2. Success page URL: ?session_id=cs_test_...');
  console.log('3. Your function server logs');
  console.log('');
  process.exit(1);
}

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
} catch (e) {}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function processSession() {
  try {
    console.log('');
    console.log('🔄 PROCESSING COMPLETED SESSION...');
    console.log(`Session ID: ${sessionId}`);
    console.log('');

    // Retrieve the session
    console.log('📡 Retrieving session from Stripe...');
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log('✅ Session retrieved');

    // Check if payment was completed
    if (session.payment_status !== 'paid') {
      console.log('❌ Payment not completed yet');
      console.log(`Current status: ${session.payment_status}`);
      process.exit(1);
    }

    console.log('💰 Payment status: PAID ✅');
    console.log('');

    // Process the session using our webhook logic
    const { handleCheckoutSession } = require('./api/webhook');

    console.log('🔧 Processing webhook...');
    await handleCheckoutSession(session);

    console.log('');
    console.log('🎉 SUCCESS! Session processed');
    console.log('');
    console.log('Check your email and Supabase for the results!');

  } catch (error) {
    console.error('');
    console.error('❌ ERROR:');
    console.error(error.message);
    console.error('');
    process.exit(1);
  }
}

processSession();
