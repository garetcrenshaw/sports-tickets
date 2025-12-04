import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  console.log('=== SUPABASE TEST ===');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ 
      success: false,
      error: 'Missing Supabase environment variables' 
    });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL, 
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const testId = `test_${Date.now()}`;
    console.log('Testing insert with ID:', testId);
    
    const { data, error } = await supabase
      .from('tickets')
      .insert({
        ticket_id: testId,
        event_id: 'test_event',
        purchaser_name: 'Test User',
        purchaser_email: 'test@example.com',
        qr_code: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        status: 'active'
      })
      .select();

    if (error) {
      console.error('Insert error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message,
        code: error.code,
        details: error.details
      });
    }

    console.log('✅ Insert successful:', data);
    
    // Test idempotency - try to insert duplicate
    console.log('Testing idempotency with same ID...');
    const { data: existing } = await supabase
      .from('tickets')
      .select('ticket_id')
      .eq('ticket_id', testId)
      .single();
    
    return res.json({ 
      success: true, 
      message: 'Supabase insert test passed',
      insertedData: data,
      idempotencyCheck: existing ? 'Found duplicate (good)' : 'No duplicate found'
    });
  } catch (err) {
    console.error('Test error:', err);
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
}

