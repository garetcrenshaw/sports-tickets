-- Add marketing_consent column to tickets table
-- This stores whether the customer opted in to marketing emails during checkout

ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN tickets.marketing_consent IS 'Marketing email consent: true = opted in, false = opted out, NULL = not collected';

-- Create index for querying opted-in customers
CREATE INDEX IF NOT EXISTS idx_tickets_marketing_consent 
ON tickets(marketing_consent) 
WHERE marketing_consent = true;

-- Example query to get all customers who opted in to marketing
-- SELECT DISTINCT buyer_email, buyer_name, MAX(created_at) as last_purchase
-- FROM tickets 
-- WHERE marketing_consent = true 
-- GROUP BY buyer_email, buyer_name
-- ORDER BY last_purchase DESC;

