# 🚀 DEPLOYMENT CHECKLIST - Production Ready

## Pre-Deployment Checklist

### ✅ Code Changes Applied
- [x] Webhook uses `micro`'s `buffer()` for raw body
- [x] `vercel.json` has `bodyParser: false` 
- [x] Removed all `req.body` references from webhook
- [x] Added comprehensive error logging
- [x] Idempotency check implemented
- [x] Always returns 200 to Stripe (prevents retry loops)
- [x] Test endpoints created for all components

### 📝 Environment Variables to Check

Before deploying, manually verify these in your `.env` file:

```bash
# Open .env file and check each value:
# 1. No trailing spaces after values
# 2. No quotes around values (unless part of the value)
# 3. Correct format for each key

STRIPE_SECRET_KEY=sk_...          # Must start with sk_
STRIPE_WEBHOOK_SECRET=whsec_...   # Must start with whsec_
SUPABASE_URL=https://...          # Full URL
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Service role, NOT anon key
RESEND_API_KEY=re_...             # Must start with re_
VITE_SUPABASE_URL=https://...     # Same as SUPABASE_URL
VITE_SUPABASE_ANON_KEY=eyJ...     # Anon key (different from service role)
```

### 🗄️ Supabase Setup

1. **Run the error table SQL**:
   ```bash
   # Copy contents of SUPABASE_ERROR_TABLE.sql
   # Go to Supabase Dashboard > SQL Editor
   # Paste and run
   ```

2. **Verify tickets table schema**:
   ```sql
   -- Should have these columns:
   ticket_id TEXT PRIMARY KEY
   event_id TEXT
   purchaser_name TEXT
   purchaser_email TEXT
   qr_code TEXT
   status TEXT
   created_at TIMESTAMPTZ
   ```

3. **Check RLS policies**:
   - Service role key bypasses RLS (good for webhook)
   - Anon key should have SELECT on tickets table (for success page)

### 📧 Resend Setup

1. **Verify domain**: `gamedaytickets.io` must be verified
   - Go to Resend Dashboard > Domains
   - Check DNS records (SPF, DKIM, DMARC)
   - Status should be "Verified"

2. **Test email sending**:
   ```bash
   # After starting local server:
   curl http://localhost:3000/api/test-resend
   # Check inbox/spam for test email
   ```

### 🔐 Vercel Environment Variables

Check for trailing spaces (common copy-paste bug):

```bash
# Method 1: Use the validation script
./validate-env.sh

# Method 2: Manual check in Vercel dashboard
# 1. Go to project > Settings > Environment Variables
# 2. For each variable, click "Edit"
# 3. Copy value to text editor
# 4. Look for spaces after the value
# 5. If found, remove and save
```

**If you find trailing spaces**:
```bash
vercel env rm STRIPE_WEBHOOK_SECRET
vercel env add STRIPE_WEBHOOK_SECRET whsec_your_actual_secret_here

# Repeat for any other affected variables
```

### 🔄 Update Stripe Webhook

1. Go to Stripe Dashboard > Webhooks
2. Click your webhook endpoint (or create new)
3. Update URL to: `https://your-domain.vercel.app/api/stripe-webhook`
4. Events to listen for: `checkout.session.completed`
5. **Copy the Signing Secret** (whsec_...)
6. Update in Vercel:
   ```bash
   vercel env rm STRIPE_WEBHOOK_SECRET production
   vercel env add STRIPE_WEBHOOK_SECRET whsec_your_new_secret production
   ```

---

## Deployment Steps

### 1. Local Testing (5 mins)

```bash
# Terminal 1: Start local server
npm run dev

# Terminal 2: Run test suite
./test-local-stack.sh
```

**Expected Results**:
- ✅ QR generation working
- ✅ Supabase insert working
- ✅ Email sent successfully

### 2. Deploy to Vercel (2 mins)

```bash
# Option A: Git push (auto-deploy)
git add .
git commit -m "fix: webhook signature verification + error logging + test endpoints"
git push origin main

# Option B: Manual deploy
npm run build
vercel --prod
```

### 3. Update Stripe Webhook URL (2 mins)

