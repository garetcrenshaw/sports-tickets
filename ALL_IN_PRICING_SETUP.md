# 🎯 All-In Pricing Setup: Business $15.00, Platform $1.03

## Quick Summary

**Current:** Customer sees $17.00 + $1.47 tax = $18.47, business gets $14.74 ❌

**Target:** Customer sees $18.28 (all-in), business gets $15.00 ✅, you get $1.04 ✅

## Step-by-Step Implementation

### Step 1: Update Stripe Products (CRITICAL)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Products
2. Find **"SoCal Cup - General Admission"**
3. Click on the product
4. Click **"Add another price"** or edit existing price
5. Set:
   - **Price:** `$18.28`
   - **Billing:** `One time`
   - **Tax behavior:** Find the tax settings
   - **"Include tax in price"** = **YES** ✅ (This is the key!)
6. Save the price
7. **Make this the default/active price** (archive old $17.00 price)
8. Repeat for **"SoCal Cup - Parking Pass"**

**Important:** The "Include tax in price" setting is usually found in:
- Product settings → Tax settings
- Or in the Price settings → Tax behavior
- Look for "Tax-inclusive pricing" or "Include tax in price"

### Step 2: Update Database

Run the SQL script:

```bash
# If using Supabase CLI
psql YOUR_DATABASE_URL < update-socal-cup-pricing.sql

# Or run in Supabase SQL Editor
```

Or manually:
```sql
UPDATE events 
SET admission_price = 18.28, parking_price = 18.28
WHERE event_name LIKE '%SoCal Cup%';
```

### Step 3: Update Stripe Price IDs in Database

After creating new prices in Stripe:

1. Copy the new Price IDs from Stripe Dashboard
2. Update the database:

```sql
UPDATE events 
SET 
  stripe_admission_price_id = 'price_NEW_ADMISSION_ID',
  stripe_parking_price_id = 'price_NEW_PARKING_ID'
WHERE event_name LIKE '%SoCal Cup%';
```

Replace `price_NEW_ADMISSION_ID` and `price_NEW_PARKING_ID` with your actual Stripe Price IDs.

### Step 4: Verify Frontend Display

The frontend should already show the price from the database. Check:

1. Go to a SoCal Cup event page
2. Verify it shows **$18.28** (not $17.00)
3. Verify it shows "✓ All-in pricing • No hidden fees"
4. **Tax should NOT be shown separately** (Stripe handles this with tax-inclusive pricing)

### Step 5: Test a Purchase

1. Make a test purchase with Stripe test card: `4242 4242 4242 4242`
2. In checkout, verify:
   - Price shows as **$18.28**
   - **No separate tax line** (or tax is included in the price)
3. After payment, check Stripe Dashboard:
   - Net amount should be ~$16.04
   - Transfer $15.00 to business
   - You keep $1.04

## Verification Checklist

- [ ] Stripe products updated to $18.28
- [ ] "Include tax in price" = YES in Stripe
- [ ] Database prices updated to 18.28
- [ ] Stripe Price IDs updated in database
- [ ] Frontend shows $18.28
- [ ] Test purchase shows all-in price (no tax breakdown)
- [ ] Business receives $15.00 net
- [ ] Platform receives ~$1.04 net

## Troubleshooting

### Customer Still Sees Tax Breakdown

If Stripe Checkout still shows tax separately:
1. Check Stripe Dashboard → Settings → Tax
2. Ensure "Tax-inclusive pricing" is enabled
3. Verify the product price has "Include tax in price" = YES
4. Clear browser cache and test again

### Business Not Getting $15.00

If the net amount is different:
1. Check Stripe Dashboard → Payments → View the payment
2. Calculate: Amount - Tax - Stripe Fee = Net
3. Adjust price slightly if needed (try $18.27 or $18.29)
4. The math: Net should be ~$16.04, then transfer $15.00 to business

### Price Not Updating on Frontend

1. Check database: `SELECT admission_price FROM events WHERE event_name LIKE '%SoCal Cup%';`
2. Check if frontend is caching prices
3. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)
4. Check browser console for errors

## California Compliance

✅ **You're compliant because:**
- Total price includes all fees and taxes
- No hidden charges
- Stripe Tax handles tax calculation and remittance
- Tax-inclusive pricing is legal in California

## Revenue Split

**Per ticket:**
- Customer pays: $18.28
- Tax (8.625%): $1.45 (handled by Stripe)
- Stripe fee: $0.79
- Net to you: $16.04
- **Transfer to business: $15.00**
- **You keep: $1.04** ✅

The $0.01 difference from target $1.03 is due to rounding and is acceptable.

