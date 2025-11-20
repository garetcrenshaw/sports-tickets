const DEFAULT_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function setCors(res, extra = {}) {
  const headers = { ...DEFAULT_CORS_HEADERS, ...extra };
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  setCors(res, extraHeaders);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function end(res, statusCode = 200) {
  res.statusCode = statusCode;
  res.end();
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function readJson(req) {
  const raw = await readBody(req);
  if (!raw) return {};
  return JSON.parse(raw);
}

async function readRawBody(req) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = {
  setCors,
  sendJson,
  end,
  readJson,
  readRawBody,
};

