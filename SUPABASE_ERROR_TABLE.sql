-- Add error logging table for audit trail (Ticketmaster-style)
CREATE TABLE IF NOT EXISTS errors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT,
  error TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_errors_event_id ON errors(event_id);
CREATE INDEX IF NOT EXISTS idx_errors_timestamp ON errors(timestamp DESC);

-- Enable RLS (but service_role bypasses it)
ALTER TABLE errors ENABLE ROW LEVEL SECURITY;

-- Optional: Create a policy for read-only access with anon key (for debugging dashboard)
CREATE POLICY "Allow anon read access" ON errors
  FOR SELECT
  TO anon
  USING (true);