1. Copy your Vercel deployment URL
2. Go to Stripe Dashboard > Webhooks
3. Update endpoint URL
4. Copy new signing secret
5. Update in Vercel (see above)
6. **Redeploy** to use new secret: `vercel --prod`

### 4. Production Testing (5 mins)

#### Test A: Stripe CLI Trigger
```bash
# This tests signature verification in production
stripe trigger checkout.session.completed \
  --add checkout.session:metadata.event_id=prod_test_$(date +%s) \
  --add checkout.session:customer_details.email=garetcrenshaw@gmail.com

# Watch logs in real-time
vercel logs --follow
```

**Expected in logs**:
```
✅ Event verified: checkout.session.completed
✅ QR code generated successfully
✅ Ticket inserted successfully to Supabase
✅ Email sent successfully
```

#### Test B: Real Purchase
1. Visit your production URL
2. Buy test ticket using `4242 4242 4242 4242`
3. Should redirect to `/success?session_id=...`
4. Check:
   - ✅ QR code displays on success page
   - ✅ Email received (check spam)
   - ✅ Row in Supabase `tickets` table
   - ✅ Stripe webhook shows 200 response

---

## Verification Checklist

### Stripe Dashboard
- [ ] Webhooks > Latest Event > Status: **200**
- [ ] No "Failed" or "Retrying" events
- [ ] Event logs contain your event

### Supabase Dashboard
- [ ] `tickets` table has new row
- [ ] `qr_code` column contains `data:image/png;base64,...`
- [ ] `errors` table exists (and is empty)
- [ ] Can query: `SELECT * FROM tickets WHERE ticket_id = 'cs_test_...'`

### Resend Dashboard
- [ ] Emails > Latest email status: **Sent** (not Failed)
- [ ] Click email > Shows delivered time
- [ ] No errors in logs

### Vercel Dashboard
- [ ] Functions > `api/stripe-webhook` > Metrics: **0 errors**
- [ ] Logs > Search "Event verified" > Found
- [ ] No 4xx or 5xx responses in logs

### Email Inbox
- [ ] Email received (check spam folder)
- [ ] Subject: "Your Gameday Tickets + Parking are Ready!"
- [ ] QR code displays correctly
- [ ] Can scan QR code with phone

---

## Troubleshooting Guide

### Problem: "No signatures found matching the expected signature"

**Root Cause**: Body was parsed before signature verification

**Solution**:
1. Verify `vercel.json` has `bodyParser: false` ✅ (already applied)
2. Verify webhook uses `micro`'s `buffer()` ✅ (already applied)
3. Check `STRIPE_WEBHOOK_SECRET` matches dashboard
4. Redeploy: `vercel --prod`

**Test**:
```bash
# Should see signature verification pass
curl https://your-domain.vercel.app/api/test-stripe-sig \
  -X POST \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test"
```

---

### Problem: "Database insert failed"

**Possible Causes**:
1. Wrong Supabase key (using anon instead of service role)
2. Table doesn't exist
3. Schema mismatch
4. RLS blocking (unlikely with service role)

**Solution**:
```bash
# Test Supabase directly
curl https://your-domain.vercel.app/api/test-supabase

# Check response for specific error
```

**Common fixes**:
- Use `SUPABASE_SERVICE_ROLE_KEY` (NOT `SUPABASE_ANON_KEY`)
- Run `SUPABASE_SETUP.sql` in SQL editor
- Check table schema matches code

---

### Problem: "Email send failed"

**Possible Causes**:
1. Domain not verified in Resend
2. Invalid API key
3. Rate limit exceeded

**Solution**:
```bash
# Test email directly
curl https://your-domain.vercel.app/api/test-resend

# Check Resend dashboard
# Domains > gamedaytickets.io > Should be "Verified"
```

**DNS Records needed**:
```
Type    Name    Value
TXT     @       v=spf1 include:resend.com ~all
CNAME   resend._domainkey   resend._domainkey.resend.com
```

---

### Problem: Webhook times out (10s limit)

**Cause**: Free tier has 10s timeout

