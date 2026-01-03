# 🔧 Stripe Pricing Fix Guide

## The Problem

Stripe checkout is showing **$15.00** for both admission and parking, but you want:
- **Admission: $18.00**
- **Parking: $19.00**

## Why This Is Happening

The checkout code uses **Stripe Price IDs** from your database. Those Price IDs are still pointing to the old $15 products in Stripe.

**The Flow:**
1. User clicks "Buy Tickets"
2. Code fetches event from database
3. Gets `stripe_admission_price_id` and `stripe_parking_price_id` from database
4. Uses those Price IDs to create Stripe checkout
5. Stripe shows whatever price is set for those Price IDs (currently $15)

---

## The Solution (Step by Step)

### Step 1: Update Stripe Products ⚠️ DO THIS FIRST

**You already created the products, but need to update the prices:**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Find **"SoCal Cup - General Admission"**
3. Click on it
4. Find the price that's currently **$15.00** (or create a new one)
5. **Set price to $18.00**
6. **Set "Include tax in price" = YES** ✅
7. **Make it the active price**
8. **Copy the NEW Price ID** (starts with `price_...`)

**Repeat for Parking:**
1. Find **"SoCal Cup - Parking Pass"**
2. Set price to **$19.00**
3. **Set "Include tax in price" = YES** ✅
4. **Copy the NEW Price ID**

**Important:** If you already have Price IDs `price_1Slck6RzFa5vaG1D1Lm1Ro40` and `price_1SldoCRzFa5vaG1DxSlTNgaS`, you can either:
- **Option A:** Update those existing prices to $18 and $19
- **Option B:** Create new prices and get new Price IDs

---

### Step 2: Update Supabase Database

**If you created NEW Price IDs in Step 1:**

1. Go to [Supabase Dashboard](https://supabase.com) → SQL Editor
2. Run this (replace with your NEW Price IDs):

```sql
UPDATE events 
SET 
  stripe_admission_price_id = 'price_YOUR_NEW_ADMISSION_ID',
  stripe_parking_price_id = 'price_YOUR_NEW_PARKING_ID'
WHERE 
  event_name LIKE '%SoCal Cup%';
```

**If you updated EXISTING Price IDs:**

The database already has the correct Price IDs, so you're done! Just make sure the prices in Stripe are $18 and $19.

---

### Step 3: Verify Database Prices

Make sure your database has the correct prices:

```sql
SELECT 
  id,
  event_name,
  admission_price,
  parking_price,
  stripe_admission_price_id,
  stripe_parking_price_id
FROM events
WHERE 
  event_name LIKE '%SoCal Cup%';
```

**Should show:**
- `admission_price` = 18.00
- `parking_price` = 19.00
- `stripe_admission_price_id` = your Price ID
- `stripe_parking_price_id` = your Price ID

---

### Step 4: Test Locally

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Visit:** `http://localhost:3000/org/socal-cup`

3. **Select an event** → Click "Get Tickets"

4. **Add to cart:**
   - 1 Admission
   - 2 Parking

5. **Go to checkout** → Should show:
   - Admission: $18.00
   - Parking: $19.00 × 2 = $38.00
   - **Total: $56.00**

---

## Phone vs Email Question

**Current Setup:**
- **Portal (parent portal):** Asks for phone number
- **Main site:** Asks for email
- **Stripe checkout:** Collects email (phone disabled)

**Your Suggestion:** Use phone only (for Twilio SMS tickets)

**Recommendation:** ✅ **YES, use phone only**

**Why:**
1. You're using Twilio for SMS delivery
2. Phone is more reliable for ticket delivery
3. Simpler for users (one field instead of two)
4. Better for mobile-first experience

**What to Change:**
- Portal: Already uses phone ✅
- Main site: Change from email to phone
- Stripe: Enable phone collection, disable email (or keep email but make phone primary)

---

## How to Test Locally

1. **Make sure dev server is running:**
   ```bash
   npm run dev
   ```

2. **Check Stripe is using test mode:**
   - Your `.env.local` should have `STRIPE_SECRET_KEY` (test key)
   - Stripe checkout will show "TEST MODE" badge

3. **Test the flow:**
   - Go to `http://localhost:3000/org/socal-cup`
   - Select event
   - Add tickets
   - Go to checkout
   - Verify prices are $18 and $19

4. **If prices are still wrong:**
   - Check Stripe Dashboard → Products → Verify prices
   - Check Supabase → Verify Price IDs match Stripe
   - Check browser console for errors

---

## Quick Checklist

- [ ] Stripe: Admission product = $18.00, tax-inclusive
- [ ] Stripe: Parking product = $19.00, tax-inclusive
- [ ] Stripe: Copied Price IDs
- [ ] Supabase: Updated Price IDs in database
- [ ] Supabase: Verified prices are 18.00 and 19.00
- [ ] Test: Made test purchase, verified prices

---

## Need Help?

**Prices still wrong?**
1. Check Stripe Dashboard → Products → Click on product → Check active price
2. Check Supabase → Run verification query
3. Check browser console for errors
4. Make sure you're using the correct Price IDs

**Can't find Price IDs?**
- Stripe Dashboard → Products → Click product → Prices tab → Copy Price ID

---

## Next: Phone vs Email Decision

Once pricing is fixed, we should update the forms to use phone only. Want me to do that next?

