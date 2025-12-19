# 📧 Email Delivery Optimization Guide

## Current Status

Your emails are working but may take up to 60 seconds due to the cron schedule. Here's how to diagnose and speed things up:

---

## 🔍 Step 1: Diagnose Current Performance

### Check Email Queue Status in Supabase

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Run the queries in `diagnose-email-queue.sql`

**What to look for:**
- ✅ Status counts: Most should be "sent", few/no "pending"
- ✅ Send time: Should be 5-20 seconds from created_at to sent_at
- ❌ If many "pending": Cron might not be running
- ❌ If many "failed": Check Resend API key

---

## ⚡ Step 2: Speed Up Email Delivery

### Option A: Manual Trigger (Instant - Use After Test Purchases)

After making a test purchase, immediately run:

```bash
./trigger-emails.sh
```

This will:
- Trigger the email processor immediately
- Process all pending emails right away
- Deliver QR codes in 5-10 seconds

### Option B: Verify Immediate Trigger is Working

The webhook tries to trigger emails immediately after purchase. Check if it's working:

1. Make a test purchase
2. Immediately check Vercel logs:
```bash
vercel logs https://sports-tickets-3jl0surpr-garetcrenshaw-9092s-projects.vercel.app
```

Look for:
```
✅ "🚀 Triggering immediate email delivery..."
✅ "✅ Email worker triggered successfully"
```

If you see errors, the immediate trigger might be failing.

---

## 🔧 Step 3: Fix Common Issues

### Issue 1: Immediate Trigger Not Working

**Problem:** Webhook fires but doesn't trigger email worker

**Solution:** Check CRON_SECRET

```bash
# Verify CRON_SECRET exists
vercel env ls | grep CRON_SECRET

# If missing, add it:
vercel env add CRON_SECRET production
# Enter a random 32-character string
```

### Issue 2: Emails Take 60+ Seconds

**Problem:** Cron is the only way emails are sent

**Fix:** The immediate trigger in webhook should handle this, but verify:

```bash
# Check recent webhook activity
vercel logs https://sports-tickets-3jl0surpr-garetcrenshaw-9092s-projects.vercel.app | grep "stripe-webhook"
```

### Issue 3: Some Emails Never Arrive

**Problem:** Stuck in "pending" status

**Solution:** Check Resend API key and quota

1. Go to: https://resend.com/emails
2. Check for failed sends
3. Verify API key is valid:
```bash
vercel env ls | grep RESEND_API_KEY
```

---

## 📊 Step 4: Performance Testing

### Test All 3 Events for Email Speed

**Test Script:**

1. **Event 1: Gameday Empire Showcase**
   - Buy 1 admission + 1 parking
   - Start timer when you click "Complete Purchase"
   - Stop timer when you receive 2nd email
   - **Target:** < 30 seconds

2. **Event 2: Sportsplex Showdown**
   - Buy 1 parking
   - Time it
   - **Target:** < 30 seconds

3. **Event 3: Sportsplex Event**
   - Buy 1 admission
   - Time it
   - **Target:** < 30 seconds

### Expected Timeline:
```
00:00 - User completes Stripe checkout
00:02 - Stripe fires webhook
00:03 - Webhook inserts tickets into database
00:03 - Webhook triggers email processor
00:05 - Email processor generates QR codes
00:10 - Resend sends emails
00:15 - User receives emails
```

**Total: 15-30 seconds** ✅

---

## 🚀 Step 5: Optimize Further (Optional)

### Make Emails INSTANT (< 10 seconds)

If you want even faster emails, you can optimize the webhook:

**Current flow:**
```
Webhook → Queue → Cron (every minute) → Email
```

**Optimized flow:**
```
Webhook → Queue → Immediate Trigger → Email
```

The immediate trigger is already in your code! Just verify it's working:

```javascript
// This is already in your webhook (line 175-178)
triggerEmailWorker().catch(err => {
  console.log('⚠️ Immediate email trigger failed (cron will retry):', err.message);
});
```

### Verify It's Firing:

1. Make a test purchase
2. Check logs immediately:
```bash
vercel logs https://sports-tickets-3jl0surpr-garetcrenshaw-9092s-projects.vercel.app | grep "Triggering immediate"
```

Should see:
```
🚀 Triggering immediate email delivery...
✅ Email worker triggered successfully
```

---

## 📈 Step 6: Monitor Performance

### Daily Health Check

```bash
# Check webhook success rate
echo "Go to: https://dashboard.stripe.com/webhooks"
echo "Success rate should be 100%"

# Check email queue
echo "Run diagnose-email-queue.sql in Supabase"
echo "All emails should be 'sent', none 'pending'"

# Check Resend delivery
echo "Go to: https://resend.com/emails"
echo "All emails should be 'Delivered'"
```

### Set Up Alerts (Recommended)

1. **Stripe Webhook Alerts:**
   - Dashboard → Webhooks → Your endpoint
   - Click "Add notification"
   - Get alerted if webhook starts failing

2. **Vercel Monitoring:**
   - Go to your project settings
   - Enable "Email notifications"
   - Get alerted on function errors

---

## 🎯 Success Metrics

Your email system is optimized when:

- ✅ **Delivery time:** < 30 seconds (ideal: < 15 seconds)
- ✅ **Queue status:** 0 pending emails after 1 minute
- ✅ **Webhook success:** 100% success rate
- ✅ **Resend delivery:** 100% delivered
- ✅ **All 3 events:** Perform identically
- ✅ **QR codes:** All unique, all scannable

---

## 🆘 Quick Troubleshooting

### Problem: Emails take 60+ seconds

**Quick Fix:**
```bash
./trigger-emails.sh
```

**Long-term Fix:**
- Check CRON_SECRET is set
- Verify immediate trigger is firing in webhook logs

### Problem: No emails at all

**Check:**
1. Webhook firing? (Stripe dashboard)
2. Tickets in database? (Supabase tickets table)
3. Emails in queue? (Supabase email_queue table)
4. Resend API key valid? (vercel env ls)

### Problem: Only Event 1 emails work

**This shouldn't happen!** All events use the same email system.

**Debug:**
```sql
-- In Supabase SQL Editor:
SELECT event_id, status, COUNT(*) 
FROM email_queue 
GROUP BY event_id, status;
```

All 3 events should show "sent" status.

---

## 📞 Support Commands

```bash
# Manual trigger emails
./trigger-emails.sh

# Check queue status
# Run diagnose-email-queue.sql in Supabase

# Watch live logs
vercel logs https://sports-tickets-3jl0surpr-garetcrenshaw-9092s-projects.vercel.app

# Check environment variables
vercel env ls

# Test webhook locally
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

---

## 🎉 Expected Results

After optimization:

**Event 1 (Gameday Empire):**
- 2 emails (admission + parking)
- Delivered in 15-30 seconds
- Both QR codes unique

**Event 2 (Sportsplex Showdown):**
- 1 email (parking only)
- Delivered in 15-30 seconds
- QR code for parking

**Event 3 (Sportsplex Event):**
- 1 email (admission only)
- Delivered in 15-30 seconds
- QR code for admission

---

**Created:** December 18, 2025
**Last Updated:** December 18, 2025
**Status:** All 3 events live and working!

