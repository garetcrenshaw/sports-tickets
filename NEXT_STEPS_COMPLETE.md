# 🚀 Next Steps: Complete $18 Admission + $19 Parking Setup

## ✅ What's Already Done

- ✅ Frontend code updated to $18 admission + $19 parking
- ✅ SQL script ready (`update-pricing-18-19.sql`)
- ✅ All-in pricing configured (tax included, no breakdown shown)

---

## 📋 Your Next Steps (Do These In Order)

### Step 1: Update Stripe Products ⚠️ CRITICAL - DO THIS FIRST

**You need to create/update 2 products in Stripe:**

#### A. General Admission Product:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Click **"+ Add product"** or find existing **"SoCal Cup - General Admission"**
3. If creating new:
   - **Name:** `SoCal Cup - General Admission`
   - **Description:** `General admission ticket for SoCal Cup events`
4. Add price:
   - **Price:** `$18.00`
   - **Billing:** `One time`
   - **Currency:** `USD`
5. **Find Tax Settings:**
   - Look for **"Tax behavior"** or **"Include tax in price"**
   - Set to **"Tax-inclusive"** or **"Include tax in price: YES"** ✅
6. **Save** and make this the active price
7. **Copy the Price ID** (starts with `price_...`) - Write it down!

#### B. Parking Product:

1. Click **"+ Add product"** or find existing **"SoCal Cup - Parking Pass"**
2. If creating new:
   - **Name:** `SoCal Cup - Parking Pass`
   - **Description:** `Parking pass for SoCal Cup events`
3. Add price:
   - **Price:** `$19.00`
   - **Billing:** `One time`
   - **Currency:** `USD`
4. **Find Tax Settings:**
   - Set to **"Tax-inclusive"** or **"Include tax in price: YES"** ✅
5. **Save** and make this the active price
6. **Copy the Price ID** (starts with `price_...`) - Write it down!

**⚠️ IMPORTANT:** You now have 2 Price IDs written down. You'll need them for Step 2!

---

### Step 2: Update Supabase Database

1. Go to [Supabase Dashboard](https://supabase.com)
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"**

#### A. Update Prices:

Copy and paste this SQL:

```sql
UPDATE events 
SET 
  admission_price = 18.00,
  parking_price = 19.00
WHERE 
  event_name LIKE '%SoCal Cup%'
  OR event_name LIKE '%socal cup%';
```

Click **"Run"** (or press Cmd/Ctrl + Enter)

#### B. Update Stripe Price IDs:

**Replace `price_YOUR_ADMISSION_ID` and `price_YOUR_PARKING_ID` with your actual Price IDs from Step 1!**

```sql
UPDATE events 
SET 
  stripe_admission_price_id = 'price_YOUR_ADMISSION_ID',
  stripe_parking_price_id = 'price_YOUR_PARKING_ID'
WHERE 
  event_name LIKE '%SoCal Cup%'
  OR event_name LIKE '%socal cup%';
```

Click **"Run"**

#### C. Verify:

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

**Check that:**
- `admission_price` = 18.00
- `parking_price` = 19.00
- `stripe_admission_price_id` = your Price ID
- `stripe_parking_price_id` = your Price ID

---

### Step 3: Deploy to Vercel

**Option A: If you have Git connected (Recommended):**

Open terminal in your project folder and run:

```bash
git add .
git commit -m "Update pricing to $18 admission + $19 parking all-in"
git push
```

Vercel will automatically deploy.

**Option B: If you need to deploy manually:**

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Go to **"Deployments"** tab
4. Click **"Redeploy"** or push your code to trigger a new deployment

---

### Step 4: Test Everything

1. **Visit your site** (after Vercel deploys)
2. **Navigate to a SoCal Cup event**
3. **Verify prices show:**
   - Admission: **$18.00**
   - Parking: **$19.00**
4. **Add items to cart:**
   - Select 1 admission ticket
   - Select 1 parking pass
5. **Go to checkout** (Stripe Checkout)
6. **Verify Stripe shows:**
   - Admission: **$18.00**
   - Parking: **$19.00**
   - Total: **$37.00**
   - **No tax breakdown shown** ✅ (this is correct!)
7. **Complete test purchase:**
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any CVC
8. **Check Stripe Dashboard:**
   - Go to **Payments** → Find your test payment
   - Verify amount: $37.00
   - Check net amount (should be around $32.49)

---

## ✅ Final Checklist

- [ ] Stripe: Created/updated Admission product ($18.00, tax-inclusive)
- [ ] Stripe: Created/updated Parking product ($19.00, tax-inclusive)
- [ ] Stripe: Copied both Price IDs
- [ ] Supabase: Updated admission_price to 18.00
- [ ] Supabase: Updated parking_price to 19.00
- [ ] Supabase: Updated stripe_admission_price_id
- [ ] Supabase: Updated stripe_parking_price_id
- [ ] Supabase: Verified all updates
- [ ] Vercel: Deployed latest code
- [ ] Test: Verified prices show correctly
- [ ] Test: Made test purchase and verified

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

**No tax line shown** ✅ (because it's included in the price)

---

## 🆘 Need Help?

**Prices not showing correctly?**
- Check Supabase: Run the verification query
- Check Vercel: Make sure deployment succeeded
- Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

**Stripe checkout shows tax separately?**
- Go back to Stripe Dashboard → Products
- Verify "Include tax in price" = YES for both products
- Make sure you're using the correct Price IDs

**Can't find tax settings in Stripe?**
- Look for "Tax behavior" or "Tax settings"
- It might be under "Pricing" or "Advanced options"
- If you can't find it, Stripe Tax might need to be enabled first

---

## 📁 Files You Have

- `SETUP_18_19_PRICING.md` - Detailed setup guide
- `update-pricing-18-19.sql` - SQL script (optional, you can copy/paste SQL above)
- `NEXT_STEPS_COMPLETE.md` - This file
- `src/App.jsx` - Frontend (already updated ✅)

---

## 🚀 You're Ready!

Follow the steps above in order, and you'll be all set. The most important part is **Step 1 (Stripe)** - make sure you set "Include tax in price" = YES for both products!

Good luck! 🎉

