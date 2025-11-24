const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { handler } = require('./api/webhook');

// Load .env and .env.local
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

async function testWebhook(sessionId) {
  console.log('\n🧪 TESTING WEBHOOK MANUALLY...\n');
  console.log('Session ID:', sessionId);
  
  // Retrieve the actual session from Stripe
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  console.log('✅ Session retrieved from Stripe');
  console.log('   Customer:', session.customer_email);
  console.log('   Amount:', (session.amount_total / 100), 'USD');
  console.log('   Metadata:', session.metadata);
  
  // Create a mock webhook event
  const mockEvent = {
    id: 'evt_test_' + Date.now(),
    type: 'checkout.session.completed',
    data: {
      object: session
    }
  };
  
  // Create a mock request/response
  const mockReq = {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': 'mock_signature' // This will fail verification, but we'll see the logs
    },
    rawBody: Buffer.from(JSON.stringify(mockEvent))
  };
  
  const mockRes = {
    statusCode: 200,
    headers: {},
    setHeader(key, value) {
      this.headers[key] = value;
    },
    end(body) {
      console.log('\n📝 RESPONSE:');
      console.log('   Status:', this.statusCode);
      console.log('   Body:', body);
    }
  };
  
  console.log('\n🚀 Calling webhook handler directly...\n');
  
  // This will fail signature verification, but let's see the logs
  try {
    await handler(mockReq, mockRes);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 This is expected - signature verification failed.');
    console.log('   But we can see if the handler is working correctly.\n');
  }
}

const sessionId = process.argv[2] || 'cs_test_b1vlLymQvuy1UtIZV53iKK6a5A4UEf89Z6ub3gtZ9Ib5Amz5m5NUwhQ9LU';

testWebhook(sessionId)
  .then(() => console.log('\n✅ Test complete'))
  .catch(err => console.error('\n❌ Test failed:', err.message));

