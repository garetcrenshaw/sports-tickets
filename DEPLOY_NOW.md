# ⚡ DEPLOY NOW - Quick Command Reference

## 🚀 Deploy to Production

### Option 1: Automated (Recommended)
```bash
./deploy.sh
```
**What it does**:
- ✅ Checks git status
- ✅ Verifies vercel.json config
- ✅ Confirms timeout handling
- ✅ Commits & pushes changes
- ✅ Deploys to Vercel
- ✅ Shows next steps

---

### Option 2: Manual Steps

#### Step 1: Commit Changes
```bash
git add .
git commit -m "fix: timeouts, env vars, E2E testing"
git push origin main
```

#### Step 2: Deploy
```bash
vercel --prod
```

#### Step 3: Update Stripe Webhook
1. Go to Stripe Dashboard > Webhooks
2. Click your endpoint or create new
3. Update URL: `https://your-domain.vercel.app/api/stripe-webhook`
4. Copy signing secret (whsec_...)
5. Update in Vercel:
```bash
vercel env rm STRIPE_WEBHOOK_SECRET production
vercel env add STRIPE_WEBHOOK_SECRET whsec_your_secret_here production
vercel --prod  # Redeploy with new secret
```

#### Step 4: Add Frontend Env Vars (CRITICAL)
```bash
# Frontend needs these to connect to Supabase
vercel env add VITE_SUPABASE_URL https://xjvzehjpgbwiiuvsnflk.supabase.co production
vercel env add VITE_SUPABASE_ANON_KEY eyJ_your_anon_key_here production

# Redeploy to use new vars
vercel --prod
```

#### Step 5: Test Production
```bash
# Trigger test webhook
stripe trigger checkout.session.completed \
  --add checkout.session:metadata.event_id=prod_test \
  --add checkout.session:customer_details.email=garetcrenshaw@gmail.com

# Watch logs in real-time
vercel logs --follow
```

**Expected logs**:
```
✅ Event verified: checkout.session.completed
✅ QR code generated successfully
✅ Ticket inserted successfully to Supabase
✅ Email sent successfully
```

---

## 🧪 Pre-Deployment Testing

### Test Local First
```bash
# Start dev server
npm run dev

# Run component tests
./test-local-stack.sh

# Run E2E test
./test-e2e.sh
```

**All tests should pass** before deploying.

---

## ✅ Post-Deployment Verification

### 1. Stripe Dashboard
- [ ] Go to Webhooks
- [ ] Check latest event status: **200** ✅
- [ ] No failed/retrying events

### 2. Vercel Dashboard
- [ ] Go to your project
- [ ] Functions > stripe-webhook > Metrics
- [ ] **0 errors** ✅
- [ ] Logs show "Event verified"

### 3. Supabase Dashboard
- [ ] Go to Table Editor > tickets
- [ ] New row present ✅
- [ ] qr_code column has base64 data

### 4. Resend Dashboard
- [ ] Go to Emails
- [ ] Latest email status: **Sent** ✅
- [ ] Not "Failed" or "Bounced"

### 5. Email Inbox
- [ ] Email received (check spam)
- [ ] QR code displays
- [ ] Can scan with phone

### 6. Frontend Test
- [ ] Visit your production URL
- [ ] Buy ticket (4242 4242 4242 4242)
- [ ] Redirects to /success
- [ ] QR code displays on success page
- [ ] Email received

---

## 🐛 If Deploy Fails

### "bodyParser: false missing"
```bash
# Check vercel.json
cat vercel.json | grep bodyParser

# Should show: "bodyParser": false
# If missing, already fixed in current version
```

### "Environment variable not found"
```bash
# List all prod env vars
vercel env ls

# Add missing vars
vercel env add VARIABLE_NAME value production
vercel --prod
```

### "Invalid URL" from Supabase
```bash
# Update with https:// prefix
vercel env rm SUPABASE_URL production
vercel env add SUPABASE_URL https://xjvzehjpgbwiiuvsnflk.supabase.co production

# Also update VITE_ version
vercel env add VITE_SUPABASE_URL https://xjvzehjpgbwiiuvsnflk.supabase.co production

vercel --prod
```

### "Email send failed"
```bash
# Regenerate Resend API key
# 1. Go to https://resend.com/api-keys
# 2. Click "Regenerate"
# 3. Copy new key

# Update in Vercel
vercel env rm RESEND_API_KEY production
vercel env add RESEND_API_KEY re_new_key_here production
vercel --prod
```

### Frontend can't connect
```bash
# Add VITE_ env vars (critical for frontend)
vercel env add VITE_SUPABASE_URL https://xjvzehjpgbwiiuvsnflk.supabase.co production
vercel env add VITE_SUPABASE_ANON_KEY eyJ_anon_key_here production
vercel --prod
```

---

## 🎯 Quick Commands

```bash
# Deploy
./deploy.sh                          # Automated (recommended)
vercel --prod                        # Manual

# Test
stripe trigger checkout.session.completed
vercel logs --follow

# Check env vars
vercel env ls

# Add env var
vercel env add VAR_NAME value production

# Remove env var
vercel env rm VAR_NAME production

# Pull env vars to local
vercel env pull .env.local

# Watch logs
vercel logs --follow
vercel logs https://your-domain.vercel.app
```

---

## 📊 Deployment Checklist

### Pre-Deploy
- [ ] All tests pass locally (`./test-local-stack.sh`)
- [ ] E2E test works (`./test-e2e.sh`)
- [ ] Git status clean or changes committed
- [ ] vercel.json has `bodyParser: false`
- [ ] Webhook has timeout handling

### Deploy
- [ ] `vercel --prod` completes successfully
- [ ] Build logs show no errors
- [ ] Deployment URL received

### Post-Deploy
- [ ] Stripe webhook URL updated
- [ ] Stripe webhook secret updated in Vercel
- [ ] Frontend env vars added (VITE_)
- [ ] Test webhook triggers successfully
- [ ] Logs show 200 responses
- [ ] Supabase inserts working
- [ ] Emails sending
- [ ] Frontend displays QR codes

### Verification
- [ ] Stripe dashboard shows 200 responses
- [ ] Vercel functions show 0 errors
- [ ] Supabase has new tickets
- [ ] Resend shows sent emails
- [ ] Test purchase works E2E

---

## 🎉 Success!

When all checks pass:

✅ **Webhook**: Signature verified, no timeouts  
✅ **Database**: Tickets inserted with QR codes  
✅ **Email**: Sent with QR images  
✅ **Frontend**: Displays tickets from Supabase  
✅ **E2E**: Buy → Webhook → DB → Email → Display  

**Your fulfillment stack is LIVE!** 🚀

---

## 📞 Need Help?

- **Environment issues**: See `ENV_FIX_GUIDE.md`
- **Full audit details**: See `AUDIT_COMPLETE.md`
- **Deployment guide**: See `DEPLOYMENT_CHECKLIST.md`
- **Quick start**: See `QUICK_START.md`

---

**Deploy now**: `./deploy.sh`

🚀 **Let's ship it!**

