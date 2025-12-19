-- Run this in your Supabase SQL Editor to diagnose email delivery

-- 1. Check current queue status
SELECT 
    status,
    COUNT(*) as count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM email_queue
GROUP BY status
ORDER BY status;

-- 2. Check any pending emails
SELECT 
    id,
    ticket_id,
    recipient_email,
    event_id,
    status,
    retry_count,
    created_at,
    sent_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_waiting
FROM email_queue
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check recent sent emails timing
SELECT 
    event_id,
    ticket_type,
    status,
    created_at,
    sent_at,
    EXTRACT(EPOCH FROM (sent_at - created_at)) as seconds_to_send
FROM email_queue
WHERE sent_at IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- 4. Check for failed emails
SELECT 
    id,
    ticket_id,
    recipient_email,
    event_id,
    status,
    retry_count,
    created_at
FROM email_queue
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;

