const { getTicketById, markTicketValidated } = require('../../src/lib/db');
const { requireEnv } = require('../../src/lib/stripe');

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { ticketId, password } = payload;

    if (!ticketId) {
      return jsonResponse(400, { error: 'ticketId is required' });
    }

    const requiredPassword = requireEnv('VALIDATE_PASSWORD');
    if (!password || password !== requiredPassword) {
      return jsonResponse(401, { error: 'Invalid validation password' });
    }

    const ticket = await getTicketById(ticketId);

    if (!ticket) {
      return jsonResponse(404, { error: 'Ticket not found' });
    }

    if (ticket.status === 'validated') {
      return jsonResponse(200, { valid: false, ticket, message: 'Ticket already validated' });
    }

    const updatedTicket = await markTicketValidated(ticketId);

    return jsonResponse(200, { valid: true, ticket: updatedTicket });
  } catch (error) {
    console.error('VALIDATE TICKET ERROR:', error);
    return jsonResponse(500, { error: error.message });
  }
};
