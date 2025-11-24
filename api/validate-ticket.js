const { getTicketById, markTicketValidated, getParkingPassById, markParkingPassValidated } = require('../src/lib/db');
const { requireEnv } = require('../src/lib/stripe');
const { setCors, sendJson, end, readJson } = require('./_utils');

async function getItemById(itemId) {
  // Try tickets first
  let item = await getTicketById(itemId);
  if (item) return { ...item, type: 'ticket' };

  // Try parking passes
  item = await getParkingPassById(itemId);
  if (item) return { ...item, type: 'parking' };

  return null;
}

async function markItemValidated(itemId, type) {
  if (type === 'ticket') {
    return await markTicketValidated(itemId);
  } else if (type === 'parking') {
    return await markParkingPassValidated(itemId);
  }
  throw new Error('Invalid item type');
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return end(res, 200);
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const payload = await readJson(req);
    const { ticketId, password } = payload || {};

    if (!ticketId) {
      return sendJson(res, 400, { error: 'ticketId is required' });
    }

    const requiredPassword = requireEnv('VALIDATE_PASSWORD');
    if (!password || password !== requiredPassword) {
      return sendJson(res, 401, { error: 'Invalid validation password' });
    }

    const item = await getItemById(ticketId);

    if (!item) {
      return sendJson(res, 404, { error: 'Item not found' });
    }

    if (item.status === 'validated') {
      return sendJson(res, 200, { valid: false, item, message: `${item.type === 'ticket' ? 'Ticket' : 'Parking pass'} already validated` });
    }

    const updatedItem = await markItemValidated(ticketId, item.type);
    return sendJson(res, 200, { valid: true, item: updatedItem });
  } catch (error) {
    console.error('VALIDATE ITEM ERROR:', error);
    return sendJson(res, 500, { error: error.message });
  }
};

