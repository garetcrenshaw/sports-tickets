# How to Get Vercel Function Logs

The Stripe error just shows a generic 500 - we need the ACTUAL error from Vercel's logs.

## Method 1: Via Deployment Logs (Easiest)

1. Go to: https://vercel.com/garetcrenshaw-9092/sports-tickets/deployments
2. Click on the **NEWEST deployment** (the one that just failed)
3. Click on **"Logs"** tab (should be near the top)
4. Scroll down to find the webhook invocation
5. Look for any red error messages
6. **Copy the full error** - this will show what's actually failing

## Method 2: Via Function Invocations

1. Go to: https://vercel.com/garetcrenshaw-9092/sports-tickets
2. Click **"Functions"** in the left sidebar (or go to Settings → Functions)
3. Look for `api/stripe-webhook`
4. Click on it
5. You should see a list of invocations
6. Click on the failed one
7. View the logs

## Method 3: Via Real-time Logs

1. Go to: https://vercel.com/garetcrenshaw-9092/sports-tickets
2. Click **"Logs"** in the left sidebar
3. Make a test purchase
4. Watch the logs in real-time
5. Look for errors from `api/stripe-webhook`

## What We're Looking For

We need to see one of these:
- Module load error mentioning `send-ticket.js`
- Error about missing `RESEND_API_KEY` from `src/lib/stripe.js`
- Any stack trace showing what file is failing
- Any error that shows the actual problem

## If You Can't Access Logs

If you can't find the logs tab, try:
1. Check if you're on the correct Vercel account
2. Try going directly to: `https://vercel.com/garetcrenshaw-9092/sports-tickets/logs`
3. Or contact Vercel support and ask them to check the logs for deployment X

