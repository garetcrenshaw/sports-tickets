const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;

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

function createFunctionHandler(functionName) {
  return async (req, res) => {
    try {
      const functionPath = path.join(__dirname, 'netlify', 'functions', `${functionName}.js`);
      
      if (!fs.existsSync(functionPath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Function not found' }));
        return;
      }

      delete require.cache[require.resolve(functionPath)];
      const handler = require(functionPath);
      
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const event = {
            httpMethod: req.method,
            body: req.method === 'POST' ? body : null,
            headers: req.headers,
            queryStringParameters: {},
            path: req.url
          };

          const result = await handler.handler(event);
          
          res.writeHead(result.statusCode, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          });
          
          res.end(result.body);
        } catch (error) {
          console.error('Function error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
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
