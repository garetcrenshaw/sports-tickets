# ⚡ Quick Price Fix

## If Price IDs Are Set But Still Wrong

**Most likely:** The Price IDs in your database point to prices that are still $15.00 in Stripe.

---

## The Fix (2 Options)

### Option 1: Update Prices in Stripe (Fastest)

1. **Stripe Dashboard** → Products
2. **"SoCal Cup - General Admission"**
3. Click on the **price** (not the product)
4. **Edit** → Change to **$18.00**
5. **"Include tax in price" = YES** ✅
6. **Save**
7. **Repeat for Parking** → **$19.00**

**No database changes needed!** The Price IDs stay the same, just the prices change.

---

### Option 2: Create New Prices & Update Database

1. **Stripe Dashboard** → Products
2. **"SoCal Cup - General Admission"**
3. **Add new price** → **$18.00**, tax-inclusive
4. **Copy new Price ID**
5. **Repeat for Parking** → **$19.00**
6. **Update database:**

```sql
UPDATE events 
SET 
  stripe_admission_price_id = 'price_NEW_18_ID',
  stripe_parking_price_id = 'price_NEW_19_ID'
WHERE 
  event_name LIKE '%SoCal Cup%';
```

---

## Which Should You Do?

**Option 1 is easier** - Just update the prices in Stripe, no database changes.

**Option 2 is cleaner** - New prices, but requires database update.

**I recommend Option 1** - Just update the existing prices to $18/$19 in Stripe! ✅

---

## After Fixing

1. **Test locally:** `http://localhost:3000/org/socal-cup`
2. **Add tickets** → Checkout
3. **Should show:** $18.00 and $19.00 ✅

---

Which option do you want to use? Or tell me what prices those Price IDs show in Stripe and I'll help you fix it!

