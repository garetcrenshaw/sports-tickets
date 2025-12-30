# Verifying Sentry is Working

## ✅ Test Results

Your test commands worked! The endpoints responded correctly:
- `?action=exception` → Error captured
- `?action=message` → Message sent

Now let's verify events are appearing in Sentry.

---

## Step 1: Check for Events in Sentry

### Option A: Check Issues Tab

1. In Sentry, click on your **Node.js project** (`gameday-tickets-backend`)
2. Look at the **"Issues"** tab (left sidebar)
3. You should see:
   - "Test exception for Sentry monitoring" (from `?action=exception`)
   - "Test message for Sentry monitoring" (from `?action=message`)

### Option B: Check Events Stream

1. In your Node.js project, go to **"Issues"** → Click on any issue
2. You should see event details with:
   - Stack trace
   - Request information
   - Tags (like `component: test-sentry`, `test: true`)

---

## Step 2: Set Up a Dashboard (Optional)

You can use one of the templates, or create a custom one:

### Recommended: Backend Template

1. Click **"Backend Template"** → **"Add Dashboard"**
2. This will show:
   - Issues count
   - Performance metrics
   - Error rates
   - Response times

This is perfect for monitoring your API routes!

---

## Step 3: Verify Frontend (React) is Working

Test the frontend Sentry integration:

1. Visit your site: `https://www.gamedaytickets.io`
2. Open browser console (F12)
3. Type this and press Enter:
   ```javascript
   throw new Error('Test frontend error from console')
   ```
4. Check your **React project** in Sentry
5. You should see the error appear in the Issues tab

---

## Step 4: Set Up Alerts (Important!)

Now that monitoring is working, set up alerts for critical errors:

### Alert 1: Critical Errors

1. Go to Sentry → **Alerts** → **Create Alert Rule**
2. Configure:
   - **Name:** "Critical Errors"
   - **Condition:** "An issue is created"
   - **Filters:** 
     - Tags: `critical` equals `true`
   - **Actions:**
     - Send email to: your-email@example.com
   - Click **"Save Rule"**

### Alert 2: Webhook Failures

1. Create another alert:
   - **Name:** "Stripe Webhook Failures"
   - **Condition:** "An issue is created"
   - **Filters:**
     - Tags: `component` equals `stripe-webhook`
   - **Actions:**
     - Send email to: your-email@example.com

### Alert 3: Email Queue Failures

1. Create another alert:
   - **Name:** "Email Delivery Failures"
   - **Condition:** "An issue is created"
   - **Filters:**
     - Tags: `component` equals `email-queue-worker`
   - **Actions:**
     - Send email to: your-email@example.com

---

## What to Look For

### ✅ Success Indicators

- Events appearing in Issues tab within 30 seconds
- Stack traces showing correct file paths
- Tags showing `component: test-sentry`, `test: true`
- Request details showing the endpoint that was called

### ❌ If Events Don't Appear

1. **Wait 30-60 seconds** - Sentry can take a moment
2. **Check environment variables** in Vercel:
   - `SENTRY_DSN` should be set
   - `VITE_SENTRY_DSN` should be set
3. **Check deployment** - Make sure latest deployment completed
4. **Check project** - Make sure you're looking at the right project (Node.js vs React)
5. **Check filters** - Make sure no filters are hiding events

---

## Next Steps

Once you confirm events are appearing:

1. ✅ **Set up alerts** (see Step 4 above)
2. ✅ **Monitor for real errors** - Check dashboard daily
3. ✅ **Review performance** - Check slow API endpoints
4. ✅ **Set up Slack integration** (optional) - For team notifications

---

## Quick Reference

**Test Endpoints:**
- Backend: `https://www.gamedaytickets.io/api/test-sentry?action=exception`
- Frontend: Open console and throw an error

**Sentry Projects:**
- Frontend: React project
- Backend: Node.js project

**Environment Variables:**
- `SENTRY_DSN` → Node.js project DSN
- `VITE_SENTRY_DSN` → React project DSN

---

**Status:** Tests passed! Now verify events in Sentry dashboard.

