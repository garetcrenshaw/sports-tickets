# Vercel Webhook Deployment Fix

## Problem
Stripe webhook failing with HTTP 401 on Vercel preview deployments due to Deployment Protection requiring authentication.

**Error**: `Event checkout.session.completed failed delivery with HTTP 401. Response is Vercel's authentication page.`

## Root Cause
- Preview deployments have Deployment Protection enabled by default
- Stripe cannot provide authentication credentials
- Production deployments are public by default

## Solutions

### Option 1: Deploy to Production (Recommended)
1. Push code to main branch
2. Deploy to production URL (e.g., `https://sports-tickets.vercel.app`)
3. Update Stripe webhook endpoint to production URL
4. Ensure Deployment Protection is set to "None" or "Visitors" in Vercel project settings

### Option 2: Protection Bypass for Preview (Temporary)
1. Go to Vercel project settings > Deployment Protection
2. Generate Protection Bypass for Automation secret
3. Append to webhook URL: `?x-vercel-protection-bypass=SECRET&x-vercel-set-bypass-cookie=true`
4. **Note**: Regenerating the secret invalidates old deploys - redeploy after changing

## Implementation Steps

### 1. Deploy to Production
```bash
git checkout main
git merge sandbox  # or your feature branch
git push origin main
```

### 2. Update Stripe Webhook URL
- Go to Stripe Dashboard > Webhooks
- Update endpoint URL to production: `https://sports-tickets.vercel.app/api/stripe-webhook`
- Ensure webhook secret matches `STRIPE_WEBHOOK_SECRET` in environment

### 3. Verify Deployment Protection
- In Vercel dashboard, go to Project Settings > Deployment Protection
- For production: Set to "None" or "Visitors" (public access)
- For preview: Can keep protected if using bypass

### 4. Test Webhook
```bash
stripe trigger checkout.session.completed
```

### 5. Verify in Vercel Logs
- Check deployment logs for webhook processing
- Confirm Supabase ticket insert
- Verify Resend email delivery

## Code Changes Made

### Enhanced Webhook Handler (`/api/stripe-webhook/index.js`)
- ✅ Added `console.log('Webhook received:', event.type)` logging
- ✅ QR code format: `ticket:${session.id}`
- ✅ Database field: `qr_code` (data URL)
- ✅ Status: `'active'` instead of `'purchased'`
- ✅ Email: `from: 'tickets@sports-tickets.com'`, `subject: 'Your Sports Ticket'`

### Environment Variables Required
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`

## Testing Checklist
- [ ] Code deployed to production
- [ ] Stripe webhook URL updated
- [ ] Deployment Protection configured
- [ ] `stripe trigger checkout.session.completed` succeeds
- [ ] Vercel logs show webhook processing
- [ ] Supabase ticket created with QR code
- [ ] Email sent via Resend with QR code

## No Local Hacks
Webhook must work identically on Vercel - no local development workarounds.
