# Multi-Event Platform Deployment Plan
## 3 Concurrent Events - Production Deployment Guide

**Goal:** Deploy 3 separate events running simultaneously over the same weekend to test platform scalability and multi-event functionality.

---

## 📋 Event Configuration

### Event 1: Gameday Empire Showcase (ID: 1)
- **Type:** Full Experience (Admission + Parking Bundle)
- **Admission:** $15 (General Admission)
- **Parking:** $15 (Parking Pass)
- **Date:** Saturday, December 28
- **Venue:** Downtown Arena, Los Angeles, CA

### Event 2: Sportsplex Showdown (ID: 2)
- **Type:** Parking Only
- **Admission:** N/A (No admission tickets)
- **Parking:** $15 (Parking Pass)
- **Date:** Sunday, January 5
- **Venue:** Sportsplex Center, Los Angeles, CA

### Event 3: Sportsplex Event (ID: 3)
- **Type:** Admission Only
- **Admission:** $15 (General Admission)
- **Parking:** N/A (No parking passes)
- **Date:** Saturday, January 11
- **Venue:** Sportsplex Center, Los Angeles, CA

---

## 🎯 PHASE 1: STRIPE PRODUCT & PRICE SETUP

### Step 1.1: Create Stripe Products & Prices

**Required Products:**
1. ✅ **GA_PRICE_ID** - Already exists (Gameday Empire Showcase - General Admission - $15)
2. ✅ **PARKING_PRICE_ID** - Already exists (Gameday Empire Showcase - Parking Pass - $15)
3. 🆕 **SPORTSPLEX_SHOWDOWN_PARKING_PRICE_ID** - NEW (Sportsplex Showdown - Parking - $15)
4. 🆕 **SPORTSPLEX_EVENT_ADMISSION_PRICE_ID** - NEW (Sportsplex Event - Admission - $15)

**Action Items:**

#### Create Sportsplex Showdown Parking Product
```bash
# In your terminal, run:
stripe products create \
  --name "Sportsplex Showdown - Parking Pass" \
  --description "Parking pass for Sportsplex Showdown event on January 5"

# Output will show: prod_XXXXXXXXXXXXX
# Copy this Product ID

# Create the price for this product:
stripe prices create \
  --product prod_XXXXXXXXXXXXX \
  --unit-amount 1500 \
  --currency usd \
  --nickname "Sportsplex Showdown Parking"

# Output will show: price_XXXXXXXXXXXXX
# Copy this Price ID -> This is SPORTSPLEX_SHOWDOWN_PARKING_PRICE_ID
```

#### Create Sportsplex Event Admission Product
```bash
# Create the product:
stripe products create \
  --name "Sportsplex Event - General Admission" \
  --description "General admission ticket for Sportsplex Event on January 11"

# Output will show: prod_XXXXXXXXXXXXX
# Copy this Product ID

# Create the price for this product:
stripe prices create \
  --product prod_XXXXXXXXXXXXX \
  --unit-amount 1500 \
  --currency usd \
  --nickname "Sportsplex Event Admission"

# Output will show: price_XXXXXXXXXXXXX
# Copy this Price ID -> This is SPORTSPLEX_EVENT_ADMISSION_PRICE_ID
```

### Step 1.2: Document Your Price IDs

Create a local file `STRIPE_PRICE_IDS.txt` with all 4 price IDs:

```
GA_PRICE_ID=price_XXXXXXXXXXXXX (Event 1 - Admission)
PARKING_PRICE_ID=price_XXXXXXXXXXXXX (Event 1 - Parking)
SPORTSPLEX_SHOWDOWN_PARKING_PRICE_ID=price_XXXXXXXXXXXXX (Event 2 - Parking)
SPORTSPLEX_EVENT_ADMISSION_PRICE_ID=price_XXXXXXXXXXXXX (Event 3 - Admission)
```

---

## 🎯 PHASE 2: UPDATE CODEBASE

### Step 2.1: Update Frontend Event Data

**File:** `src/App.jsx` (Lines 70-95)

Current event prices need adjustment:

```javascript
// Event 2: Sportsplex Showdown - UPDATE THESE VALUES
{
  id: 2,
  name: 'Sportsplex Showdown',
  date: 'Sunday, January 5',
  time: '6:00 PM',
  venue: 'Sportsplex Center',
  city: 'Los Angeles, CA',
  category: 'Sports',
  price: 0,           // ✅ CORRECT - No admission
  parkingPrice: 15,   // ✅ CORRECT - $15 parking
  hasAdmission: false, // ✅ CORRECT
  hasParking: true     // ✅ CORRECT
},

// Event 3: Sportsplex Event - UPDATE THESE VALUES
{
  id: 3,
  name: 'Sportsplex Event',
  date: 'Saturday, January 11',
  time: '4:00 PM',
  venue: 'Sportsplex Center',
  city: 'Los Angeles, CA',
  category: 'Sports',
  price: 15,          // ⚠️ CHANGE TO 15 (currently 20)
  parkingPrice: 0,    // ✅ CORRECT - No parking
  hasAdmission: true,  // ✅ CORRECT
  hasParking: false    // ✅ CORRECT
}
```

