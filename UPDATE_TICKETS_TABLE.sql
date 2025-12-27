-- ================================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- Adds billing address and refund columns to tickets table
-- ================================================================

-- Add billing address columns
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS billing_zip TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS billing_city TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS billing_state TEXT;

-- Add refund tracking columns
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS refund_amount INTEGER; -- Amount in cents

-- Add index for zip code queries (for analytics)
CREATE INDEX IF NOT EXISTS idx_tickets_billing_zip ON tickets(billing_zip);

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tickets' 
ORDER BY ordinal_position;

