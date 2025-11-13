// functions/get-events.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async () => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('id, name')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Return real events or fallback
    const events = data.length > 0 ? data : [{ id: '1', name: 'GameDay Event' }];

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(events),
    };
  } catch (err) {
    console.error('GET EVENTS ERROR:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};