**Action:** Change Event 3 price from `20` to `15`.

### Step 2.2: Verify Backend Pricing Logic

**File:** `api/create-checkout/index.js` (Lines 28-42)

The current code is already set up correctly:

```javascript
const eventPricing = {
  1: {
    admission: process.env.GA_PRICE_ID,
    parking: process.env.PARKING_PRICE_ID,
  },
  2: {
    admission: null, // ✅ No admission for Sportsplex Showdown
    parking: process.env.SPORTSPLEX_SHOWDOWN_PARKING_PRICE_ID,
  },
  3: {
    admission: process.env.SPORTSPLEX_EVENT_ADMISSION_PRICE_ID,
    parking: null, // ✅ No parking for Sportsplex Event
  },
};
```

**Status:** ✅ Already configured correctly. No changes needed.

---

## 🎯 PHASE 3: CONFIGURE ENVIRONMENT VARIABLES

### Step 3.1: Update Local Environment

**File:** `.env.local`

Add the two new environment variables:

```bash
# Existing variables (keep these)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=re_...
CRON_SECRET=...
GA_PRICE_ID=price_...
PARKING_PRICE_ID=price_...

# NEW - Add these two:
SPORTSPLEX_SHOWDOWN_PARKING_PRICE_ID=price_XXXXXXXXXXXXX
SPORTSPLEX_EVENT_ADMISSION_PRICE_ID=price_XXXXXXXXXXXXX
```

### Step 3.2: Update Vercel Environment Variables

**Option A: Via Vercel CLI**

```bash
# Add Sportsplex Showdown Parking Price ID
vercel env add SPORTSPLEX_SHOWDOWN_PARKING_PRICE_ID production
# Paste: price_XXXXXXXXXXXXX when prompted

# Add Sportsplex Event Admission Price ID
vercel env add SPORTSPLEX_EVENT_ADMISSION_PRICE_ID production
# Paste: price_XXXXXXXXXXXXX when prompted
```

**Option B: Via Vercel Dashboard**

1. Go to https://vercel.com/dashboard
2. Select your `sports-tickets` project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add both variables:
   - Name: `SPORTSPLEX_SHOWDOWN_PARKING_PRICE_ID` | Value: `price_XXXXXXXXXXXXX` | Environment: **Production**
   - Name: `SPORTSPLEX_EVENT_ADMISSION_PRICE_ID` | Value: `price_XXXXXXXXXXXXX` | Environment: **Production**

---

## 🎯 PHASE 4: WEBHOOK CONFIGURATION

### Step 4.1: Create Production Webhook in Stripe

**Via Stripe Dashboard:**

1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. Configure:
   - **Endpoint URL:** `https://sports-tickets.vercel.app/api/stripe-webhook`
   - **Description:** `Production Webhook - Multi-Event Platform`
   - **Events to send:**
     - ✅ `checkout.session.completed`
   - **API Version:** Use latest (should be `2025-09-30` or newer)
4. Click **Add endpoint**
5. **Copy the Signing Secret** (`whsec_...`)

### Step 4.2: Update Webhook Secret in Vercel

**Via CLI:**
```bash
vercel env add STRIPE_WEBHOOK_SECRET production
# Paste the NEW whsec_... signing secret when prompted
```

**Via Dashboard:**
1. Go to **Settings** → **Environment Variables**
2. Find `STRIPE_WEBHOOK_SECRET`
3. Click **Edit** → Update value with new `whsec_...`
4. Save changes

---

## 🎯 PHASE 5: BUILD & DEPLOY

### Step 5.1: Update Frontend Event Price

```bash
# Make the change to src/App.jsx (Event 3 price: 20 → 15)
# Then commit:
git add src/App.jsx
git commit -m "Update Sportsplex Event price to $15"
```

### Step 5.2: Build Locally (Optional Test)

```bash
npm run build
# Verify build succeeds without errors
```

### Step 5.3: Deploy to Vercel Production

```bash
# Deploy to production
vercel --prod

# Output will show:
# ✅ Production deployment ready
# 🔗 https://sports-tickets.vercel.app
```

**Important:** Vercel will automatically pick up the new environment variables on the next deployment.

### Step 5.4: Verify Deployment

```bash
# Check deployment status
vercel ls

# Check environment variables are set
vercel env ls
```

