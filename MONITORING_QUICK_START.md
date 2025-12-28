# Monitoring Quick Start Guide
**Status:** Code deployed, awaiting Sentry project creation

---

## ✅ What's Already Done

1. ✅ Sentry packages installed (`@sentry/react`, `@sentry/node`, `@vercel/analytics`)
2. ✅ Frontend Sentry integration configured
3. ✅ Backend Sentry integration configured
4. ✅ Error tracking added to critical paths:
   - Stripe webhook handler
   - Email queue worker
   - Checkout creation
5. ✅ Vercel Analytics enabled
6. ✅ Test endpoint created (`/api/test-sentry`)
7. ✅ Documentation created (`MONITORING_SETUP.md`)

---

## 🚀 Next Steps (5 minutes)

### Step 1: Create Sentry Projects

1. Go to [sentry.io](https://sentry.io) and sign up/login
2. Create **two projects**:
   - **Frontend Project:**
     - Platform: **React**
     - Project name: `gameday-tickets-frontend`
   - **Backend Project:**
     - Platform: **Node.js**
     - Project name: `gameday-tickets-backend`

3. Copy the DSNs (Data Source Names) from each project

### Step 2: Add Environment Variables to Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add the following:

**For Production:**
```
SENTRY_DSN=https://[BACKEND_DSN_FROM_SENTRY]
VITE_SENTRY_DSN=https://[FRONTEND_DSN_FROM_SENTRY]
```

**For Preview/Development (optional):**
```
SENTRY_DSN=https://[BACKEND_DSN_FROM_SENTRY]
VITE_SENTRY_DSN=https://[FRONTEND_DSN_FROM_SENTRY]
SENTRY_ENABLE_DEV=true
VITE_SENTRY_ENABLE_DEV=true
```

3. **Redeploy** your project (or wait for next deployment)

### Step 3: Test the Integration

Once deployed, test that Sentry is working:

```bash
# Test exception capture
curl "https://www.gamedaytickets.io/api/test-sentry?action=exception"

# Test message capture
curl "https://www.gamedaytickets.io/api/test-sentry?action=message"
```

Then check your Sentry dashboard - you should see the test events appear within seconds!

### Step 4: Set Up Alerts (Recommended)

1. Go to Sentry Dashboard → Alerts → Create Alert Rule
2. Create alerts for:
   - **Critical Errors:** Tag `critical:true`
   - **Webhook Failures:** Tag `component:stripe-webhook`
   - **Email Failures:** Tag `component:email-queue-worker`

See `MONITORING_SETUP.md` for detailed alert configuration.

---

## 🎯 What You'll Get

Once configured, you'll have:

- ✅ **Real-time error tracking** - See errors as they happen
- ✅ **Performance monitoring** - Track API response times
- ✅ **Session replay** - Watch user sessions when errors occur
- ✅ **Release tracking** - See which deployments cause issues
- ✅ **Email/Slack alerts** - Get notified of critical errors immediately
- ✅ **Vercel Analytics** - Track page views and function usage

---

## 📚 Full Documentation

See `MONITORING_SETUP.md` for:
- Complete setup instructions
- Alert configuration
- Response protocols
- Troubleshooting
- Cost management

---

**Estimated Time to Complete:** 5-10 minutes  
**Status:** Ready to configure Sentry projects

