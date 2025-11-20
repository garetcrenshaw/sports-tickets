const { setCors, sendJson, end } = require('./_utils');

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return end(res, 200);
  }

  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    return sendJson(res, 200, [
      { id: 'general-admission', name: 'General Admission Ticket' },
    ]);
  } catch (error) {
    console.error('GET EVENTS ERROR:', error);
    return sendJson(res, 500, { error: error.message });
  }
};

