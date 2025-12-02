const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Vercel serverless function
module.exports = async function handler(req, res) {
  // Handle preflight CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  try {
    const { ticketId, password } = req.body || {};

    if (!ticketId) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'ticketId is required' }));
      return;
    }

    const requiredPassword = process.env.VALIDATE_PASSWORD || 'gameday2024';
    if (!password || password !== requiredPassword) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Invalid validation password' }));
      return;
    }

    // Try tickets table first
    let ticket = await supabase
      .from('tickets')
      .select('*')
      .eq('ticket_id', ticketId)
      .maybeSingle();

    let ticketType = 'Admission Ticket';

    // If not found in tickets, try parking passes
    if (!ticket.data) {
      const parkingResult = await supabase
        .from('parking_passes')
        .select('*')
        .eq('ticket_id', ticketId)
        .maybeSingle();

      ticket = parkingResult;
      ticketType = 'Parking Pass';
    }

    if (!ticket.data) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Ticket not found' }));
      return;
    }

    const ticketData = ticket.data;

    if (ticketData.status === 'validated') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify({
        valid: false,
        ticket: {
          ...ticketData,
          ticket_type: ticketType
        },
        message: 'Ticket already validated'
      }));
      return;
    }

    // Update the ticket status
    const table = ticketType === 'Parking Pass' ? 'parking_passes' : 'tickets';
    const { data: updatedTicket, error: updateError } = await supabase
      .from(table)
      .update({
        status: 'validated',
        validated_at: new Date().toISOString(),
      })
      .eq('ticket_id', ticketId)
      .select()
      .single();

    if (updateError) {
      console.error('Ticket update error:', updateError);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to validate ticket' }));
      return;
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({
      valid: true,
      ticket: {
        ...updatedTicket,
        ticket_type: ticketType
      }
    }));

  } catch (error) {
    console.error('Validate ticket error:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
};
