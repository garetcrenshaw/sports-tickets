# 🔍 Debug: Why Pricing Isn't Matching

## What I See

**Stripe Dashboard:**
- ✅ SoCal Cup - General Admission: **$18.00** (correct!)
- ✅ SoCal Cup - Parking Pass: **$19.00** (correct!)

**But checkout shows:**
- ❌ General Admission: $15.00
- ❌ Parking: $15.00

## The Problem

Your Vercel has these OLD environment variables:
- `GA_PRICE_ID` = Old $15 price
- `PARKING_PRICE_ID` = Old $15 price

**The code is probably:**
1. Trying to get Price IDs from database
2. Failing (or database has wrong Price IDs)
3. Falling back to `GA_PRICE_ID` and `PARKING_PRICE_ID` from Vercel env vars
4. Using the old $15 prices

---

## How to Fix

### Step 1: Check Database Price IDs

Run this in Supabase SQL Editor:

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

**What to check:**
- Are `stripe_admission_price_id` and `stripe_parking_price_id` set?
- Do they match the Price IDs from your Stripe products?

**From your Stripe dashboard, the Price IDs should be:**
- Admission: The Price ID for "SoCal Cup - General Admission" ($18.00)
- Parking: The Price ID for "SoCal Cup - Parking Pass" ($19.00)

---

### Step 2: Get the Correct Price IDs from Stripe

1. Go to Stripe Dashboard → Products
2. Click **"SoCal Cup - General Admission"**
3. Click on the **$18.00 price**
4. **Copy the Price ID** (starts with `price_...`)
5. Repeat for **"SoCal Cup - Parking Pass"** ($19.00)

---

### Step 3: Update Database with Correct Price IDs

**If database Price IDs are wrong or missing:**

```sql
UPDATE events 
SET 
  stripe_admission_price_id = 'price_YOUR_18_DOLLAR_PRICE_ID',
  stripe_parking_price_id = 'price_YOUR_19_DOLLAR_PRICE_ID'
WHERE 
  event_name LIKE '%SoCal Cup%';
```

**Replace with your actual Price IDs from Step 2!**

---

### Step 4: Verify Database Has Correct Prices

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
- `stripe_admission_price_id` = Your $18 Price ID
- `stripe_parking_price_id` = Your $19 Price ID

---

## Why This Happens

**The code flow:**
1. Fetches event from database
2. Gets `stripe_admission_price_id` and `stripe_parking_price_id`
3. **If those are NULL or missing**, falls back to:
   - `process.env.GA_PRICE_ID` (old $15)
   - `process.env.PARKING_PRICE_ID` (old $15)

**Solution:**
- Make sure database has the correct Price IDs
- Then the code will use those instead of env vars

---

## Quick Fix

**Option A: Update Database (Recommended)**
- Update Price IDs in Supabase to match your $18/$19 products
- Code will use those automatically

**Option B: Update Vercel Env Vars (Not Recommended)**
- Update `GA_PRICE_ID` and `PARKING_PRICE_ID` in Vercel
- But this affects ALL events, not just SoCal Cup
- Not ideal for multi-event setup

---

## What to Do Now

1. **Get Price IDs from Stripe** (Step 2)
2. **Check database** (Step 1)
3. **Update database** if needed (Step 3)
4. **Test** - Should work!

Want me to help you get the Price IDs or check the database?

