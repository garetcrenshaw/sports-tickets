# Setting Up Additional Sentry Alerts

**Date:** December 30, 2025  
**Purpose:** Guide for creating specific component alerts and performance monitoring

---

## ✅ Pre-Check: Component Tags Already Configured

Your code is already properly tagging errors:
- ✅ `stripe-webhook` - Tagged in `api/stripe-webhook/index.js`
- ✅ `email-queue-worker` - Tagged in `api/process-email-queue/index.js`
- ✅ `create-checkout` - Tagged in `api/create-checkout/index.js`

All errors from these components will automatically include the `component` tag, so alerts will work immediately.

---

## Step 1: Create Component-Specific Alerts

### Alert 1: Stripe Webhook Failures

1. **Go to Sentry Dashboard:**
   - Navigate to: **Alerts** → **Create Alert Rule**
   - Or: **Issues** → **Alerts** → **Create Alert Rule**

2. **Select Alert Type:**
   - Choose **"Issue Alert"** (not Metric Alert)

3. **Configure Alert:**
   - **Name:** `Stripe Webhook Failures`
   - **Description:** `Alert when Stripe webhook processing fails`

4. **Set Conditions:**
   - **WHEN:** `An event is captured` → Select **"A new issue is created"**
   - **IF:** Click **"Add condition"** → Select **"The event's tags match"**
     - **Tag:** `component`
     - **Operator:** `equals`
     - **Value:** `stripe-webhook`
   - **THEN:** Click **"Add action"** → Select **"Send a notification to"**
     - **Email:** `garetcrenshaw@gmail.com`

5. **Save Alert:**
   - Click **"Save Rule"** or **"Create Alert Rule"**

---

### Alert 2: Email Delivery Failures

1. **Create New Alert Rule:**
   - Click **"Create Alert Rule"** again (or duplicate the previous one)

2. **Select Alert Type:**
   - Choose **"Issue Alert"**

3. **Configure Alert:**
   - **Name:** `Email Delivery Failures`
   - **Description:** `Alert when email queue worker fails to send emails`

4. **Set Conditions:**
   - **WHEN:** `An event is captured` → **"A new issue is created"**
   - **IF:** **"The event's tags match"**
     - **Tag:** `component`
     - **Operator:** `equals`
     - **Value:** `email-queue-worker`
   - **THEN:** **"Send a notification to"**
     - **Email:** `garetcrenshaw@gmail.com`

5. **Save Alert**

---

### Alert 3: Checkout Creation Failures

1. **Create New Alert Rule:**
   - Click **"Create Alert Rule"** → **"Issue Alert"**

2. **Configure Alert:**
   - **Name:** `Checkout Creation Failures`
   - **Description:** `Alert when Stripe checkout session creation fails`

3. **Set Conditions:**
   - **WHEN:** `An event is captured` → **"A new issue is created"**
   - **IF:** **"The event's tags match"**
     - **Tag:** `component`
     - **Operator:** `equals`
     - **Value:** `create-checkout`
   - **THEN:** **"Send a notification to"**
     - **Email:** `garetcrenshaw@gmail.com`

4. **Save Alert**

---

## Step 2: Create Performance Monitoring Alerts

### Alert 4: Slow API Endpoints (P95 > 1 second)

**Note:** Performance alerts require Sentry Performance Monitoring to be enabled (which it is - we set `tracesSampleRate: 0.1`).

1. **Go to Sentry Dashboard:**
   - Navigate to: **Alerts** → **Create Alert Rule**
   - On the "Select Alert" screen, select **"Performance"** section
   - Choose **"Duration"** (this tracks transaction duration/response time)

2. **Configure Alert:**
   - **Name:** `Slow API Endpoints`
   - **Description:** `Alert when API endpoint P95 response time exceeds 1 second`

3. **Set Conditions:**
   - **Metric:** Should already be set to "Duration" (transaction duration)
   - **Percentile:** Select **"p95"** (95th percentile) from dropdown
   - **Environment:** Select **"production"** (or leave blank for all environments)
   - **Threshold:** 
     - **Value:** `1000` (milliseconds = 1 second)
     - **Operator:** `is greater than`
   - **Time Window:** `5 minutes` (alert if threshold exceeded for 5+ minutes)
   - **THEN:** **"Send a notification to"**
     - **Email:** `garetcrenshaw@gmail.com`

4. **Save Alert**

---

### Alert 5: High Error Rate (> 1%)

1. **Create New Alert:**
   - Click **"Create Alert Rule"** again
   - On the "Select Alert" screen, select **"Performance"** section
   - Choose **"Failure Rate"** (this tracks the percentage of failed transactions)

2. **Configure Alert:**
   - **Name:** `High Error Rate`
   - **Description:** `Alert when error rate exceeds 1% of total transactions`

3. **Set Conditions:**
   - **Metric:** Should already be set to "Failure Rate" (percentage of failed transactions)
   - **Environment:** Select **"production"** (or leave blank)
   - **Threshold:**
     - **Value:** `1` (percent)
     - **Operator:** `is greater than`
   - **Time Window:** `5 minutes`
   - **THEN:** **"Send a notification to"**
     - **Email:** `garetcrenshaw@gmail.com`

