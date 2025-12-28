import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Vercel serverless function
export default async function handler(req, res) {
  // Handle preflight CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { ticketId, password } = req.body || {};

    if (!ticketId) {
      return res.status(400).json({ error: 'ticketId is required' });
    }

    const requiredPassword = process.env.VALIDATE_PASSWORD || 'gameday2024';
    if (!password || password !== requiredPassword) {
      return res.status(401).json({ error: 'Invalid validation password' });
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
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticketData = ticket.data;

    if (ticketData.status === 'validated') {
      return res.status(200).json({
        valid: false,
        ticket: {
          ...ticketData,
          ticket_type: ticketType
        },
        message: 'Ticket already validated'
      });
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
      return res.status(500).json({ error: 'Failed to validate ticket' });
    }

    return res.status(200).json({
      valid: true,
      ticket: {
        ...updatedTicket,
        ticket_type: ticketType
      }
    });

  } catch (error) {
    console.error('Validate ticket error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
