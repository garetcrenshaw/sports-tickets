const http = require('http');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

const PORT = 3001;
const FUNCTION_ROOTS = [
  path.join(__dirname, 'api'),
  path.join(__dirname, 'netlify', 'functions'),
];

function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
  }
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

      delete require.cache[require.resolve(functionPath)];
      const requiredModule = require(functionPath);
      const netlifyStyleHandler = requiredModule && typeof requiredModule.handler === 'function'
        ? requiredModule.handler
        : null;
      const nodeStyleHandler = typeof requiredModule === 'function' ? requiredModule : null;

      if (!netlifyStyleHandler && !nodeStyleHandler) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid function export. Expected function or { handler }.' }));
        return;
      }

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
          if (nodeStyleHandler) {
            const clonedReq = createBufferedRequest(req, bodyBuffer);
            await nodeStyleHandler(clonedReq, res);
            if (!res.writableEnded) {
              res.end();
            }
            return;
          }

          const result = await netlifyStyleHandler(event);

          res.writeHead(result.statusCode, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          });

          res.end(result.body);
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
  console.log(`${req.method} ${req.url}`);
  
  if (req.url.startsWith('/.netlify/functions/')) {
    const functionName = req.url.split('/.netlify/functions/')[1].split('/')[0];
    return createFunctionHandler(functionName)(req, res);
  }
  
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`🚀 Function server running on http://localhost:${PORT}`);
  console.log(`📡 Ready to serve functions at /.netlify/functions/*`);
});

process.on('SIGINT', () => {
  console.log('👋 Shutting down function server');
  server.close();
  process.exit(0);
});