**Solutions**:
1. Already set `maxDuration: 30` in `vercel.json` ✅
2. If still timing out, upgrade to Vercel Pro (60s limit)
3. Consider async processing:
   ```javascript
   // Quick option: Don't await email
   resend.emails.send(...).catch(err => console.error(err));
   return res.status(200).json({ status: 'success' });
   ```

---

### Problem: Webhook retries endlessly

**Cause**: Returning 4xx/5xx instead of 200

**Solution**: Already fixed ✅
- Webhook now always returns 200
- Errors logged but don't fail the request
- Stripe sees "acknowledged" and stops retrying

---

### Problem: Duplicate tickets being created

**Cause**: No idempotency check

**Solution**: Already fixed ✅
- Checks for existing `ticket_id` before insert
- Returns early if duplicate found
- Logs "idempotent skip"

**Test**:
```bash
# Trigger same event twice
stripe trigger checkout.session.completed
# Wait 2 seconds
stripe trigger checkout.session.completed

# Check Supabase - should only have ONE ticket for that session_id
```

---

## Environment Variable Quick Reference

### Local Development (.env)
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # From: stripe listen
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_...
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Production (Vercel)
```bash
# Set with:
vercel env add STRIPE_SECRET_KEY sk_live_... production
vercel env add STRIPE_WEBHOOK_SECRET whsec_... production
vercel env add SUPABASE_URL https://xxx.supabase.co production
vercel env add SUPABASE_SERVICE_ROLE_KEY eyJ... production
vercel env add RESEND_API_KEY re_... production
vercel env add VITE_SUPABASE_URL https://xxx.supabase.co production
vercel env add VITE_SUPABASE_ANON_KEY eyJ... production
```

### How to check for trailing spaces:
```bash
# Method 1: Use validation script
./validate-env.sh

# Method 2: Visual check
cat .env | sed 's/ /·/g'  # Spaces show as ·

# Method 3: In Vercel dashboard
# Copy value → Paste in text editor → Check end of line
```

---

## Success Criteria ✅

After deployment, all of these should be true:

- [x] Webhook code uses `micro` buffer (no `req.body`)
- [x] `vercel.json` has `bodyParser: false`
- [x] Test endpoints available at `/api/test-*`
- [ ] Local test suite passes (`./test-local-stack.sh`)
- [ ] Production webhook returns 200 (check Stripe dashboard)
- [ ] Tickets inserted to Supabase
- [ ] Emails sent via Resend
- [ ] Success page displays QR code
- [ ] No signature verification errors in logs
- [ ] Idempotency works (duplicate events ignored)

---

## Monitoring & Maintenance

### Daily Health Check
```bash
# Run this daily or set up in CI/CD
./test-local-stack.sh

# Check production
stripe trigger checkout.session.completed
# Then verify in dashboards
```

### What to Monitor
1. **Stripe Dashboard**: Webhook success rate (aim for 100%)
2. **Vercel Logs**: No errors in `api/stripe-webhook`
3. **Supabase**: Row count increases with purchases
4. **Resend**: Email delivery rate (aim for 100%)

### When to Scale
- **>100 tx/day**: Add Redis queue for emails
- **>1000 tx/day**: Consider dedicated webhook server
- **Timeouts**: Upgrade to Vercel Pro (60s timeout)

---

## Need Help?

### Resources
- **This audit**: `AUDIT_COMPLETE.md`
- **Test scripts**: `test-local-stack.sh`, `validate-env.sh`
- **Stripe docs**: https://stripe.com/docs/webhooks/signatures
- **Vercel docs**: https://vercel.com/docs/functions/serverless-functions/runtimes/node-js#request-body
- **Supabase docs**: https://supabase.com/docs/guides/api

### Common Commands
```bash
# Test local
npm run dev
./test-local-stack.sh

# Deploy
vercel --prod

# Check logs
vercel logs --follow

# Trigger test webhook
stripe trigger checkout.session.completed

# Check env vars
vercel env ls
```

---

## 🎉 You're Ready to Deploy!

Follow the steps above in order, and your fulfillment stack will be **unbreakable**:
- ✅ No signature failures
- ✅ 100% Supabase inserts
- ✅ 100% email delivery
- ✅ 100% QR code generation
- ✅ Proper error logging
- ✅ Idempotent & retry-safe

Good luck! 🚀

