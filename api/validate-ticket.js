const { getTicketById, markTicketValidated } = require('../src/lib/db');
const { requireEnv } = require('../src/lib/stripe');
const { setCors, sendJson, end, readJson } = require('./_utils');

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

    const ticket = await getTicketById(ticketId);

    if (!ticket) {
      return sendJson(res, 404, { error: 'Ticket not found' });
    }

    if (ticket.status === 'validated') {
      return sendJson(res, 200, { valid: false, ticket, message: 'Ticket already validated' });
    }

    const updatedTicket = await markTicketValidated(ticketId);
    return sendJson(res, 200, { valid: true, ticket: updatedTicket });
  } catch (error) {
    console.error('VALIDATE TICKET ERROR:', error);
    return sendJson(res, 500, { error: error.message });
  }
};

