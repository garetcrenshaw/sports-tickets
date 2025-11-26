const http = require('http');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const httpProxy = require('http-proxy');

const PORT = 3001;
const FRONTEND_TARGET = 'http://localhost:3000';
const proxy = httpProxy.createProxyServer({});

proxy.on('error', (error, req, res) => {
  console.error('Proxy error:', error);
  if (!res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
  }
  if (!res.writableEnded) {
    res.end(JSON.stringify({ error: 'Proxy error' }));
  }
});

const FUNCTION_ROOTS = [
  path.join(__dirname, 'api'),
];

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
}

loadEnv();

function resolveFunctionPath(functionName) {
  for (const root of FUNCTION_ROOTS) {
    const candidate = path.join(root, `${functionName}.js`);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
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

      console.log(`🔄 Loading ES module: ${functionPath}`);

      // Use dynamic import for ES modules
      const moduleUrl = `file://${functionPath}`;
      const requiredModule = await import(moduleUrl);

      console.log('📦 Module loaded, checking exports:', Object.keys(requiredModule));

      const handler = requiredModule.default || requiredModule;

      if (typeof handler !== 'function') {
        console.error('❌ Invalid handler type:', typeof handler, 'Expected function');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid function export. Expected default export function.' }));
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
        const bodyString = bodyBuffer.length ? bodyBuffer.toString('utf8') : '';
        const event = {
          httpMethod: req.method,
          body: methodAllowsBody(req.method) ? bodyString : null,
          headers: req.headers,
          queryStringParameters: parseQueryParameters(req.url, req.headers),
          path: req.url,
        };

        try {
          const clonedReq = createBufferedRequest(req, bodyBuffer);

          // Create Express-like response wrapper
          const expressRes = {
            status: (code) => {
              expressRes.statusCode = code;
              return expressRes;
            },
            send: (data) => {
              if (!res.headersSent) {
                res.writeHead(expressRes.statusCode || 200, {
                  'Content-Type': 'application/json',
                  'Content-Length': Buffer.byteLength(typeof data === 'string' ? data : JSON.stringify(data))
                });
              }
              res.end(typeof data === 'string' ? data : JSON.stringify(data));
            },
            end: (data) => {
              if (data) res.end(data);
              else res.end();
            },
            json: (data) => {
              if (!res.headersSent) {
                res.writeHead(expressRes.statusCode || 200, {
                  'Content-Type': 'application/json'
                });
              }
              res.end(JSON.stringify(data));
            }
          };

          await handler(clonedReq, expressRes);
          if (!res.writableEnded) {
            res.end();
          }
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
  console.log(`🌐 ${req.method} ${req.url}`);

  // Handle API routes first
  if (req.url.startsWith('/api/')) {
    const pathAfterApi = req.url.split('/api/')[1];
    const functionName = pathAfterApi.split(/[/?]/)[0]; // Stop at / or ?
    console.log(`🎯 API call detected, function: ${functionName}`);

    // Special handling for stripe-webhook to ensure raw body is preserved
    if (functionName === 'stripe-webhook') {
      return createFunctionHandler(functionName)(req, res);
    }

    return createFunctionHandler(functionName)(req, res);
  }

  // Guard against serving success/cancel pages from API server
  if (req.url.startsWith('/success') || req.url.startsWith('/cancel')) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not an API route - use frontend server');
    return;
  }

  // For everything else, proxy to frontend (including success/cancel pages with or without query params)
  console.log('🔄 Proxying to frontend');
  proxy.web(req, res, { target: FRONTEND_TARGET });
});

server.listen(PORT, () => {
  console.log(`🚀 Function server running on http://localhost:${PORT}`);
  console.log(`📡 Ready to serve functions at /api/*`);
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
    console.error('❌ Function server error:', err.message);
  }
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('👋 Shutting down function server');
  server.close();
  process.exit(0);
});
