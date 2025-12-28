# Webhook 500 Error - Debug Plan

## Current Status
- ✅ Checkout creation works (200 response)
- ❌ Stripe webhook returns 500 error
- ❌ NO logs from webhook function at all (not even first console.log)
- ❌ `send-ticket.js` file deleted but Vercel may still have cached version

## Problem Analysis
The webhook is failing **before any code executes** - this means:
1. Module loading error (most likely - cached code)
2. Vercel is bundling old code with deleted `send-ticket.js`
3. Build cache is extremely persistent

## Action Plan

### Step 1: Get Exact Error Message
**YOU NEED TO DO THIS:**
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click on your webhook endpoint
3. Find the failed event (checkout.session.completed)
4. Click on it to see details
5. **Copy the EXACT error response body** - this will show what error Vercel is returning

### Step 2: Force Complete Cache Clear
**Option A: Via Vercel Dashboard**
1. Go to: https://vercel.com/garetcrenshaw-9092/sports-tickets/deployments
2. Click "..." on the newest deployment
3. Click "Redeploy"
4. **UNCHECK "Use existing Build Cache"**
5. Click "Redeploy"
6. Wait for deployment to finish

**Option B: Contact Vercel Support** (if Option A doesn't work)
- Email: support@vercel.com
- Subject: "Build cache not clearing despite unchecked option"
- Explain: Old cached file `api/send-ticket.js` is still being bundled despite being deleted

### Step 3: Verify Deployed Code
**Check what's actually deployed:**
1. After redeploy, go to deployment
2. Click "View Source" or check build logs
3. Verify `api/send-ticket.js` does NOT exist in the deployment
4. If it DOES exist, Vercel cache is the problem

### Step 4: Test Simple Endpoint First
**Verify functions work at all:**
1. Test: `https://gamedaytickets.io/api/health` - should return 200
2. Test: `https://gamedaytickets.io/api/test-webhook` - should return 200
3. If these fail, it's a broader deployment issue

### Step 5: Check Function Logs
**After redeploy, test purchase again:**
1. Make a test purchase
2. Go to: https://vercel.com/garetcrenshaw-9092/sports-tickets/deployments
3. Click the deployment
4. Look for "Functions" tab or "Logs" tab
5. Check if ANY logs appear from `api/stripe-webhook`

## If Still Not Working

### Nuclear Option: Rename Project Directory
If cache is that persistent, we might need to:
1. Create a completely new Vercel project
2. Deploy the same code to new project
3. Update Stripe webhook URL to new project
4. This forces 100% fresh build

### Alternative: Check for Import Issues
Run this locally to check for any hidden imports:
```bash
cd /Users/garetcrenshaw/Desktop/sports-tickets
grep -r "send-ticket\|sendTicket" api/ src/
```

## Next Steps After Webhook Works
Once webhook is working:
1. ✅ Verify tickets are created in Supabase
2. ✅ Verify emails are sent with QR codes
3. ✅ Test full end-to-end purchase flow
4. 🚀 Then optimize checkout speed (as requested)

## Most Important Right Now
**Get the exact error message from Stripe webhook logs** - this will tell us exactly what's failing.

