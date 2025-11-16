// Simple Node.js HTTP server for local development
// Mimics Netlify function endpoints (zero external dependencies)

const http = require('http');
const url = require('url');

// Set minimal test environment variables for local development
// These are mock values - real ones should be loaded from .env
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key_for_local_dev';
process.env.GA_PRICE_ID = 'price_1STzm4RzFa5vaG1DBe0qzBRZ';
process.env.SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key';

console.log('⚙️  Environment: Test mode (hardcoded values)');
console.log('📍 Frontend: http://localhost:5173');
console.log('🔧 Functions: http://localhost:8888/.netlify/functions/*');

// Import our functions
const createTicket = require('./netlify/functions/create-ticket.js').handler;

// Mock Netlify function context
const createNetlifyContext = (req, body) => ({
  body: body,
  headers: req.headers || {},
  httpMethod: req.method || 'POST',
  path: req.url || '/.netlify/functions/create-ticket'
});

// Parse JSON body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  console.log(`📡 ${req.method} ${pathname}`);

  // Health check
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: 'development'
    }));
    return;
  }

  // Function routing
  const functionMatch = pathname.match(/^\/\.netlify\/functions\/([^\/]+)$/);
  if (functionMatch) {
    const functionName = functionMatch[1];

    try {
      let body = {};
      if (req.method === 'POST' || req.method === 'PUT') {
        body = await parseJsonBody(req);
      }

      console.log(`📦 Body:`, body);

      let result;

      switch (functionName) {
        case 'create-ticket':
          // Mock successful response for local testing
          console.log('🎭 MOCKING create-ticket response (local dev)');
          result = {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientSecret: 'pi_mock_client_secret_for_local_dev',
              paymentIntentId: 'pi_mock_' + Date.now(),
              isFree: false,
              quantity: body.quantity || 1,
              totalAmount: (body.quantity || 1) * 15 * 100, // $15 per ticket in cents
            })
          };
          break;

        default:
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Function ${functionName} not found` }));
          return;
      }

      console.log('✅ Function result:', result);

      // Set status code
      const statusCode = result.statusCode || 200;

      // Set headers
      const headers = { 'Content-Type': 'application/json' };
      if (result.headers) {
        Object.assign(headers, result.headers);
      }

      res.writeHead(statusCode, headers);
      res.end(result.body);

    } catch (error) {
      console.error('❌ Function error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }));
    }
    return;
  }

  // 404 for unknown routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = process.env.PORT || 8888;

server.listen(PORT, () => {
  console.log(`🌐 Local function server running on port ${PORT}`);
  console.log(`💡 Test functions at: http://localhost:${PORT}/.netlify/functions/create-ticket`);
  console.log(`🔄 Make sure Vite is also running on port 5173`);
});
