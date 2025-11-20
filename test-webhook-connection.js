// Quick test to verify webhook secret is loaded
const fs = require('fs');
const path = require('path');

console.log('🔍 TESTING ENVIRONMENT VARIABLE LOADING...');
console.log('');

// Load .env manually
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
  console.log('✅ .env file loaded');
} else {
  console.log('❌ .env file not found!');
  process.exit(1);
}

console.log('');
console.log('📋 CHECKING REQUIRED VARIABLES:');
console.log('');

const requiredVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY'
];

let allPresent = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const exists = !!value;
  const length = value ? value.length : 0;
  
  if (exists) {
    console.log(`✅ ${varName}: EXISTS (${length} chars)`);
    if (varName === 'STRIPE_WEBHOOK_SECRET') {
      const startsCorrect = value.startsWith('whsec_');
      if (startsCorrect) {
        console.log(`   ✅ Starts with "whsec_" (correct format)`);
      } else {
        console.log(`   ❌ Does NOT start with "whsec_" (WRONG FORMAT!)`);
        console.log(`   💡 Should be: whsec_938eab87d4b6d6a06a5156e515d2fbc9d77a82db4dd5f354486dc52f5d7a0835`);
        allPresent = false;
      }
    }
  } else {
    console.log(`❌ ${varName}: MISSING`);
    allPresent = false;
  }
});

console.log('');

if (allPresent) {
  console.log('🎉 ALL ENVIRONMENT VARIABLES ARE PRESENT AND CORRECTLY FORMATTED!');
  console.log('');
  console.log('✅ You are ready to test!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Make sure these 3 terminals are running:');
  console.log('   Terminal 1: npm run dev');
  console.log('   Terminal 2: npm run dev:functions');
  console.log('   Terminal 3: stripe listen --forward-to http://localhost:3001/.netlify/functions/stripe-webhook');
  console.log('');
  console.log('2. Go to http://localhost:3000 and buy tickets');
  console.log('3. Watch Terminal 2 for webhook logs');
  process.exit(0);
} else {
  console.log('❌ SOME ENVIRONMENT VARIABLES ARE MISSING OR INCORRECT!');
  console.log('');
  console.log('🔧 TO FIX:');
  console.log('');
  console.log('1. Open your .env file');
  console.log('2. Make sure it has this line:');
  console.log('   STRIPE_WEBHOOK_SECRET=whsec_938eab87d4b6d6a06a5156e515d2fbc9d77a82db4dd5f354486dc52f5d7a0835');
  console.log('3. Save the file');
  console.log('4. Run this test again: node test-webhook-connection.js');
  process.exit(1);
}

