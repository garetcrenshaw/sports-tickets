import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/validate-pin
 * Validates a scanner PIN and returns event info
 * 
 * Request body: { pin: "1234" }
 * Response: { valid: true, event_id: "1", event_name: "Game Day", scanner_name: "Main Gate" }
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

  const { pin } = req.body;

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
    // Look up the PIN
    const { data: pinData, error } = await supabase
      .from('scanner_pins')
      .select('*')
      .eq('pin', pin)
      .eq('is_active', true)
      .single();

    if (error || !pinData) {
      console.log(`❌ Invalid PIN attempt: ${pin}`);
      return res.status(401).json({ 
        valid: false, 
        error: 'Invalid PIN' 
      });
    }

    // Update last_used_at timestamp
    await supabase
      .from('scanner_pins')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', pinData.id);

    console.log(`✅ PIN validated: ${pin} for event ${pinData.event_name}`);

    return res.status(200).json({
      valid: true,
      event_id: pinData.event_id,
      event_name: pinData.event_name,
      scanner_name: pinData.scanner_name || 'Scanner'
    });

  } catch (err) {
    console.error('PIN validation error:', err.message);
    return res.status(500).json({ 
      valid: false, 
      error: 'Server error' 
    });
  }
}

