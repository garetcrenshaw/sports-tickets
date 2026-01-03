# 🚀 Setup Guide: $18 Admission + $19 Parking

## Quick Summary

**Pricing:**
- Admission: $18.00
- Parking: $19.00
- Total: $37.00

**Revenue:**
- Business: $30.49 net total ✅
- Platform: $2.00 net total ($1.00 from each) ✅

---

## ✅ What's Already Done

- ✅ Frontend code updated to $18 admission + $19 parking
- ✅ SQL script created (`update-pricing-18-19.sql`)

---

## 📋 Your Action Items (In Order)

### Step 1: Update Stripe Products ⚠️ DO THIS FIRST

#### Create/Update Admission Product:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Find or create **"SoCal Cup - General Admission"**
3. Click on it → Edit price or create new price
4. Set:
   - **Price:** `$18.00`
   - **Billing:** `One time`
   - **"Include tax in price":** **YES** ✅ (This hides tax from customer)
5. Save and make it the active price
6. **Copy the Price ID** (starts with `price_...`) - You'll need this!

#### Create/Update Parking Product:

1. Find or create **"SoCal Cup - Parking Pass"**
2. Click on it → Edit price or create new price
3. Set:
   - **Price:** `$19.00`
   - **Billing:** `One time`
   - **"Include tax in price":** **YES** ✅ (This hides tax from customer)
4. Save and make it the active price
5. **Copy the Price ID** (starts with `price_...`) - You'll need this!

**Important:** Write down both Price IDs - you'll need them for Step 2!

---

### Step 2: Update Supabase Database

1. Go to [Supabase Dashboard](https://supabase.com) → Your Project → SQL Editor
2. Copy and paste this SQL:

```sql
-- Update prices
UPDATE events 
SET 
  admission_price = 18.00,
  parking_price = 19.00
WHERE 
  event_name LIKE '%SoCal Cup%'
  OR event_name LIKE '%socal cup%';
```

3. Click "Run" to execute

4. **Update Stripe Price IDs** (replace with your actual Price IDs from Step 1):

```sql
UPDATE events 
SET 
  stripe_admission_price_id = 'price_YOUR_ADMISSION_ID_HERE',
  stripe_parking_price_id = 'price_YOUR_PARKING_ID_HERE'
WHERE 
  event_name LIKE '%SoCal Cup%'
  OR event_name LIKE '%socal cup%';
```

5. **Verify the update:**

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
  OR event_name LIKE '%socal cup%'
ORDER BY id;
```

**Or use the SQL file:** Open `update-pricing-18-19.sql` in Supabase SQL Editor and run it (after adding your Price IDs).

---

### Step 3: Deploy to Vercel

**Option A: Auto-Deploy (If connected to Git)**
```bash
git add .
git commit -m "Update pricing to $18 admission + $19 parking"
git push
```
Vercel will auto-deploy.

**Option B: Manual Deploy**
1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Click "Deployments" → "Redeploy" (or push to trigger)

---

### Step 4: Test Everything

1. **Visit your site** → Go to a SoCal Cup event
2. **Verify prices show:**
   - Admission: $18.00
   - Parking: $19.00
3. **Add to cart** → Go to checkout
4. **Verify Stripe checkout shows:**
   - Admission: $18.00
   - Parking: $19.00
   - No tax breakdown shown ✅
5. **Complete test purchase** with card `4242 4242 4242 4242`
6. **Check Stripe Dashboard:**
   - Payment amount: $37.00 total
   - Verify business gets $30.49 net
   - Verify platform gets $2.00 net

---

## ✅ Checklist

- [ ] Stripe: Admission product updated to $18.00
- [ ] Stripe: Parking product updated to $19.00
- [ ] Stripe: "Include tax in price" = YES for both
- [ ] Stripe: Copied both Price IDs
- [ ] Supabase: Updated admission_price to 18.00
- [ ] Supabase: Updated parking_price to 19.00
- [ ] Supabase: Updated stripe_admission_price_id
- [ ] Supabase: Updated stripe_parking_price_id
- [ ] Vercel: Deployed latest code
- [ ] Test: Made test purchase and verified

---

## 📊 Expected Results

**Customer sees:**
```
SoCal Cup - General Admission    $18.00
SoCal Cup - Parking Pass        $19.00
──────────────────────────────────────
Total                            $37.00
```

**Revenue breakdown:**
- Customer pays: $37.00 total
- Tax: $3.08 (goes to California)
- Stripe fees: $1.59 (goes to Stripe)
- Net: $32.49
- **Business: $30.49** ✅
- **Platform: $2.00** ✅

---

## 🆘 Troubleshooting

**Price not updating on site?**
- Check Supabase: Run verification query
- Check Vercel: Verify deployment succeeded
- Hard refresh browser (Cmd+Shift+R)

**Stripe checkout shows tax separately?**
- Verify "Include tax in price" = YES in Stripe
- Check Stripe Dashboard → Products → Tax settings

**Wrong amounts after purchase?**
- Check Stripe Dashboard → Payments → View payment details
- Verify net amount matches expected $32.49

---

## 📁 Files Reference

- `SETUP_18_19_PRICING.md` - This file
- `update-pricing-18-19.sql` - SQL script
- `FINAL_PRICING_19_18.md` - Pricing details
- `src/App.jsx` - Frontend (already updated ✅)

---

## 🎯 Summary

1. **Stripe:** Update products to $18 admission, $19 parking, "Include tax in price" = YES
2. **Supabase:** Update prices and Price IDs
3. **Vercel:** Deploy (auto or manual)
4. **Test:** Verify everything works

**That's it!** 🚀

