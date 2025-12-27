import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/validate-pin
 * Validates a scanner PIN against the events table and returns event info
 * 
 * Request body: { pin: "1234", staff_name: "John" }
 * Response: { valid: true, event_id: "1", event_name: "Gameday Empire Showcase" }
 */
export default async function handler(req, res) {
  // CORS headers for scanner app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pin, staff_name } = req.body;

  if (!pin || pin.length !== 4) {
    return res.status(400).json({ 
      valid: false, 
      error: 'PIN must be 4 digits' 
    });
  }

  // Initialize Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Look up the PIN in the events table
    const { data: eventData, error } = await supabase
      .from('events')
      .select('id, event_name, event_slug, venue_name, event_status')
      .eq('scanner_pin', pin)
      .eq('event_status', 'active')
      .single();

    if (error || !eventData) {
      console.log(`❌ Invalid PIN attempt: ${pin} by ${staff_name || 'unknown'}`);
      return res.status(401).json({ 
        valid: false, 
        error: 'Invalid PIN' 
      });
    }

    // Log the successful login
    console.log(`✅ PIN validated: ${pin} for "${eventData.event_name}" by ${staff_name || 'unknown'}`);

    // Optional: Log scanner sessions for analytics
    try {
      await supabase.from('scanner_sessions').insert({
        event_id: eventData.id,
        staff_name: staff_name || 'Unknown',
        pin_used: pin,
        started_at: new Date().toISOString()
      });
    } catch (logErr) {
      // Don't fail if logging fails - table might not exist yet
      console.log('Scanner session logging skipped (table may not exist)');
    }

    return res.status(200).json({
      valid: true,
      event_id: eventData.id,
      event_name: eventData.event_name,
      venue_name: eventData.venue_name
    });

  } catch (err) {
    console.error('PIN validation error:', err.message);
    return res.status(500).json({ 
      valid: false, 
      error: 'Server error' 
    });
  }
}
