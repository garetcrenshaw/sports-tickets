// Quick test script to verify functions work locally
const http = require('http');

console.log('🧪 Testing local function server...\n');

const testData = {
  ticketType: 'ga',
  email: 'garetcrenshaw@gmail.com',
  name: 'Garet Crenshaw',
  eventId: 1,
  quantity: 1
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 9999,
  path: '/.netlify/functions/create-ticket',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('📡 Sending test request to function...');
console.log('📝 Data:', testData);

const req = http.request(options, (res) => {
  console.log(`📊 Status: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const jsonResponse = JSON.parse(data);
      console.log('✅ Response:', jsonResponse);

      if (jsonResponse.clientSecret && jsonResponse.paymentIntentId) {
        console.log('🎉 SUCCESS: Function is working correctly!');
      } else if (jsonResponse.error) {
        console.log('❌ ERROR:', jsonResponse.error);
      } else {
        console.log('⚠️  Unexpected response format');
      }
    } catch (e) {
      console.log('❌ Invalid JSON response:', data);
    }
  });
});

req.on('error', (e) => {
  console.log('❌ Request failed - is the server running?');
  console.log('💡 Start with: npm run dev:server');
  console.log('🔗 Test URL: http://localhost:9999/.netlify/functions/create-ticket');
});

req.write(postData);
req.end();