Expected output should show:
- ✅ `GA_PRICE_ID` (Production)
- ✅ `PARKING_PRICE_ID` (Production)
- ✅ `SPORTSPLEX_SHOWDOWN_PARKING_PRICE_ID` (Production) ← NEW
- ✅ `SPORTSPLEX_EVENT_ADMISSION_PRICE_ID` (Production) ← NEW
- ✅ `STRIPE_WEBHOOK_SECRET` (Production) ← UPDATED
- ✅ All other required variables

---

## 🎯 PHASE 6: TESTING & VALIDATION

### Step 6.1: Test Each Event Flow

#### Test Event 1: Gameday Empire Showcase (Full Bundle)
1. Visit https://sports-tickets.vercel.app/events
2. Click **Gameday Empire Showcase**
3. Select 2 Admission tickets + 1 Parking pass
4. Enter email and name
5. Complete checkout with test card `4242 4242 4242 4242`
6. Verify:
   - ✅ Redirects to success page
   - ✅ 3 emails received (2 admission QR codes + 1 parking QR code)
   - ✅ Each QR code is unique
   - ✅ Supabase `tickets` table has 3 records with `event_id: "1"`
   - ✅ Webhook fired successfully in Stripe dashboard

#### Test Event 2: Sportsplex Showdown (Parking Only)
1. Visit https://sports-tickets.vercel.app/events
2. Click **Sportsplex Showdown**
3. **Verify UI:** Should only show Parking option (no admission)
4. Select 2 Parking passes
5. Enter email and name
6. Complete checkout
7. Verify:
   - ✅ Redirects to success page
   - ✅ 2 parking emails received
   - ✅ Supabase `tickets` table has 2 records with `event_id: "2"`
   - ✅ Stripe shows $30 total (2 × $15)

#### Test Event 3: Sportsplex Event (Admission Only)
1. Visit https://sports-tickets.vercel.app/events
2. Click **Sportsplex Event**
3. **Verify UI:** Should only show Admission option (no parking)
4. Select 3 Admission tickets
5. Enter email and name
6. Complete checkout
7. Verify:
   - ✅ Redirects to success page
   - ✅ 3 admission emails received
   - ✅ Supabase `tickets` table has 3 records with `event_id: "3"`
   - ✅ Stripe shows $45 total (3 × $15)

### Step 6.2: Test QR Code Scanning

For each ticket received:
1. Open the email
2. Click the QR code image or validation link
3. Visit https://sports-tickets.vercel.app/scan
4. Scan the QR code
5. Verify:
   - ✅ Shows ticket details (event, type, buyer name)
   - ✅ Shows "Valid - Not Used"
   - ✅ After scanning, status changes to "Already Scanned"
   - ✅ Subsequent scans show "Already Scanned" message

### Step 6.3: Monitor Webhook Logs

```bash
# Check Vercel function logs
vercel logs --follow

# Watch for:
# ✅ "Event verified: checkout.session.completed"
# ✅ "X tickets inserted"
# ✅ "X email jobs queued"
# ✅ "Processing complete"
```

### Step 6.4: Check Stripe Dashboard

1. Go to https://dashboard.stripe.com/payments
2. Verify all 3 test payments appear
3. Click each payment → Check **Metadata** shows correct `eventId`
4. Go to **Webhooks** → Click your endpoint
5. Verify **Recent deliveries** show all successful (200 responses)

---

## 🎯 PHASE 7: DNS & CUSTOM DOMAIN (Final Step)

### Prerequisites
- ✅ All 3 events tested and working
- ✅ Webhook delivering emails successfully
- ✅ QR codes generating and validating correctly
- ✅ No errors in Vercel logs

### Step 7.1: Add Custom Domain to Vercel

**Via Vercel Dashboard:**
1. Go to your project → **Settings** → **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `gamedaytickets.com`)
4. Vercel will provide DNS records to add

### Step 7.2: Configure DNS with Your Provider

**You'll need to add these records (Vercel will show exact values):**

#### Option A: Using A Records (Recommended)
```
Type: A
Name: @ (or your subdomain)
Value: 76.76.21.21
TTL: Auto
```

#### Option B: Using CNAME
```
Type: CNAME
Name: @ (or www)
Value: cname.vercel-dns.com
TTL: Auto
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: Auto
```

### Step 7.3: Update Stripe Webhook URLs

Once your custom domain is live:

1. Go to https://dashboard.stripe.com/webhooks
2. Click your webhook endpoint
3. Click **Update details**
4. Change endpoint URL to: `https://yourdomain.com/api/stripe-webhook`
5. Save changes
6. Copy the NEW signing secret
7. Update Vercel env var `STRIPE_WEBHOOK_SECRET` with the new secret

