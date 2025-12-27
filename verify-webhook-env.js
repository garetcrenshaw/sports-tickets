// Quick script to verify webhook environment variables
// Run this to check if all required env vars are set

const requiredVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY'
];

console.log('🔍 Checking environment variables...\n');

const missing = [];
const present = [];

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    missing.push(varName);
    console.log(`❌ ${varName}: MISSING`);
  } else {
    present.push(varName);
    // Show first/last few chars for verification (don't log full secrets)
    const preview = value.length > 20 
      ? `${value.substring(0, 10)}...${value.substring(value.length - 10)}`
      : value.substring(0, 10) + '...';
    console.log(`✅ ${varName}: ${preview}`);
  }
});

console.log('\n' + '='.repeat(50));
if (missing.length === 0) {
  console.log('✅ All required environment variables are set!');
  process.exit(0);
} else {
  console.log(`❌ Missing ${missing.length} environment variable(s):`);
  missing.forEach(v => console.log(`   - ${v}`));
  console.log('\n⚠️  Please set these in Vercel environment variables');
  process.exit(1);
}

