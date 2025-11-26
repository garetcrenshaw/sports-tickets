import { createClient } from '@supabase/supabase-js';
import { requireEnv } from './stripe.js';

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
  if (!Array.isArray(ticketRows) || ticketRows.length === 0) {
    return [];
  }

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

async function createParkingPasses(passRows) {
  if (!Array.isArray(passRows) || passRows.length === 0) {
    return [];
  }

  const client = getSupabase();
  const { data, error } = await client
    .from('parking_passes')
    .insert(passRows)
    .select();

  if (error) {
    console.error('createParkingPasses error:', error);
    throw error;
  }

  return data;
}

async function getTicketById(ticketId) {
  const client = getSupabase();
  const { data, error } = await client
    .from('tickets')
    .select('*')
    .eq('ticket_id', ticketId)
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
    .eq('ticket_id', ticketId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('markTicketValidated error:', error);
    throw error;
  }

  return data;
}

async function getParkingPassById(ticketId) {
  const client = getSupabase();
  const { data, error } = await client
    .from('parking_passes')
    .select('*')
    .eq('ticket_id', ticketId)
    .maybeSingle();

  if (error) {
    console.error('getParkingPassById error:', error);
    throw error;
  }

  return data;
}

async function markParkingPassValidated(ticketId) {
  const client = getSupabase();
  const { data, error } = await client
    .from('parking_passes')
    .update({
      status: 'validated',
      validated_at: new Date().toISOString(),
    })
    .eq('ticket_id', ticketId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('markParkingPassValidated error:', error);
    throw error;
  }

  return data;
}

export {
  createTickets,
  createParkingPasses,
  getTicketById,
  markTicketValidated,
  getParkingPassById,
  markParkingPassValidated,
};
