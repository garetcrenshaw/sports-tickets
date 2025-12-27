# Email Flow Diagnostic Checklist

## Step 1: Check if Webhook is Being Called

1. Go to Stripe Dashboard: https://dashboard.stripe.com/test/webhooks
2. Find your webhook endpoint
3. Click on it to see recent events
4. Look for `checkout.session.completed` events
5. Check if they show "Succeeded" or "Failed"

## Step 2: Check Supabase Records

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/xjvzehjpgbwiiuvsnflk
2. Go to Table Editor
3. Check `tickets` table - should have new records after purchase
4. Check `email_queue` table - should have records with `status: 'pending'`

## Step 3: Check Email Queue Worker

1. Go to Vercel Dashboard: https://vercel.com/garetcrenshaw/sports-tickets/logs
2. Filter for `/api/process-email-queue`
3. Check if cron is running (should run every minute)
4. Look for any errors

## Step 4: Check Resend

1. Go to Resend Dashboard: https://resend.com/emails
2. Check if any emails were attempted
3. Look for error messages

## Step 5: Manual Trigger (for testing)

You can manually trigger the email worker:
```bash
curl -X GET "https://gamedaytickets.io/api/process-email-queue" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Common Issues:

1. **No records in Supabase**: Webhook isn't being called or failing silently
2. **Records exist but status='pending'**: Email worker isn't running or failing
3. **Resend error**: API key issue or domain not verified
4. **No emails in Resend**: Emails aren't being sent (check logs)

