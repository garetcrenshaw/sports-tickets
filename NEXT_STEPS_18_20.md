# 🚀 Next Steps: $18.20 Pricing Setup

## ✅ What's Already Done

- ✅ Frontend code updated to $18.20
- ✅ SQL script created (`update-pricing-18-20.sql`)
- ✅ Setup guide created (`PRICING_18_20_SETUP.md`)

---

## 📋 Your Action Items (In Order)

### 1. Update Stripe Products ⚠️ DO THIS FIRST

**General Admission:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Find **"SoCal Cup - General Admission"**
3. Click on it → Edit price or create new price
4. Set:
   - **Price:** `$18.20`
   - **"Include tax in price":** **YES** ✅
5. Save and make it active
6. **Copy the Price ID** (starts with `price_...`)

**Parking:**
1. Find **"SoCal Cup - Parking Pass"**
2. Edit or create new price:
   - **Price:** `$18.20`
   - **"Include tax in price":** **YES** ✅
3. Save and make it active
4. **Copy the Price ID** (starts with `price_...`)

**Write down both Price IDs!** You'll need them for Step 2.

---

### 2. Update Supabase Database

**Option A: Quick Update (Recommended)**
1. Go to [Supabase Dashboard](https://supabase.com) → Your Project → SQL Editor
2. Copy and paste this (replace Price IDs with yours from Step 1):

```sql
-- Update prices
UPDATE events 
SET 
  admission_price = 18.20,
  parking_price = 18.20
WHERE 
  event_name LIKE '%SoCal Cup%'
  OR event_name LIKE '%socal cup%';

-- Update Stripe Price IDs (REPLACE WITH YOUR ACTUAL IDs)
UPDATE events 
SET 
  stripe_admission_price_id = 'price_YOUR_ADMISSION_ID_HERE',
  stripe_parking_price_id = 'price_YOUR_PARKING_ID_HERE'
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

**Option B: Use SQL File**
1. Open `update-pricing-18-20.sql` in Supabase SQL Editor
2. Replace the placeholder Price IDs with your actual ones
3. Run the script

---

### 3. Deploy to Vercel

**Option A: Auto-Deploy (If connected to Git)**
```bash
git add .
git commit -m "Update pricing to $18.20 all-in"
git push
```
Vercel will auto-deploy.

**Option B: Manual Deploy**
1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Click "Deployments" → "Redeploy" (or push to trigger)

---

### 4. Test Everything

1. **Visit your site** → Go to a SoCal Cup event
2. **Verify price shows:** $18.20
3. **Add to cart** → Go to checkout
4. **Verify Stripe checkout shows:** $18.20 (no tax breakdown)
5. **Complete test purchase** with card `4242 4242 4242 4242`
6. **Check Stripe Dashboard:**
   - Payment amount: $18.20
   - Net amount: ~$15.97
   - Verify business gets $15.00, you get $0.97

---

## ✅ Checklist

- [ ] Stripe: General Admission updated to $18.20
- [ ] Stripe: Parking updated to $18.20
- [ ] Stripe: "Include tax in price" = YES for both
- [ ] Stripe: Copied both Price IDs
- [ ] Supabase: Updated admission_price to 18.20
- [ ] Supabase: Updated parking_price to 18.20
- [ ] Supabase: Updated stripe_admission_price_id
- [ ] Supabase: Updated stripe_parking_price_id
- [ ] Vercel: Deployed latest code
- [ ] Test: Made test purchase and verified

---

## 📊 Expected Results

**Customer sees:**
```
SoCal Cup - General Admission    $18.20
──────────────────────────────────────
Total                            $18.20
```

**Revenue breakdown:**
- Customer pays: $18.20
- Tax: $1.44 (goes to California)
- Stripe fee: $0.79 (goes to Stripe)
- Net: $15.97
- **Business: $15.00** ✅
- **Platform: $0.97** ✅

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
- Verify net amount matches expected $15.97

---

## 📁 Files Reference

- `PRICING_18_20_SETUP.md` - Detailed setup guide
- `update-pricing-18-20.sql` - SQL script
- `NEXT_STEPS_18_20.md` - This file
- `src/App.jsx` - Frontend (already updated ✅)

---

## 🎯 Summary

1. **Stripe:** Update products to $18.20, "Include tax in price" = YES
2. **Supabase:** Update prices and Price IDs
3. **Vercel:** Deploy (auto or manual)
4. **Test:** Verify everything works

**That's it!** 🚀

