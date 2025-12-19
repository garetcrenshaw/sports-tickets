# Multi-Event Deployment - Quick Reference Checklist

## 🎯 Pre-Deployment Setup (30 minutes)

### ✅ Step 1: Create Stripe Products (5 min)
```bash
./deploy-multi-event.sh
```
This will create:
- ✅ Sportsplex Showdown - Parking Pass ($15)
- ✅ Sportsplex Event - General Admission ($15)

**Save these Price IDs:**
- `SPORTSPLEX_SHOWDOWN_PARKING_PRICE_ID=price_XXX`
- `SPORTSPLEX_EVENT_ADMISSION_PRICE_ID=price_XXX`

---

### ✅ Step 2: Update Local Environment (2 min)
Add to `.env.local`:
```bash
SPORTSPLEX_SHOWDOWN_PARKING_PRICE_ID=price_XXX
SPORTSPLEX_EVENT_ADMISSION_PRICE_ID=price_XXX
```

---

### ✅ Step 3: Add to Vercel Environment (3 min)
```bash
vercel env add SPORTSPLEX_SHOWDOWN_PARKING_PRICE_ID production
vercel env add SPORTSPLEX_EVENT_ADMISSION_PRICE_ID production
```

---

### ✅ Step 4: Deploy to Production (5 min)
```bash
# Commit the price change
git add src/App.jsx
git commit -m "Update Sportsplex Event price to $15"

# Deploy
vercel --prod
```

---

### ✅ Step 5: Create Production Webhook (5 min)
1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. URL: `https://sports-tickets.vercel.app/api/stripe-webhook`
4. Events: ✅ `checkout.session.completed`
5. Copy the signing secret: `whsec_XXX`
6. Update in Vercel:
   ```bash
   vercel env add STRIPE_WEBHOOK_SECRET production
   # (or update existing one)
   ```

---

### ✅ Step 6: Test Each Event (10 min)

#### Event 1: Gameday Empire Showcase
- [ ] Visit /events → Click event
- [ ] Select 1 Admission + 1 Parking
- [ ] Checkout with test card: `4242 4242 4242 4242`
- [ ] Verify 2 emails received (admission + parking QR codes)
- [ ] Check Supabase: 2 tickets with `event_id: "1"`

#### Event 2: Sportsplex Showdown (Parking Only)
- [ ] Visit /events → Click event
- [ ] **Verify:** Only parking option visible (no admission)
- [ ] Select 1 Parking pass
- [ ] Checkout with test card
- [ ] Verify 1 email received (parking QR code)
- [ ] Check Supabase: 1 ticket with `event_id: "2"`
- [ ] Verify total: $15

#### Event 3: Sportsplex Event (Admission Only)
- [ ] Visit /events → Click event
- [ ] **Verify:** Only admission option visible (no parking)
- [ ] Select 1 Admission ticket
- [ ] Checkout with test card
- [ ] Verify 1 email received (admission QR code)
- [ ] Check Supabase: 1 ticket with `event_id: "3"`
- [ ] Verify total: $15 (not $20!)

---

## 🎯 Production Readiness Checklist

### Code Changes
- [x] Event 3 price updated from $20 → $15 in `src/App.jsx`
- [x] Backend logic already configured in `api/create-checkout/index.js`
- [x] Webhook handler supports all 3 events

### Stripe Configuration
- [ ] 4 Price IDs created (2 existing + 2 new)
- [ ] Production webhook endpoint created
- [ ] Webhook secret saved

### Vercel Configuration
- [ ] `SPORTSPLEX_SHOWDOWN_PARKING_PRICE_ID` added
- [ ] `SPORTSPLEX_EVENT_ADMISSION_PRICE_ID` added
- [ ] `STRIPE_WEBHOOK_SECRET` updated
- [ ] Deployed to production

### Testing
- [ ] Event 1 tested (admission + parking)
- [ ] Event 2 tested (parking only)
- [ ] Event 3 tested (admission only)
- [ ] Emails delivering within 60 seconds
- [ ] QR codes validating correctly
- [ ] Webhook success rate 100%
- [ ] No errors in Vercel logs

---

## 🎯 Optional: Custom Domain Setup

### When you're ready to connect your domain:

1. **Add domain to Vercel:**
   - Project Settings → Domains → Add Domain
   - Enter your domain (e.g., `gamedaytickets.com`)

2. **Configure DNS records:**
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   TTL: Auto
   ```

3. **Update Stripe webhook:**
   - Change URL to: `https://yourdomain.com/api/stripe-webhook`
   - Copy new signing secret
   - Update Vercel env var

4. **Update success/cancel URLs:**
   - Edit `api/create-checkout/index.js` lines 71-72
   - Change `sports-tickets.vercel.app` → `yourdomain.com`
   - Commit and redeploy

---

## 🔍 Quick Troubleshooting

### Webhook not firing?
```bash
# Check Vercel logs
vercel logs --follow

# Verify webhook secret matches
stripe webhooks list
```

### No emails sending?
```sql
-- Check email queue in Supabase
SELECT status, COUNT(*) FROM email_queue GROUP BY status;
```

### Wrong price showing?
- Clear browser cache
- Verify correct Price ID in Vercel environment
- Check `eventPricing` mapping in `api/create-checkout/index.js`

---

## 📞 Support Commands

```bash
# View all environment variables
vercel env ls

# View recent deployments
vercel ls

# View live logs
vercel logs --follow

# Test webhook locally
stripe listen --forward-to localhost:3000/api/stripe-webhook

# Check Stripe products
stripe products list
stripe prices list
```

---

## 🎉 Success Metrics

**Your platform is production-ready when:**
- ✅ All 3 events can process orders simultaneously
- ✅ Event 2 only shows parking (no admission)
- ✅ Event 3 only shows admission (no parking)
- ✅ All prices are $15 per item
- ✅ Emails arrive within 60 seconds
- ✅ QR codes scan successfully
- ✅ Webhook success rate is 100%
- ✅ Zero errors in production logs

---

**Total Deployment Time:** ~30 minutes
**Created:** December 18, 2025

