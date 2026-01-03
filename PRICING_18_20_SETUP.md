# ✅ Pricing Setup: $18.20 All-In

## Math Verification

**With $18.20:**
- Customer pays: $18.20 (all-in, tax included)
- Base price: $18.20 ÷ 1.08625 = $16.76
- Tax: $18.20 - $16.76 = $1.44 (goes to California)
- Stripe fee: $16.76 × 0.029 + $0.30 = $0.79 (goes to Stripe)
- Net to you: $16.76 - $0.79 = $15.97
- Business gets: $15.00 ✅
- Platform gets: $0.97 ✅ (very close to $1.00)

**Result:** ✅ Works! Business gets $15.00, you get $0.97

---

## Action Plan

### Step 1: Update Stripe Products

#### For General Admission:
1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Products
2. Find **"SoCal Cup - General Admission"**
3. Click on the product
4. Edit or create new price:
   - **Price:** `$18.20`
   - **Billing:** `One time`
   - **"Include tax in price":** **YES** ✅
5. Save and make it the active price
6. **Copy the new Price ID** (starts with `price_...`)

#### For Parking:
1. Find **"SoCal Cup - Parking Pass"**
2. Edit or create new price:
   - **Price:** `$18.20`
   - **Billing:** `One time`
   - **"Include tax in price":** **YES** ✅
3. Save and make it the active price
4. **Copy the new Price ID** (starts with `price_...`)

**Important:** Write down both Price IDs - you'll need them for Step 2!

---

### Step 2: Update Supabase Database

#### Option A: Using SQL Editor (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com) → Your Project → SQL Editor
2. Run this SQL:

```sql
-- Update SoCal Cup Events to $18.20
UPDATE events 
SET 
  admission_price = 18.20,
  parking_price = 18.20
WHERE 
  event_name LIKE '%SoCal Cup%'
  OR event_name LIKE '%socal cup%';

-- Verify the update
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
  OR event_name LIKE '%socal cup%'
ORDER BY id;
```

3. **Update Stripe Price IDs** (replace with your actual Price IDs from Step 1):

```sql
UPDATE events 
SET 
  stripe_admission_price_id = 'price_YOUR_ADMISSION_PRICE_ID',
  stripe_parking_price_id = 'price_YOUR_PARKING_PRICE_ID'
WHERE 
  event_name LIKE '%SoCal Cup%'
  OR event_name LIKE '%socal cup%';
```

#### Option B: Using SQL File

I've created `update-pricing-18-20.sql` - you can run that file in Supabase SQL Editor.

---

### Step 3: Update Frontend Code

✅ **Already done!** I've updated `src/App.jsx` to use $18.20.

**Verify it's correct:**
- All SoCal Cup events should show `price: 18.20`
- All parking prices should show `parkingPrice: 18.20`

---

### Step 4: Update Vercel Environment Variables (If Needed)

If you're using environment variables for Price IDs, update them:

1. Go to [Vercel Dashboard](https://vercel.com) → Your Project → Settings → Environment Variables
2. Update these if they exist:
   - `SOCAL_CUP_ADMISSION_PRICE_ID` = `price_YOUR_NEW_ADMISSION_ID`
   - `SOCAL_CUP_PARKING_PRICE_ID` = `price_YOUR_NEW_PARKING_ID`

**Note:** If you're using database Price IDs (which you should be), you might not need these env vars.

---

### Step 5: Deploy to Vercel

1. Commit your changes:
```bash
git add .
git commit -m "Update pricing to $18.20 all-in for SoCal Cup"
git push
```

2. Vercel will auto-deploy, or trigger manual deploy if needed

---

### Step 6: Test

1. Go to your site
2. Navigate to a SoCal Cup event
3. Verify price shows as **$18.20**
4. Add to cart and go to checkout
5. Verify Stripe checkout shows **$18.20** (no tax breakdown)
6. Complete test purchase with card `4242 4242 4242 4242`
7. Verify in Stripe Dashboard:
   - Payment shows $18.20
   - Net amount is ~$15.97
   - Business should get $15.00
   - Platform should get $0.97

---

## Checklist

- [ ] Stripe: General Admission product updated to $18.20
- [ ] Stripe: Parking product updated to $18.20
- [ ] Stripe: "Include tax in price" = YES for both
- [ ] Stripe: Copied new Price IDs
- [ ] Supabase: Updated admission_price to 18.20
- [ ] Supabase: Updated parking_price to 18.20
- [ ] Supabase: Updated stripe_admission_price_id
- [ ] Supabase: Updated stripe_parking_price_id
- [ ] Frontend: Verified prices are 18.20 (already done)
- [ ] Vercel: Deployed latest code
- [ ] Test: Made test purchase and verified

---

## Files Updated

- ✅ `src/App.jsx` - Prices updated to 18.20
- ✅ `update-pricing-18-20.sql` - SQL script created
- ✅ `PRICING_18_20_SETUP.md` - This file

---

## Quick Reference

**Price:** $18.20  
**Tax included:** YES  
**Customer sees:** $18.20 (no tax breakdown)  
**Business gets:** $15.00  
**Platform gets:** $0.97  

**Stripe Settings:**
- Price: $18.20
- "Include tax in price": YES ✅

---

## Need Help?

If you run into issues:
1. Check Stripe Dashboard → Products → Verify prices are $18.20
2. Check Supabase → SQL Editor → Run verification query
3. Check Vercel → Deployments → Verify latest deploy succeeded
4. Test purchase and check Stripe Dashboard for actual amounts

Good luck! 🚀

