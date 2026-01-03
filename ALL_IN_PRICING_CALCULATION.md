# 💰 All-In Pricing: Business Gets $15.00, Platform Gets $1.03

## Goal
- Business receives: **$15.00 net** (after tax and Stripe fees)
- Platform receives: **$1.03 net** (after tax and Stripe fees)
- Customer sees: **All-in price** (no tax breakdown shown)
- California compliant

## Current Problem
- Price: $17.00
- "Include tax in price" = NO
- Customer sees: $17.00 + $1.47 tax = $18.47
- Business gets: $14.74 ❌ (should be $15.00)
- Platform gets: $1.29 ❌ (should be $1.03)

## Solution: Tax-Inclusive Pricing

### Step 1: Calculate the Correct Price

**Target:**
- Business net: $15.00
- Platform net: $1.03
- Total net needed: $16.03

**With tax-inclusive pricing:**
- Customer pays: $X (all-in, tax included)
- Tax (8.625%): Removed from $X first
- Stripe fee (2.9% + $0.30): Applied to amount after tax
- Net to business + platform: $16.03

**Calculation:**
```
Let X = customer pays (all-in price)

With "Include tax in price" = YES:
- Base price (before tax) = X / 1.08625
- Tax = X - (X / 1.08625) = X * 0.0794
- Amount after tax = X / 1.08625 = X * 0.9206
- Stripe fee = (X / 1.08625) * 0.029 + $0.30 = X * 0.0267 + $0.30
- Net = X / 1.08625 - ((X / 1.08625) * 0.029 + $0.30)
- Net = X * 0.9206 - (X * 0.0267 + $0.30)
- Net = X * 0.8939 - $0.30

We need: X * 0.8939 - $0.30 = $16.03
X * 0.8939 = $16.33
X = $16.33 / 0.8939 = $18.28
```

**Result: Set price to $18.28**

### Step 2: Verify the Math

**With price = $18.28:**
- Customer pays: $18.28 (all-in, no tax breakdown shown)
- Base price: $18.28 / 1.08625 = $16.83
- Tax: $18.28 - $16.83 = $1.45
- Stripe fee: $16.83 * 0.029 + $0.30 = $0.79
- Net: $16.83 - $0.79 = $16.04 ✅

**Split:**
- Transfer to business: $15.00
- Platform keeps: $16.04 - $15.00 = $1.04 ✅ (very close to $1.03)

The $0.01 difference is due to rounding and is acceptable.

### Step 3: Implementation

1. **Update Stripe Product:**
   - Go to Stripe Dashboard → Products
   - Find "SoCal Cup - General Admission"
   - Edit price: **$18.28**
   - **Set "Include tax in price" = YES** ✅
   - Save

2. **Update Database:**
   ```sql
   UPDATE events 
   SET admission_price = 18.28, parking_price = 18.28
   WHERE event_name LIKE '%SoCal Cup%';
   ```

3. **Update Frontend Display:**
   - Show $18.28 as the all-in price
   - Remove tax breakdown from display
   - Keep "✓ All-in pricing • No hidden fees" message

4. **Revenue Split:**
   - After payment, you receive ~$16.04 net
   - Transfer exactly $15.00 to business
   - You keep $1.04 (close to target $1.03)

## California Compliance ✅

**Tax-inclusive pricing is legal in California** when:
- The total price includes all fees and taxes
- No hidden charges
- Stripe Tax handles tax calculation and remittance automatically

Since you're using Stripe Tax with "Include tax in price" = YES, compliance is automatic.

## Summary

**What to do:**
1. ✅ Set Stripe price to **$18.28**
2. ✅ Set "Include tax in price" = **YES**
3. ✅ Update database prices to **18.28**
4. ✅ Update frontend to show **$18.28** (no tax breakdown)
5. ✅ Transfer **$15.00** to business after each payment
6. ✅ You keep **~$1.04** per ticket

**Result:**
- Customer sees: **$18.28** (clean, all-in price)
- Business gets: **$15.00** ✅
- You get: **$1.04** ✅ (very close to $1.03 target)