### Step 7.4: Update Hardcoded URLs in Code

**File:** `api/create-checkout/index.js` (Lines 71-72)

```javascript
// BEFORE:
const successUrl = 'https://sports-tickets.vercel.app/success?session_id={CHECKOUT_SESSION_ID}';
const cancelUrl = 'https://sports-tickets.vercel.app/cancel';

// AFTER (with your custom domain):
const successUrl = 'https://yourdomain.com/success?session_id={CHECKOUT_SESSION_ID}';
const cancelUrl = 'https://yourdomain.com/cancel';
```

Commit and redeploy:
```bash
git add api/create-checkout/index.js
git commit -m "Update success/cancel URLs to custom domain"
vercel --prod
```

### Step 7.5: Final Verification

1. Visit your custom domain: `https://yourdomain.com`
2. Run one full test purchase for each event
3. Verify all emails arrive with QR codes
4. Verify QR codes scan successfully
5. Check Stripe webhook shows successful deliveries

---

## 🎯 PHASE 8: PRODUCTION CHECKLIST

### Pre-Launch Validation

- [ ] All 4 Stripe Price IDs created and documented
- [ ] All environment variables set in Vercel
- [ ] Webhook endpoint created and secret configured
- [ ] Event 3 price updated from $20 to $15
- [ ] Code deployed to production
- [ ] Event 1 tested (admission + parking bundle)
- [ ] Event 2 tested (parking only)
- [ ] Event 3 tested (admission only)
- [ ] QR codes generating correctly
- [ ] QR codes scanning and validating correctly
- [ ] Emails delivering within 60 seconds
- [ ] Supabase tables populating correctly
- [ ] Webhook logs show no errors
- [ ] Custom domain configured (if applicable)
- [ ] Success/cancel URLs updated to custom domain (if applicable)

---

## 📊 MONITORING & MAINTENANCE

### Daily Monitoring

**Check Vercel Logs:**
```bash
vercel logs --since 24h
```

**Check Stripe Webhook Health:**
1. Dashboard → Webhooks → Your endpoint
2. Monitor **Success rate** (should be 100%)
3. Check **Recent deliveries** for any failures

**Check Supabase Tables:**
```sql
-- Count tickets by event
SELECT event_id, COUNT(*) as total_tickets
FROM tickets
GROUP BY event_id;

-- Check email delivery status
SELECT status, COUNT(*) as count
FROM email_queue
GROUP BY status;
```

### Troubleshooting Common Issues

**Issue: Webhook not firing**
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- Check Vercel function logs for signature verification errors
- Ensure endpoint URL is correct in Stripe

**Issue: No emails being sent**
- Check `email_queue` table in Supabase for `status: 'pending'` records
- Verify cron job is running: Check Vercel → Project → Settings → Cron Jobs
- Check `RESEND_API_KEY` is valid

**Issue: QR codes not generating**
- Check that `qrcode` package is in dependencies
- Verify Vercel function has write access to `/tmp` directory
- Check Supabase storage bucket is publicly accessible

---

## 🚀 DEPLOYMENT COMMAND SUMMARY

**Quick reference for deploying:**

```bash
# 1. Update code (if needed)
git add .
git commit -m "Multi-event platform ready for production"
git push origin main

# 2. Add new environment variables (one-time)
vercel env add SPORTSPLEX_SHOWDOWN_PARKING_PRICE_ID production
vercel env add SPORTSPLEX_EVENT_ADMISSION_PRICE_ID production

# 3. Deploy to production
vercel --prod

# 4. Monitor deployment
vercel logs --follow
```

---

## 📝 NOTES

- **Event IDs are hardcoded in frontend** (`src/App.jsx` lines 56-96)
- **Price IDs are mapped by event ID** in `api/create-checkout/index.js`
- **Webhook processes all events identically** - no special logic per event
- **QR codes are event-agnostic** - validation happens based on ticket_id
- **Email queue processes asynchronously** - cron runs every minute
- **All events share same Supabase tables** - differentiated by `event_id` column

---

## ✅ SUCCESS CRITERIA

**Platform is production-ready when:**
1. All 3 events can accept simultaneous orders
2. Each event charges correct prices ($15 per item)
3. Event 2 only sells parking (no admission option)
4. Event 3 only sells admission (no parking option)
5. Emails deliver within 60 seconds of purchase
6. QR codes validate correctly on scan page
7. Webhook success rate is 100%
8. No errors in Vercel function logs
9. Custom domain (if configured) resolves correctly
10. Stripe dashboard shows all transactions with correct metadata

---

**Created:** December 18, 2025
**Last Updated:** December 18, 2025
**Status:** Ready for implementation

