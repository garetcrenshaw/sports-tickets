#!/usr/bin/env node

/**
 * Complete Webhook Setup Verification
 * This script helps diagnose why webhooks work with `stripe trigger` but not real checkouts
 */

const http = require('http');

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('🔥 STRIPE WEBHOOK SETUP DIAGNOSTIC');
console.log('═══════════════════════════════════════════════════════');
console.log('');

// Test 1: Check if function server is running
console.log('TEST 1: Checking if function server is running...');
http.get('http://localhost:3001/api/webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 400 || res.statusCode === 405) {
      console.log('✅ Function server is running on port 3001');
    } else {
      console.log(`⚠️  Function server responded with status ${res.statusCode}`);
    }
    runTest2();
  });
}).on('error', (err) => {
  console.log('❌ Function server is NOT running on port 3001');
  console.log('   Run: npm run dev:functions');
  process.exit(1);
});

function runTest2() {
  console.log('');
  console.log('TEST 2: Checking if Vite proxy is working...');
  http.get('http://localhost:3000/api/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 400 || res.statusCode === 405) {
        console.log('✅ Vite proxy is working (port 3000 → 3001)');
      } else {
        console.log(`⚠️  Vite proxy responded with status ${res.statusCode}`);
      }
      printInstructions();
    });
  }).on('error', (err) => {
    console.log('❌ Vite dev server is NOT running on port 3000');
    console.log('   Run: npm run dev');
    process.exit(1);
  });
}

function printInstructions() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 NEXT STEPS TO TEST END-TO-END');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('1️⃣  Make sure your Stripe CLI is running:');
  console.log('   stripe listen --forward-to localhost:3000/api/webhook');
  console.log('');
  console.log('2️⃣  Watch for this message in the Stripe CLI:');
  console.log('   > Ready! Your webhook signing secret is whsec_...');
  console.log('');
  console.log('3️⃣  Open http://localhost:3000 in your browser');
  console.log('');
  console.log('4️⃣  Fill out the form:');
  console.log('   • Name: Garet Test');
  console.log('   • Email: garetcrenshaw@gmail.com');
  console.log('   • Admission: 2 tickets');
  console.log('   • Parking: 1 pass');
  console.log('');
  console.log('5️⃣  Click "Buy Tickets"');
  console.log('');
  console.log('6️⃣  On Stripe checkout page:');
  console.log('   • Card: 4242 4242 4242 4242');
  console.log('   • Expiry: 12/34');
  console.log('   • CVC: 123');
  console.log('   • ZIP: 12345');
  console.log('   • CLICK THE "PAY" BUTTON!');
  console.log('');
  console.log('7️⃣  Watch these 3 terminals:');
  console.log('   Terminal 1 (Stripe CLI): Should show webhook events');
  console.log('   Terminal 2 (Function server): Should show detailed logs');
  console.log('   Terminal 3 (Browser): Should redirect to success page');
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔍 TROUBLESHOOTING');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('If webhook still doesn\'t fire after completing payment:');
  console.log('');
  console.log('1. Check Stripe CLI is showing this EXACT line:');
  console.log('   > Ready! You are using Stripe API Version [2025-XX-XX].');
  console.log('   Your webhook signing secret is whsec_... (^C to quit)');
  console.log('');
  console.log('2. If you see "Connection lost" or nothing happens:');
  console.log('   • Press Ctrl+C to stop Stripe CLI');
  console.log('   • Run again: stripe listen --forward-to localhost:3000/api/webhook');
  console.log('   • Make a NEW test purchase (don\'t reuse old checkout links)');
  console.log('');
  console.log('3. Common issue: Using an OLD checkout link');
  console.log('   • Always start fresh from http://localhost:3000');
  console.log('   • Don\'t bookmark or reuse Stripe checkout URLs');
  console.log('');
  console.log('4. If Stripe CLI shows events but function server doesn\'t log:');
  console.log('   • Check the Stripe CLI status code: <--  [XXX]');
  console.log('   • [200] = Success ✅');
  console.log('   • [400] = Webhook signature error ❌');
  console.log('   • [500] = Function error ❌');
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
}

