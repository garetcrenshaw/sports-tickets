const { createClient } = require('@supabase/supabase-js');
const { requireEnv } = require('./stripe');

let supabase;

function getSupabase() {
  if (!supabase) {
    const url = requireEnv('SUPABASE_URL');
    const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    supabase = createClient(url, key);
  }
  return supabase;
}

async function createTickets(ticketRows) {
  const client = getSupabase();
  const { data, error } = await client
    .from('tickets')
    .insert(ticketRows)
    .select();

  if (error) {
    console.error('createTickets error:', error);
    throw error;
  }

  return data;
}

async function getTicketById(ticketId) {
  const client = getSupabase();
  const { data, error } = await client
    .from('tickets')
    .select('*')
    .eq('id', ticketId)
    .maybeSingle();

  if (error) {
    console.error('getTicketById error:', error);
    throw error;
  }

  return data;
}

async function markTicketValidated(ticketId) {
  const client = getSupabase();
  const { data, error } = await client
    .from('tickets')
    .update({
      status: 'validated',
      validated_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('markTicketValidated error:', error);
    throw error;
  }

  return data;
}

module.exports = {
  createTickets,
  getTicketById,
  markTicketValidated,
};
