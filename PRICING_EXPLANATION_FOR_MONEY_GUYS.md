# 💰 Pricing Explanation: Taxes vs Stripe Fees

## Quick Answer

**YES, we can do $17!** But it depends on how you want to show it to customers.

## Taxes vs Stripe Fees: They Are SEPARATE

### 1. **Sales Tax (8.625%)** - Goes to California
- This is **NOT** a fee you keep
- This goes to the **state of California**
- You collect it, but you **must remit it** to the state
- Stripe Tax handles this automatically

### 2. **Stripe Processing Fee (2.9% + $0.30)** - Goes to Stripe
- This is **NOT** a fee you keep
- This goes to **Stripe** (the payment processor)
- This is the cost of accepting credit cards
- Stripe takes this automatically from each payment

### 3. **Your Revenue** - What You Actually Keep
- This is what's left after tax and Stripe fees
- You split this between business ($15) and platform ($1+)

---

## Option 1: $17.00 with Tax Shown Separately

**Customer sees:**
```
SoCal Cup - General Admission    $17.00
Sales Tax (8.625%)               $1.47
──────────────────────────────────────
Total                            $18.47
```

**What happens:**
1. Customer pays: **$18.47 total**
2. Tax ($1.47) goes to California (handled by Stripe)
3. Stripe fee: $17.00 × 2.9% + $0.30 = **$0.79** (goes to Stripe)
4. **Net to you: $17.00 - $0.79 = $16.21**
5. Business gets: **$15.00** ✅
6. Platform gets: **$1.21** ✅

**Stripe Settings:**
- Price: **$17.00**
- "Include tax in price": **NO**

**Result:** ✅ Works! Business gets $15, you get $1.21

---

## Option 2: $17.00 with Tax Included (All-In Pricing)

**Customer sees:**
```
SoCal Cup - General Admission    $17.00
──────────────────────────────────────
Total                            $17.00
(No tax line shown)
```

**What happens:**
1. Customer pays: **$17.00 total**
2. Tax is included in the $17.00
   - Base price: $17.00 ÷ 1.08625 = **$15.66**
   - Tax: $17.00 - $15.66 = **$1.34** (goes to California)
3. Stripe fee: $15.66 × 2.9% + $0.30 = **$0.75** (goes to Stripe)
4. **Net to you: $15.66 - $0.75 = $14.91**
5. Business gets: **$14.91** ❌ (Not enough!)
6. Platform gets: **$0.00** ❌ (Nothing left!)

**Stripe Settings:**
- Price: **$17.00**
- "Include tax in price": **YES**

**Result:** ❌ Doesn't work! Not enough money after tax and fees.

---

## Why Option 2 Doesn't Work

When tax is **included** in the price:
- The $17.00 is split: $15.66 (base) + $1.34 (tax)
- You only get to keep the $15.66 base
- After Stripe fees, you're left with $14.91
- Not enough to give business $15.00!

---

## The Solution: $17.00 with Tax Separate

**Use Option 1:**
- Price: **$17.00**
- "Include tax in price": **NO**
- Customer sees: $17.00 + $1.47 tax = $18.47 total
- You get: $16.21 net
- Business gets: $15.00 ✅
- Platform gets: $1.21 ✅

**This is California compliant** because:
- Tax is shown separately (required by law)
- No hidden fees
- Transparent pricing

---

## Comparison Table

| Scenario | Customer Pays | Tax | Stripe Fee | Net to You | Business Gets | Platform Gets |
|----------|---------------|-----|------------|------------|---------------|---------------|
| $17 + tax separate | $18.47 | $1.47 | $0.79 | $16.21 | $15.00 ✅ | $1.21 ✅ |
| $17 tax included | $17.00 | $1.34 | $0.75 | $14.91 | $14.91 ❌ | $0.00 ❌ |
| $18.28 tax included | $18.28 | $1.45 | $0.79 | $16.04 | $15.00 ✅ | $1.04 ✅ |

---

## Recommendation for Money Guys

**Use $17.00 with tax shown separately:**

1. **Customer pays:** $18.47 total ($17.00 + $1.47 tax)
2. **Tax ($1.47):** Goes to California (you don't keep this)
3. **Stripe fee ($0.79):** Goes to Stripe (you don't keep this)
4. **Net revenue ($16.21):** This is what you actually keep
5. **Business share:** $15.00 (guaranteed)
6. **Platform share:** $1.21 (guaranteed)

**Why this works:**
- Business gets exactly $15.00 ✅
- Platform gets $1.21 (exceeds $1.00 minimum) ✅
- Customer sees transparent pricing ✅
- California compliant ✅

---

## What Needs to Change

1. **Stripe Product Settings:**
   - Price: $17.00
   - "Include tax in price": **NO** (so tax shows separately)

2. **Database:**
   - Keep prices at $17.00 (or update if they're different)

3. **Frontend:**
   - Show $17.00 as the ticket price
   - Tax will be added by Stripe automatically

---

## Key Takeaways for Money Guys

1. **Taxes and Stripe fees are SEPARATE** - neither goes to you
2. **Tax goes to California** - you're just collecting it
3. **Stripe fee goes to Stripe** - cost of processing payments
4. **$17.00 works** if tax is shown separately
5. **$17.00 doesn't work** if tax is included (not enough money)
6. **Net revenue is what matters** - that's what you split

---

## Bottom Line

**YES, $17.00 works!** But you must show tax separately (not include it in the price).

- Customer pays: $18.47 total
- Business gets: $15.00 ✅
- Platform gets: $1.21 ✅
- Everyone is happy! 🎉

