// functions/validate-ticket.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  const { ticketId } = JSON.parse(event.body);

  try {
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (error || !ticket) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Ticket not found' }) };
    }

    if (ticket.status === 'used') {
      return { statusCode: 200, body: JSON.stringify({ valid: false, ticket }) };
    }

    // Mark as used
    await supabase
      .from('tickets')
      .update({ status: 'used', used_at: new Date().toISOString() })
      .eq('id', ticketId);

    return { statusCode: 200, body: JSON.stringify({ valid: true, ticket }) };
  } catch (err) {
    console.error('VALIDATE ERROR:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};