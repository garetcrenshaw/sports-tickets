# ✅ Final Setup Steps - Ready to Go!

## ✅ What You've Done

- ✅ Stripe products created with Price IDs
- ✅ General Admission: `price_1Slck6RzFa5vaG1D1Lm1Ro40` ($18.00)
- ✅ Parking: `price_1SldoCRzFa5vaG1DxSlTNgaS` ($19.00)

---

## 📋 Your Final Steps

### Step 1: Update Supabase Database

1. Go to [Supabase Dashboard](https://supabase.com)
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"**
5. Copy and paste this entire SQL script:

```sql
-- Update prices
UPDATE events 
SET 
  admission_price = 18.00,
  parking_price = 19.00
WHERE 
  event_name LIKE '%SoCal Cup%'
  OR event_name LIKE '%socal cup%';

-- Update Stripe Price IDs
UPDATE events 
SET 
  stripe_admission_price_id = 'price_1Slck6RzFa5vaG1D1Lm1Ro40',
  stripe_parking_price_id = 'price_1SldoCRzFa5vaG1DxSlTNgaS'
WHERE 
  event_name LIKE '%SoCal Cup%'
  OR event_name LIKE '%socal cup%';

-- Verify
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

6. Click **"Run"** (or press Cmd/Ctrl + Enter)

7. **Check the results:**
   - `admission_price` should be `18.00`
   - `parking_price` should be `19.00`
   - `stripe_admission_price_id` should be `price_1Slck6RzFa5vaG1D1Lm1Ro40`
   - `stripe_parking_price_id` should be `price_1SldoCRzFa5vaG1DxSlTNgaS`

**✅ Done!** Database is updated.

---

### Step 2: Deploy to Vercel

**Option A: Git Push (Recommended)**

Open terminal in your project folder:

```bash
git add .
git commit -m "Update pricing to $18 admission + $19 parking with Stripe Price IDs"
git push
```

Vercel will automatically deploy.

**Option B: Manual Deploy**

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Go to **"Deployments"** tab
4. Click **"Redeploy"** or push your code

---

### Step 3: Test Everything

1. **Wait for Vercel to finish deploying** (check Vercel dashboard)

2. **Visit your site** → Go to a SoCal Cup event

3. **Verify prices show:**
   - Admission: **$18.00** ✅
   - Parking: **$19.00** ✅

4. **Add to cart:**
   - Select 1 admission ticket
   - Select 1 parking pass

5. **Go to checkout** (Stripe Checkout)

6. **Verify Stripe shows:**
   - Admission: **$18.00**
   - Parking: **$19.00**
   - Total: **$37.00**
   - **No tax breakdown shown** ✅ (correct for all-in pricing!)

7. **Complete test purchase:**
   - Card: `4242 4242 4242 4242`
   - Any future expiry (e.g., 12/25)
   - Any CVC (e.g., 123)

8. **Check Stripe Dashboard:**
   - Go to **Payments** → Find your test payment
   - Verify: Amount = $37.00
   - Check net amount (should be around $32.49)

---

## ✅ Final Checklist

- [ ] Supabase: Updated prices to 18.00 and 19.00
- [ ] Supabase: Updated Price IDs (both correct)
- [ ] Supabase: Verified all updates
- [ ] Vercel: Deployed latest code
- [ ] Test: Verified prices show correctly on site
- [ ] Test: Verified Stripe checkout shows correct prices
- [ ] Test: Made test purchase successfully

---

## 🎯 Expected Results

**On your website:**
```
SoCal Cup - General Admission    $18.00
SoCal Cup - Parking Pass        $19.00
```

**In Stripe Checkout:**
```
SoCal Cup - General Admission    $18.00
SoCal Cup - Parking Pass        $19.00
──────────────────────────────────────
Total                            $37.00
```

**No tax line shown** ✅ (because it's included in the price - all-in pricing!)

---

## 🆘 Troubleshooting

**Prices not updating?**
- Check Supabase: Run the verification query again
- Check Vercel: Make sure deployment succeeded
- Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

**Stripe checkout shows wrong prices?**
- Verify Price IDs in Supabase match your Stripe products
- Check Stripe Dashboard → Products → Verify prices are $18 and $19

**Stripe checkout shows tax separately?**
- Go to Stripe Dashboard → Products
- Verify "Include tax in price" = YES for both products
- This should hide the tax breakdown

---

## 📁 Files Ready

- `update-pricing-with-price-ids.sql` - Ready-to-run SQL with your Price IDs
- `FINAL_SETUP_STEPS.md` - This file
- `src/App.jsx` - Frontend (already updated ✅)

---

## 🚀 You're Almost Done!

Just run the SQL in Supabase, deploy to Vercel, and test. That's it! 🎉

