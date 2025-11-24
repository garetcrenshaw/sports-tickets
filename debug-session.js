#!/usr/bin/env node

/**
 * Debug script to check what's in a Stripe session and show what would be processed
 */

const sessionId = 'cs_test_b1vIpMi4YNhCZ4F0NnTdyiTR8pClQVg49SZGH8qeP5etTm9CzGu0DP1BPb';

console.log('🔍 DEBUGGING SESSION:', sessionId);
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

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function debugSession() {
  try {
    console.log('📡 Retrieving session from Stripe...');
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log('✅ Session retrieved');

    console.log('');
    console.log('📊 SESSION DETAILS:');
    console.log('ID:', session.id);
    console.log('Payment status:', session.payment_status);
    console.log('Amount total:', session.amount_total / 100, 'USD');
    console.log('Customer email:', session.customer_details?.email);
    console.log('Customer name:', session.customer_details?.name);

    console.log('');
    console.log('🏷️  METADATA:');
    console.log(JSON.stringify(session.metadata, null, 2));

    // Parse metadata like webhook does
    const metadata = session.metadata || {};
    const admissionQty = parseInt(metadata.admissionQuantity || '0', 10);
    const parkingQty = parseInt(metadata.parkingQuantity || '0', 10);
    const email = session.customer_details?.email || metadata.buyerEmail;
    const name = metadata.buyerName || session.customer_details?.name || 'Guest';

    console.log('');
    console.log('🔄 WEBHOOK WOULD PROCESS:');
    console.log('Admission tickets:', admissionQty);
    console.log('Parking passes:', parkingQty);
    console.log('Email:', email);
    console.log('Name:', name);

    console.log('');
    console.log('💰 PRICING BREAKDOWN:');
    console.log('Admission tickets: $25.00 each x', admissionQty, '=', '$' + (25 * admissionQty).toFixed(2));
    console.log('Parking passes: $20.00 each x', parkingQty, '=', '$' + (20 * parkingQty).toFixed(2));
    const total = 25 * admissionQty + 20 * parkingQty;
    console.log('TOTAL:', '$' + total.toFixed(2));
    console.log('Stripe amount_total:', '$' + (session.amount_total / 100).toFixed(2));

    if (total !== session.amount_total / 100) {
      console.log('❌ PRICING MISMATCH!');
    } else {
      console.log('✅ Pricing matches');
    }

    console.log('');
    console.log('🎫 WOULD CREATE:');
    for (let i = 0; i < admissionQty; i++) {
      console.log(`  - Ticket ${i+1}: ticket-${session.id}-${i+1}`);
    }
    for (let i = 0; i < parkingQty; i++) {
      console.log(`  - Parking Pass ${i+1}: parking-${session.id}-${i+1}`);
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

debugSession();
