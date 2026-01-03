# 💰 Stripe Pricing Issue - Explained & Fixed

## The Problem You're Seeing

**Stripe checkout shows:**
- General Admission: $15.00 ❌ (should be $18.00)
- Parking Pass: $15.00 ❌ (should be $19.00)

## Why This Happens

**The Flow:**
1. User clicks "Buy Tickets" on your site
2. Your code calls `/api/create-checkout`
3. Code fetches event from Supabase database
4. Gets `stripe_admission_price_id` and `stripe_parking_price_id` from database
5. Uses those Price IDs to create Stripe checkout session
6. **Stripe shows whatever price is set for those Price IDs**

**The Issue:**
- Your database has Price IDs: `price_1Slck6RzFa5vaG1D1Lm1Ro40` and `price_1SldoCRzFa5vaG1DxSlTNgaS`
- Those Price IDs in Stripe are still set to **$15.00**
- You need to update the prices in Stripe to **$18.00** and **$19.00**

---

## The Fix (Step by Step)

### Step 1: Update Stripe Products

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Find **"SoCal Cup - General Admission"**
3. Click on it
4. You'll see your Price ID: `price_1Slck6RzFa5vaG1D1Lm1Ro40`
5. **Click "Edit" on that price** (or create a new one)
6. **Change price from $15.00 to $18.00**
7. **Make sure "Include tax in price" = YES** ✅
8. **Save and make it active**
9. **Copy the Price ID** (might be the same, or new if you created one)

**Repeat for Parking:**
1. Find **"SoCal Cup - Parking Pass"**
2. Price ID: `price_1SldoCRzFa5vaG1DxSlTNgaS`
3. **Change price from $15.00 to $19.00**
4. **"Include tax in price" = YES** ✅
5. **Save and make it active**

---

### Step 2: Verify Database Has Correct Price IDs

1. Go to [Supabase Dashboard](https://supabase.com) → SQL Editor
2. Run this:

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
  event_name LIKE '%SoCal Cup%'
ORDER BY id;
```

**Check:**
- `admission_price` should be **18.00**
- `parking_price` should be **19.00**
- `stripe_admission_price_id` should match your Stripe Price ID
- `stripe_parking_price_id` should match your Stripe Price ID

**If Price IDs don't match:**
- Update them in Supabase (see Step 3)

---

### Step 3: Update Database Price IDs (If Needed)

**Only if you created NEW Price IDs in Step 1:**

```sql
UPDATE events 
SET 
  stripe_admission_price_id = 'price_YOUR_NEW_ADMISSION_ID',
  stripe_parking_price_id = 'price_YOUR_NEW_PARKING_ID'
WHERE 
  event_name LIKE '%SoCal Cup%';
```

**If you updated EXISTING prices:**
- No database update needed! The Price IDs are the same, just the prices changed.

---

### Step 4: Test Locally

**Dev server should be running at:** `http://localhost:3000`

1. **Visit:** `http://localhost:3000/org/socal-cup`
2. **Select an event** (e.g., "SoCal Cup: 12-18 Friendly")
3. **Fill in:**
   - Name: Your name
   - Phone: Your phone number
   - Email: (optional)
4. **Add tickets:**
   - 1 Admission
   - 2 Parking
5. **Click "Complete Purchase"**
6. **Check Stripe checkout:**
   - Should show: Admission $18.00, Parking $19.00 × 2 = $38.00
   - **Total: $56.00** ✅

---

## Phone vs Email - What I Changed

**Before:**
- Main site: Email required
- Portal: Phone required, email optional

**After:**
- Main site: **Phone required**, email optional ✅
- Portal: Phone required, email optional (unchanged) ✅
- Stripe: Phone collection enabled ✅

**Why:**
- You're using Twilio for SMS delivery
- Phone is more reliable for ticket delivery
- Simpler for users (one primary field)

---

## What's Updated in Code

1. ✅ **Main site form:** Changed from email to phone (required)
2. ✅ **Stripe checkout:** Phone collection enabled
3. ✅ **Portal:** Already uses phone (no change needed)

---

## Testing Checklist

- [ ] Stripe: Admission product = $18.00, tax-inclusive
- [ ] Stripe: Parking product = $19.00, tax-inclusive
- [ ] Supabase: Prices are 18.00 and 19.00
- [ ] Supabase: Price IDs match Stripe
- [ ] Localhost: Test purchase shows correct prices
- [ ] Localhost: Phone field works correctly

---

## Quick Reference

**Stripe Price IDs:**
- Admission: `price_1Slck6RzFa5vaG1D1Lm1Ro40` → Should be $18.00
- Parking: `price_1SldoCRzFa5vaG1DxSlTNgaS` → Should be $19.00

**Database:**
- `admission_price` = 18.00
- `parking_price` = 19.00

**Test URL:**
- `http://localhost:3000/org/socal-cup`

---

## Next Steps

1. **Update Stripe prices** (Step 1 above)
2. **Test locally** (Step 4 above)
3. **Verify prices are correct**
4. **Deploy when ready**

The dev server is running - test it now! 🚀

