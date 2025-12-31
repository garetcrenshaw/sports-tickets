# Troubleshooting Sentry Alert Not Receiving Emails

## Issue: Alert configured but no email received

### Step 1: Verify Alert Filter is Correct

**Check for typo:**
- Go to Sentry → Alerts → Your "Critical Errors" alert
- Click "Edit Rule"
- Check the filter: Should say `critical` (not `critcal`)
- If it says `critcal`, change it to `critical`
- Save the alert

### Step 2: Verify Deployment Completed

The test endpoint was just updated. Wait 1-2 minutes for Vercel to deploy, then test again.

### Step 3: Test the Alert

```bash
# Test with critical tag
curl "https://www.gamedaytickets.io/api/test-sentry?action=exception"
```

### Step 4: Check Sentry Dashboard

1. Go to Sentry → Alerts → "Critical Errors"
2. Check "Alerts Triggered" graph
3. Should show a spike if alert triggered
4. Check "Issues" table - should show the test error

### Step 5: Verify Email Configuration

1. In Sentry alert settings, verify:
   - Email address is correct: `garetcrenshaw@gmail.com`
   - Action is enabled
   - No filters blocking the alert

### Step 6: Check Email Settings

1. Check spam folder
2. Check email filters
3. Verify email address is correct in Sentry

### Step 7: Test Alert Manually

1. Go to Sentry → Alerts → "Critical Errors"
2. Click "Send Test Notification" (if available)
3. Check if test email arrives

---

## Common Issues

### Issue: Filter typo
**Solution:** Change `critcal` to `critical` in alert filter

### Issue: Deployment not complete
**Solution:** Wait 1-2 minutes, then test again

### Issue: Email in spam
**Solution:** Check spam folder, whitelist Sentry emails

### Issue: Alert not triggering
**Solution:** Verify the error has `critical: true` tag

---

## Quick Verification Checklist

- [ ] Alert filter says `critical` (not `critcal`)
- [ ] Deployment completed (wait 1-2 min)
- [ ] Test endpoint called
- [ ] Check Sentry dashboard for alert trigger
- [ ] Check email (inbox + spam)
- [ ] Email address correct in Sentry

