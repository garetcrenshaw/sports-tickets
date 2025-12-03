const http = require('http');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

const PORT = 3000;
const FRONTEND_TARGET = 'http://localhost:3002';

function loadEnv() {
  // Try to load .env.local, but don't fail if we can't due to sandbox restrictions
  const envFiles = ['.env.local'];

  envFiles.forEach((fileName) => {
    const envPath = path.join(__dirname, fileName);
    try {
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            const trimmedKey = key.trim();
            const trimmedValue = valueParts.join('=').trim();
            if (trimmedKey && !process.env[trimmedKey]) {
              process.env[trimmedKey] = trimmedValue;
            }
          }
        });
        console.log(`✅ Loaded environment from ${fileName}`);
      }
    } catch (error) {
      console.log(`⚠️  Could not load ${fileName} (sandbox restriction): ${error.message}`);
      console.log('⚠️  Using default/placeholder environment variables for testing');
    }
  });

  // Set default values for testing if not already set
  if (!process.env.STRIPE_SECRET_KEY) process.env.STRIPE_SECRET_KEY = 'sk_test_default';
  if (!process.env.STRIPE_WEBHOOK_SECRET) process.env.STRIPE_WEBHOOK_SECRET = 'whsec_default';
  if (!process.env.SUPABASE_URL) process.env.SUPABASE_URL = 'https://default.supabase.co';
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = 'default_key';
  if (!process.env.RESEND_API_KEY) process.env.RESEND_API_KEY = 're_default';
  if (!process.env.GA_PRICE_ID) process.env.GA_PRICE_ID = 'price_default_ga';
  if (!process.env.PARKING_PRICE_ID) process.env.PARKING_PRICE_ID = 'price_default_parking';
  if (!process.env.VALIDATE_PASSWORD) process.env.VALIDATE_PASSWORD = 'gameday2024';
}

loadEnv();

function resolveFunctionPath(functionName) {
  const apiDir = path.join(__dirname, 'api');

  // First try the new Vercel structure: /api/functionName/index.js
  const vercelPath = path.join(apiDir, functionName, 'index.js');
  if (fs.existsSync(vercelPath)) {
    return vercelPath;
  }

  // Fallback to old structure: /api/functionName.js
  const oldPath = path.join(apiDir, `${functionName}.js`);
  if (fs.existsSync(oldPath)) {
    return oldPath;
    }

  return null;
}

function parseQueryParameters(urlPath, headers = {}) {
  try {
    const url = new URL(urlPath, `http://${headers.host || 'localhost'}`);
    return Object.fromEntries(url.searchParams.entries());
  } catch {
    return {};
  }
}

function methodAllowsBody(method = '') {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

function createBufferedRequest(originalReq, bodyBuffer) {
  let consumed = false;
  const clone = new Readable({
    read() {
      if (consumed) return;
      if (bodyBuffer && bodyBuffer.length) {
        this.push(bodyBuffer);
      }
      this.push(null);
      consumed = true;
    },
  });

  clone.headers = { ...originalReq.headers };
  clone.method = originalReq.method;
  clone.url = originalReq.url;
  clone.httpVersion = originalReq.httpVersion;
  clone.connection = originalReq.connection;
  clone.socket = originalReq.socket;
  clone.rawBody = bodyBuffer;
  clone.query = parseQueryParameters(originalReq.url, originalReq.headers);

  return clone;
}

function createFunctionHandler(functionName) {
  return async (req, res) => {
    try {
      const functionPath = resolveFunctionPath(functionName);

      if (!functionPath) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Function not found' }));
        return;
      }

      console.log(`🔄 Loading function: ${functionPath}`);

      // Use dynamic import for ES modules
      const moduleUrl = `file://${functionPath}`;
      const requiredModule = await import(moduleUrl);

      console.log('📦 Function loaded, checking exports:', Object.keys(requiredModule));

      const handler = requiredModule.handler || requiredModule.default?.handler || requiredModule.default;

      if (typeof handler !== 'function') {
        console.error('❌ Invalid handler type:', typeof handler, 'Expected function');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid function export. Expected handler function.' }));
        return;
      }

      console.log('✅ Handler function found, executing...');

      const chunks = [];
      req.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      req.on('error', (error) => {
        console.error('Request error:', error);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
        }
        if (!res.writableEnded) {
          res.end(JSON.stringify({ error: 'Request stream error' }));
        }
      });
      req.on('end', async () => {
        const bodyBuffer = Buffer.concat(chunks);
        const bodyString = bodyBuffer.length ? bodyBuffer.toString('utf8') : null;

        // Parse JSON body for POST requests
        let parsedBody = null;
        if (methodAllowsBody(req.method) && bodyString) {
          try {
            parsedBody = JSON.parse(bodyString);
          } catch (e) {
            console.error('Failed to parse request body as JSON:', e);
          }
        }

        // Add body to request object for Express-style compatibility
        req.body = parsedBody;
        req.rawBody = bodyBuffer; // For webhook signature verification

        // Create Vercel-style event object
        const event = {
          httpMethod: req.method,
          body: methodAllowsBody(req.method) ? bodyString : null,
          headers: req.headers,
          queryStringParameters: parseQueryParameters(req.url, req.headers),
          path: req.url,
          isBase64Encoded: false,
        };

        try {
          // Call the handler - works with both CommonJS and ES module exports
          console.log('Calling handler with Express-style req/res...');

          // No timeout - webhook responds immediately, fulfillment runs in background
          await handler(req, res);
        } catch (error) {
          console.error('Function error:', error);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          } else if (!res.writableEnded) {
            res.end();
          }
        }
      });
    } catch (error) {
      console.error('Handler error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  };
}

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  console.log(`🌐 ${req.method} ${req.url}`);

  // Handle API routes first
  if (req.url.startsWith('/api/')) {
    const pathAfterApi = req.url.split('/api/')[1];
    const functionName = pathAfterApi.split(/[/?]/)[0]; // Stop at / or ?
    console.log(`🎯 API call detected, function: ${functionName}`);

    return createFunctionHandler(functionName)(req, res);
  }

  // For everything else, redirect to frontend (this server is API-only)
  console.log('🔄 Redirecting to frontend - this is API server only');
  res.writeHead(302, { 'Location': `${FRONTEND_TARGET}${req.url}` });
  res.end();
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
  console.log(`📡 Ready to serve API functions at /api/*`);
  console.log(`🔧 Environment loaded:`, {
    hasStripe: !!process.env.STRIPE_SECRET_KEY,
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    hasSupabase: !!process.env.SUPABASE_URL,
    hasResend: !!process.env.RESEND_API_KEY,
  });
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} already in use. Kill existing process first:`);
    console.error(`   lsof -i :${PORT}`);
    console.error(`   kill -9 [PID]`);
    console.error(`   Then restart: npm run dev`);
  } else {
    console.error('❌ API server error:', err.message);
  }
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('👋 Shutting down API server');
  server.close();
  process.exit(0);
});
