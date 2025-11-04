import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('Testing Supabase connection...');
console.log('URL:', process.env.SUPABASE_URL || 'MISSING');
console.log('Key:', process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'MISSING');

const testData = {
  stripe_session_id: 'test_' + Date.now(),
  event_id: 1,
  user_email: 'test@example.com',
  qr_code: 'TEST_QR',
  status: 'paid'
};

const { data, error } = await supabase
  .from('tickets 2.0')
  .insert(testData)
  .select();  // ← THIS RETURNS THE ROW

if (error) {
  console.error('INSERT FAILED:', error.message);
} else {
  console.log('SUCCESS! ROW INSERTED:', data[0].id);
}