4. **Save Alert**

**Alternative:** If "Failure Rate" isn't available, you can use:
- **Errors** → **"Number of Errors"** 
- Set threshold based on error count per time window
- Or use **Performance** → **"Duration"** and filter for failed transactions

---

## Verification

### Test Component Alerts

After creating the alerts, you can verify they work by checking existing errors:

1. **Go to Sentry** → **Issues** → **Feed**
2. **Look for any errors** from:
   - `/api/stripe-webhook` (should have `component: stripe-webhook` tag)
   - `/api/process-email-queue` (should have `component: email-queue-worker` tag)
   - `/api/create-checkout` (should have `component: create-checkout` tag)
3. **Click on an issue** → Check the **"Tags"** section
4. **Verify the tag exists:** You should see `component: stripe-webhook` (or similar)

**Note:** The component tags are automatically added by the code when errors occur. You don't need to manually add them.

### Test Performance Alerts

Performance alerts will trigger automatically when:
- An API endpoint's P95 response time exceeds 1 second for 5+ minutes
- The overall error rate exceeds 1% for 5+ minutes

These are monitored continuously, so no manual testing is needed. They'll alert you if performance degrades.

---

## Current Alert Summary

After setup, you'll have:

1. ✅ **Critical Errors** - Any error with `critical: true` tag (already set up)
2. ✅ **Stripe Webhook Failures** - Errors in webhook handler
3. ✅ **Email Delivery Failures** - Errors in email queue worker
4. ✅ **Checkout Creation Failures** - Errors in checkout creation
5. ✅ **Slow API Endpoints** - P95 > 1 second
6. ✅ **High Error Rate** - Error rate > 1%

---

## Alert Response Times

| Alert Type | Expected Response Time | Priority |
|------------|------------------------|----------|
| Critical Errors | < 5 minutes | 🔴 Critical |
| Stripe Webhook Failures | < 5 minutes | 🔴 Critical |
| Email Delivery Failures | < 15 minutes | 🟡 High |
| Checkout Creation Failures | < 10 minutes | 🔴 Critical |
| Slow API Endpoints | < 30 minutes | 🟡 Medium |
| High Error Rate | < 15 minutes | 🟡 High |

---

## Troubleshooting

### Alert Not Triggering

1. **Check Filter Syntax:**
   - Ensure tag name matches exactly: `component` (not `components` or `Component`)
   - Ensure value matches exactly: `stripe-webhook` (case-sensitive, with hyphen)
   - **Common mistake:** Typo in tag name (e.g., "critcal" instead of "critical")

2. **Verify Tags in Sentry:**
   - Go to an issue in Sentry → **Issues** → Click on an error
   - Check the **"Tags"** section (usually on the right sidebar)
   - Verify the tag exists and matches your filter exactly

3. **Check Alert Status:**
   - Go to **Alerts** → Your Alert → **Details**
   - Check **"Last Triggered"** - should show recent activity
   - Check alert conditions match your test

4. **Test with Existing Error:**
   - Find an error that should match your alert
   - Manually trigger the alert by creating a test error:
     ```bash
     curl "https://www.gamedaytickets.io/api/test-sentry?action=exception"
     ```
   - Wait 1-2 minutes, then check your email

### Performance Alert Not Working

1. **Check Metric Availability:**
   - Go to Sentry → **Performance** → **Transactions**
   - Verify transactions are being tracked
   - Check that P95 values are available (you need at least some traffic)

2. **Verify Environment:**
   - Ensure alert is set to `production` environment (or leave blank for all)
   - Check that transactions are tagged with `environment: production`
   - Go to **Performance** → Filter by environment → Verify data exists

3. **Check Threshold:**
   - P95 > 1000ms might be too sensitive if your endpoints are normally slow
   - Consider adjusting to 2000ms (2 seconds) if you get too many alerts
   - Error rate > 1% might be too sensitive if you have low traffic
   - Consider adjusting to 5% if needed

---

## Next Steps

Once all alerts are set up:

1. ✅ **Monitor for 24-48 hours** - See how often alerts fire
2. ✅ **Adjust thresholds** - Tune based on actual performance
3. ✅ **Review alert frequency** - Make sure you're not getting spammed
4. ✅ **Document custom rules** - Update `MONITORING_SETUP.md` if you add custom filters

---

## Quick Reference: Alert Configuration

### Issue Alerts (Component-Specific)

| Alert Name | Tag Filter | Value |
|------------|------------|-------|
| Stripe Webhook Failures | `component` | `stripe-webhook` |
| Email Delivery Failures | `component` | `email-queue-worker` |
| Checkout Creation Failures | `component` | `create-checkout` |

### Metric Alerts (Performance)

| Alert Name | Metric | Threshold | Window |
|------------|--------|-----------|--------|
| Slow API Endpoints | Transaction Duration (p95) | > 1000ms | 5 minutes |
| High Error Rate | Error Rate | > 1% | 5 minutes |

---

**Last Updated:** December 30, 2025  
**Status:** Ready to Configure
