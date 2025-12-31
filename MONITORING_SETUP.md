# Monitoring & Observability Setup
**Date:** December 28, 2025  
**Status:** ✅ Fully Configured  
**Platform:** GAMEDAY TICKETS

---

## Overview

This document describes the complete monitoring and observability setup for the GAMEDAY TICKETS platform. We use **Sentry** for error tracking and **Vercel Analytics** for performance monitoring.

---

## Components

### 1. Sentry Error Tracking

**Purpose:** Capture, track, and alert on errors across frontend and backend

**Coverage:**
- ✅ Frontend (React/Vite)
- ✅ API Routes (Serverless Functions)
- ✅ Critical paths: Webhook handler, Email queue worker, Checkout creation

**Features:**
- Automatic error capture
- Performance monitoring (10% sample rate in production)
- Session replay (10% sample rate, 100% on errors)
- Release tracking with Git commits
- User context tracking
- Custom tags for critical components

---

## Setup Instructions

### Step 1: Create Sentry Project

1. Go to [Sentry.io](https://sentry.io) and sign up/login
2. Create a new project:
   - **Platform:** React (for frontend)
   - **Platform:** Node.js (for backend)
3. Copy the DSNs (Data Source Names) for both projects

### Step 2: Configure Environment Variables

Add the following to your Vercel project environment variables:

**Production:**
```
SENTRY_DSN=https://[YOUR_PROJECT_DSN]@[ORG_ID].ingest.sentry.io/[PROJECT_ID]
VITE_SENTRY_DSN=https://[YOUR_FRONTEND_DSN]@[ORG_ID].ingest.sentry.io/[PROJECT_ID]
```

**Optional (for development):**
```
SENTRY_ENABLE_DEV=true  # Enable Sentry in development mode
VITE_SENTRY_ENABLE_DEV=true
```

**Note:** DSNs are automatically masked in logs and should never be committed to Git.

### Step 3: Verify Installation

The following files have been configured:

**Frontend:**
- `src/lib/sentry.js` - Sentry initialization for React
- `src/main.jsx` - Sentry initialized at app startup

**Backend:**
- `api/lib/sentry.js` - Sentry initialization for serverless functions
- `api/stripe-webhook/index.js` - Error tracking in webhook handler
- `api/process-email-queue/index.js` - Error tracking in email worker
- `api/create-checkout/index.js` - Error tracking in checkout creation

### Step 4: Test Sentry Integration

Use the test endpoint to verify Sentry is working:

```bash
# Test exception capture
curl "https://www.gamedaytickets.io/api/test-sentry?action=exception"

# Test message capture
curl "https://www.gamedaytickets.io/api/test-sentry?action=message"

# Test with context
curl "https://www.gamedaytickets.io/api/test-sentry?action=context"
```

Check your Sentry dashboard to confirm events are being received.

---

## Vercel Analytics

**Status:** ✅ Enabled

**Configuration:**
- Automatically enabled when `@vercel/analytics` package is installed
- No additional configuration needed
- Tracks page views, API calls, and function invocations

**View Analytics:**
1. Go to Vercel Dashboard → Your Project → Analytics
2. View real-time metrics, page views, and performance data

---

## Alerting Setup

### Sentry Alerts

**Critical Error Alerts:**

1. **Webhook Failures**
   - **Trigger:** Error in `stripe-webhook` component
   - **Tags:** `component:stripe-webhook`, `critical:true`
   - **Action:** Email + Slack notification

2. **Email Delivery Failures**
   - **Trigger:** Error in `email-queue-worker` component
   - **Tags:** `component:email-queue-worker`, `critical:true`
   - **Action:** Email + Slack notification

3. **Checkout Creation Failures**
   - **Trigger:** Error in `create-checkout` component
   - **Tags:** `component:create-checkout`, `critical:true`
   - **Action:** Email notification

**Setup Steps:**

1. Go to Sentry Dashboard → Alerts → Create Alert Rule
2. Configure:
   - **Condition:** "An issue is created"
   - **Filters:** 
     - Tags: `critical` equals `true`
     - OR Tags: `component` equals `stripe-webhook`
   - **Actions:** 
     - Send email to: your-email@example.com
     - Send to Slack: #alerts channel (if configured)

3. Repeat for each critical component

### Vercel Alerts

**Function Failures:**
- Vercel automatically sends email alerts for function failures
- Configure in: Vercel Dashboard → Settings → Notifications

---

## Monitoring Dashboard

### Sentry Dashboard

**Key Views:**
- **Issues:** All errors grouped by type
- **Performance:** API endpoint performance metrics
- **Releases:** Track errors by deployment
- **Users:** Error impact by user

**Critical Metrics to Monitor:**
- Error rate (should be < 0.1%)
- P95 response time for API routes
- Webhook success rate (should be 100%)
- Email delivery success rate (should be > 99%)

### Vercel Analytics Dashboard

**Key Metrics:**
- Page views
- Function invocations
- Function duration
- Error rate

---

## Response Protocol

### When an Alert Fires

1. **Immediate Actions:**
   - Check Sentry dashboard for error details
   - Review error stack trace and context
   - Check Vercel logs for additional details

2. **Investigation:**
   - Identify root cause
   - Check if issue is affecting users
   - Review recent deployments

3. **Resolution:**
   - Fix the issue
   - Deploy fix
   - Verify in Sentry that errors stop

4. **Post-Mortem (for critical issues):**
   - Document root cause
   - Update monitoring/alerts if needed
   - Add tests to prevent regression

### Critical Error Response Times

- **Webhook failures:** < 5 minutes
- **Email delivery failures:** < 15 minutes
- **Checkout failures:** < 10 minutes
- **Other errors:** < 1 hour

---

## Best Practices

### Error Handling

1. **Always capture exceptions:**
   ```javascript
   try {
     // risky code
   } catch (error) {
     captureException(error, {
       tags: { component: 'my-component' },
       extra: { context: 'additional info' }
     });
     throw error; // Re-throw if needed
   }
   ```

2. **Use tags for filtering:**
   - `component`: Which part of the system
   - `critical`: Whether this is a critical path
   - `stage`: Where in the process (e.g., 'checkout-processing')

3. **Add context:**
   - Include relevant IDs (session_id, ticket_id, etc.)
   - Include user information (email, if available)
   - Include request details (method, URL, headers)

### Performance Monitoring

- Sentry automatically tracks performance for API routes
- Review slow endpoints regularly
- Optimize endpoints with P95 > 1 second

### Release Tracking

- Sentry automatically tracks releases via `VERCEL_GIT_COMMIT_SHA`
- Review errors by release to catch regressions early
- Use releases to track deployment impact

---

## Troubleshooting

### Sentry Not Capturing Errors

1. **Check DSN is set:**
   ```bash
   vercel env ls | grep SENTRY_DSN
   ```

2. **Check Sentry is initialized:**
   - Look for "Sentry initialized" in logs
   - If missing, check import paths

3. **Check environment:**
   - Sentry is disabled in development by default
   - Set `SENTRY_ENABLE_DEV=true` to test locally

### Too Many Events

- Adjust `tracesSampleRate` in `src/lib/sentry.js` and `api/lib/sentry.js`
- Current: 10% in production, 100% in development
- Reduce if hitting rate limits

### Missing Context

- Ensure `captureException` includes `extra` and `tags`
- Check that user context is set when available

---

## Cost Management

### Sentry Free Tier Limits

- **5,000 events/month**
- **10,000 performance units/month**
- **1,000 replay sessions/month**

### Staying Within Limits

1. **Sample rates:**
   - Frontend: 10% traces, 10% replays
   - Backend: 10% traces
   - 100% on errors (always capture errors)

2. **Filter noise:**
   - Use `ignoreErrors` to filter expected errors
   - Use `beforeSend` to filter in development

3. **Monitor usage:**
   - Check Sentry dashboard → Settings → Usage
   - Set up alerts for approaching limits

---

## Maintenance

### Weekly Tasks

- Review Sentry dashboard for new errors
- Check error trends
- Review slow API endpoints

### Monthly Tasks

- Review alert configuration
- Check if new critical paths need monitoring
- Review and optimize sample rates

### Quarterly Tasks

- Review monitoring costs
- Update documentation
- Review and improve alerting rules

---

## Support

**Sentry Documentation:**
- [React SDK](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Node.js SDK](https://docs.sentry.io/platforms/node/)

**Vercel Analytics:**
- [Vercel Analytics Docs](https://vercel.com/docs/analytics)

**Issues:**
- Check Sentry dashboard for error details
- Review Vercel function logs
- Check this documentation for troubleshooting

---

## Changelog

**2025-12-30:**
- ✅ Critical Errors alert tested and verified working
- ✅ Email notifications confirmed receiving alerts
- ✅ Tags properly configured and visible in Sentry
- ✅ Fixed tag extraction bug in `captureException` function

**2025-12-28:**
- ✅ Initial Sentry integration (frontend + backend)
- ✅ Vercel Analytics enabled
- ✅ Critical path error tracking configured
- ✅ Test endpoint created
- ✅ Documentation created

---

**Last Updated:** December 30, 2025  
**Maintained By:** Development Team

