# 💰 Stripe Tax Setup - All-In Pricing

## ✅ Correct Settings for California All-In Pricing

### In Stripe Product Creation:

**"Include tax in price"** = **NO** ✅

**Why?**
- $17 is your **ticket price** (no hidden fees)
- Tax is **added on top** (required by law)
- Customer sees: `$17.00 + tax = Total`
- This is **California compliant** ✅

---

## How It Works

### Customer Sees:
```
Admission Tickets (1)     $17.00
Sales Tax (8.625%)        $1.47
───────────────────────────────
Total                      $18.47
```

### Your Revenue Split:
```
Customer Pays:            $18.47
├── Sales Tax:            -$1.47  (goes to state)
├── Stripe Fee (2.9%+$0.30): -$0.79
├── Business Gets:        $15.00
└── You Keep:             ~$1.21 ✅
```

---

## Why NOT "Include Tax = Yes"?

If you set "Include tax in price" = **YES**:

**Problem:**
- $17 includes tax
- Tax comes out first: $17 - $1.47 = $15.53
- Then Stripe fees: $15.53 - $0.79 = $14.74
- **Business only gets $14.74** ❌ (not $15!)

**Your revenue:**
- You'd get: ~$0.79 (less than $1)

**Not what you want!**

---

## Stripe Will Handle Tax Automatically

✅ Stripe automatically:
- Calculates tax based on customer location
- Shows it separately in checkout
- Collects and remits to state
- You don't need to do anything

✅ Your code already shows:
- "✓ All-in pricing • No hidden fees"
- This means: **No hidden platform fees**
- Tax is shown separately (as required)

---

## Final Stripe Product Settings

**Product 1: SoCal Cup - General Admission**
- Name: `SoCal Cup - General Admission`
- Price: `$17.00`
- Currency: `USD`
- Billing: `One time`
- **Include tax in price: NO** ✅

**Product 2: SoCal Cup - Parking Pass**
- Name: `SoCal Cup - Parking Pass`
- Price: `$17.00`
- Currency: `USD`
- Billing: `One time`
- **Include tax in price: NO** ✅

---

## California Compliance ✅

Your setup is compliant because:
1. ✅ **No hidden fees** - Customer sees $17 ticket price
2. ✅ **Tax shown separately** - Required by law
3. ✅ **Transparent pricing** - Customer knows exactly what they're paying
4. ✅ **All-in means no platform fees** - Not "tax included"

---

## Summary

**Set "Include tax in price" = NO** ✅

This gives you:
- Business gets: $15.00
- You get: ~$1.21
- Tax handled automatically by Stripe
- California compliant

**Perfect!** 🎉

