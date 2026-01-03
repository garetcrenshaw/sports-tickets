# 🔧 Fix Pricing Issue - Step by Step

## The Problem

**Stripe shows:**
- ✅ SoCal Cup - General Admission: $18.00 (correct!)
- ✅ SoCal Cup - Parking Pass: $19.00 (correct!)

**But checkout shows:**
- ❌ $15.00 for both

## Why This Happens

The code does this:
1. Tries to get Price IDs from database
2. **If database Price IDs are missing/wrong** → Falls back to `GA_PRICE_ID` and `PARKING_PRICE_ID` from Vercel (old $15 prices)

**Your Vercel has:**
- `GA_PRICE_ID` = Old $15 product
- `PARKING_PRICE_ID` = Old $15 product

**The fix:** Make sure database has the correct Price IDs for the $18/$19 products.

---

## Step 1: Get Price IDs from Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Click **"SoCal Cup - General Admission"** ($18.00)
3. Click on the **$18.00 price** (not the product, the price itself)
4. **Copy the Price ID** (starts with `price_...`)
   - It might be: `price_1Slck6RzFa5vaG1D1Lm1Ro40` (but verify!)
5. Click **"SoCal Cup - Parking Pass"** ($19.00)
6. Click on the **$19.00 price**
7. **Copy the Price ID** (starts with `price_...`)
   - It might be: `price_1SldoCRzFa5vaG1DxSlTNgaS` (but verify!)

**Write these down!**

---

## Step 2: Check What's in Your Database

Go to [Supabase Dashboard](https://supabase.com) → SQL Editor → Run this:

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
ORDER BY id
LIMIT 5;
```

**Check:**
- Are `stripe_admission_price_id` and `stripe_parking_price_id` set?
- Do they match the Price IDs you just copied from Stripe?
- Are `admission_price` and `parking_price` = 18.00 and 19.00?

---

## Step 3: Update Database

**If Price IDs are wrong or missing:**

```sql
UPDATE events 
SET 
  admission_price = 18.00,
  parking_price = 19.00,
  stripe_admission_price_id = 'price_YOUR_18_DOLLAR_PRICE_ID',
  stripe_parking_price_id = 'price_YOUR_19_DOLLAR_PRICE_ID'
WHERE 
  event_name LIKE '%SoCal Cup%';
```

**Replace with your actual Price IDs from Step 1!**

---

## Step 4: Verify

Run this again:

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
- `admission_price` = 18.00 ✅
- `parking_price` = 19.00 ✅
- `stripe_admission_price_id` = Your $18 Price ID ✅
- `stripe_parking_price_id` = Your $19 Price ID ✅

---

## Step 5: Test

1. **Visit your site** (or localhost: `http://localhost:3000/org/socal-cup`)
2. **Select an event**
3. **Add tickets** → Go to checkout
4. **Should now show:**
   - Admission: $18.00 ✅
   - Parking: $19.00 ✅

---

## Why Vercel Env Vars Don't Matter (For SoCal Cup)

The code uses database Price IDs first. Vercel env vars (`GA_PRICE_ID`, `PARKING_PRICE_ID`) are only used as a fallback for events 1-3 (legacy events).

**SoCal Cup events (ID 4+) should use database Price IDs.**

---

## Quick Checklist

- [ ] Got Price IDs from Stripe ($18 and $19 products)
- [ ] Checked database - verified Price IDs
- [ ] Updated database if needed
- [ ] Tested checkout - prices are correct

---

## Still Not Working?

**Check the browser console:**
1. Open DevTools (F12)
2. Go to Console tab
3. Look for: `CREATE-CHECKOUT: Using database pricing` or `CREATE-CHECKOUT: Using legacy pricing`
4. If it says "legacy pricing", the database lookup failed

**Common issues:**
- Database Price IDs are NULL → Update them
- Database Price IDs point to wrong products → Update them
- Database connection issue → Check Supabase credentials

---

Let me know what you find in the database! 🔍

