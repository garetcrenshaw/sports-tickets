# ✅ Verify Price IDs Are Correct

## The Issue

Price IDs are set in database, but checkout still shows $15.

**This means:** The Price IDs in your database are probably pointing to the **OLD $15 products**, not the new $18/$19 products.

---

## Step 1: Check What Price IDs Are in Database

Run this in Supabase SQL Editor:

```sql
SELECT 
  id,
  event_name,
  stripe_admission_price_id,
  stripe_parking_price_id
FROM events
WHERE 
  event_name LIKE '%SoCal Cup%'
LIMIT 1;
```

**Copy those Price IDs!**

---

## Step 2: Verify Those Price IDs in Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Click **"SoCal Cup - General Admission"** ($18.00)
3. Click on the **Prices** tab
4. **Find the Price ID** that matches your database `stripe_admission_price_id`
5. **Check the price** - Is it $18.00 or $15.00?

**If it's $15.00:**
- That's the problem! The Price ID points to the old price
- You need to either:
  - **Option A:** Update that price to $18.00
  - **Option B:** Create a new $18.00 price and update database with new Price ID

**If it's $18.00:**
- Price ID is correct, but something else is wrong
- Check the parking Price ID too

---

## Step 3: Check Parking Price ID

1. Click **"SoCal Cup - Parking Pass"** ($19.00)
2. Click on the **Prices** tab
3. **Find the Price ID** that matches your database `stripe_parking_price_id`
4. **Check the price** - Is it $19.00 or $15.00?

---

## Most Likely Issue

**Your database has Price IDs like:**
- `price_1Slck6RzFa5vaG1D1Lm1Ro40` (admission)
- `price_1SldoCRzFa5vaG1DxSlTNgaS` (parking)

**But those Price IDs in Stripe are still set to $15.00**

**The fix:** Update those prices in Stripe to $18.00 and $19.00, OR create new prices and update database.

---

## Quick Fix Options

### Option A: Update Existing Prices (Easier)

1. Go to Stripe → Products
2. Click "SoCal Cup - General Admission"
3. Find the price with ID matching your database
4. **Edit price** → Change to $18.00
5. **Set "Include tax in price" = YES**
6. **Save**
7. Repeat for Parking ($19.00)

### Option B: Create New Prices (Cleaner)

1. Create new $18.00 price for Admission
2. Create new $19.00 price for Parking
3. Copy new Price IDs
4. Update database with new Price IDs

---

## What to Check

**Tell me:**
1. What Price IDs are in your database? (from Step 1)
2. What prices are set for those Price IDs in Stripe? (from Step 2 & 3)

Then I can tell you exactly what to fix! 🔍

