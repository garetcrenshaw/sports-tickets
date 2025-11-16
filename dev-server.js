// Simple Express server for local development
// Mimics Netlify function endpoints

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Import our functions
const createTicket = require('./netlify/functions/create-ticket.js').handler;

console.log('🚀 Starting local development server...');
console.log('📍 Frontend: http://localhost:5173');
console.log('🔧 Functions: http://localhost:8888/.netlify/functions/*');

// Mock Netlify function context
const createNetlifyContext = (event) => ({
  body: JSON.stringify(event.body),
  headers: event.headers || {},
  httpMethod: event.method || 'POST',
  path: event.path || '/.netlify/functions/create-ticket'
});

// Route to mimic Netlify functions
app.all('/.netlify/functions/:functionName', async (req, res) => {
  const { functionName } = req.params;

  console.log(`📡 Calling function: ${functionName}`);
  console.log(`📝 Method: ${req.method}`);
  console.log(`📦 Body:`, req.body);

  try {
    let result;

    switch (functionName) {
      case 'create-ticket':
        const context = createNetlifyContext({
          body: req.body,
          headers: req.headers,
          method: req.method,
          path: req.path
        });

        result = await createTicket(context, {});
        break;

      default:
        return res.status(404).json({ error: `Function ${functionName} not found` });
    }

    console.log('✅ Function result:', result);

    // Set status code
    res.status(result.statusCode || 200);

    // Set headers
    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => {
        res.set(key, value);
      });
    }

    // Send response
    if (typeof result.body === 'string') {
      res.send(result.body);
    } else {
      res.json(result.body);
    }

  } catch (error) {
    console.error('❌ Function error:', error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: 'development'
  });
});

const PORT = process.env.PORT || 8888;

app.listen(PORT, () => {
  console.log(`🌐 Local function server running on port ${PORT}`);
  console.log(`💡 Test functions at: http://localhost:${PORT}/.netlify/functions/create-ticket`);
  console.log(`🔄 Make sure Vite is also running on port 5173`);
});
