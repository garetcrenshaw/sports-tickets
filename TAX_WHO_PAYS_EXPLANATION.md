# 🏛️ Who Pays Tax? Customer POV & All-In Pricing

## Quick Answer

**The CUSTOMER always pays the tax.** You can't split it with the business - it's a legal requirement.

**For all-in pricing (no tax shown):** Use **$18.24**

---

## Who Pays Tax? The CUSTOMER Always Does

### Important Legal Fact
- **Sales tax is ALWAYS paid by the customer** (required by California law)
- You (platform) and the business are just **collecting** it
- You **must remit** it to California
- You **cannot** split tax costs - it's not your money, it's the state's

### What This Means
- Tax is **not** a cost you or the business pay
- Tax is **not** something you can split
- Tax is **always** added to what the customer pays
- You're just the middleman collecting it for the state

---

## Customer POV: What They See

### Option 1: Tax Shown Separately ($17.00)
**Customer sees:**
```
SoCal Cup - General Admission    $17.00
Sales Tax (8.625%)               $1.47
──────────────────────────────────────
Total                            $18.47
```

**What happens:**
- Customer pays: $18.47
- Tax ($1.47) → Goes to California
- Stripe fee ($0.79) → Goes to Stripe
- Net to you: $16.21
- Business: $15.00
- Platform: $1.21

**Problem:** Customer sees tax separately (you don't want this)

---

### Option 2: All-In Pricing ($18.24) ✅ RECOMMENDED

**Customer sees:**
```
SoCal Cup - General Admission    $18.24
──────────────────────────────────────
Total                            $18.24
(No tax line shown)
```

**What happens:**
- Customer pays: $18.24 (all-in, tax included)
- Tax ($1.44) → Already included, goes to California
- Stripe fee ($0.79) → Goes to Stripe
- Net to you: $16.05
- Business: $15.00 ✅
- Platform: $1.05 ✅

**Result:** Customer doesn't see tax separately! ✅

---

## The Math for All-In Pricing

**Target:** Business $15.00 + Platform $1.00+ = $16.00+ net needed

**Calculation:**
```
Customer pays: $18.24 (all-in, tax included)
Base price: $18.24 ÷ 1.08625 = $16.80
Tax: $18.24 - $16.80 = $1.44 (goes to California)
Stripe fee: $16.80 × 0.029 + $0.30 = $0.79 (goes to Stripe)
Net to you: $16.80 - $0.79 = $16.05
Business: $15.00 ✅
Platform: $1.05 ✅
```

---

## Comparison: $17.00 vs $18.24

| Scenario | Customer Pays | Tax Shown? | Business Gets | Platform Gets |
|----------|---------------|------------|---------------|---------------|
| $17.00 + tax separate | $18.47 | ✅ Yes | $15.00 | $1.21 |
| $18.24 all-in | $18.24 | ❌ No | $15.00 | $1.05 |

**Key Difference:**
- $17.00: Customer sees tax line (you don't want this)
- $18.24: Customer sees one price, no tax line ✅

---

## Recommendation: Use $18.24 All-In Pricing

**Why:**
1. ✅ Customer doesn't see tax separately
2. ✅ Business gets exactly $15.00
3. ✅ Platform gets $1.05 (exceeds $1.00 minimum)
4. ✅ California compliant (tax is included, just not shown)
5. ✅ Cleaner customer experience

**What to configure:**
- Stripe price: **$18.24**
- "Include tax in price": **YES** ✅
- Customer sees: **$18.24** (no tax breakdown)

---

## Can You Split Tax with the Business?

**NO.** Here's why:

1. **Tax is not your money** - It belongs to California
2. **Tax is not a cost** - It's a collection requirement
3. **Tax is always paid by customer** - You can't change this
4. **You're just collecting it** - Like a cashier at a store

**What you CAN split:**
- ✅ Net revenue (after tax and Stripe fees)
- ✅ This is what you're already doing: Business $15.00, Platform $1.05

**What you CANNOT split:**
- ❌ Tax (it's not yours to split)
- ❌ Stripe fees (it's a cost, not revenue)

---

## What Makes the Most Sense?

### Option A: $18.24 All-In Pricing ✅ RECOMMENDED

**Pros:**
- Customer sees one clean price
- No tax breakdown shown
- Business gets $15.00
- Platform gets $1.05
- California compliant

**Cons:**
- Customer pays slightly more ($18.24 vs $18.47)
- But they don't see the tax, so it feels like one price

### Option B: $17.00 with Tax Shown

**Pros:**
- Lower total ($18.47 vs $18.24)
- Platform gets more ($1.21 vs $1.05)

**Cons:**
- Customer sees tax separately (you don't want this)
- Less clean experience

---

## Final Recommendation

**Use $18.24 with all-in pricing.**

**Why:**
1. Customer doesn't see tax (your main requirement)
2. Business gets exactly $15.00
3. Platform gets $1.05 (exceeds minimum)
4. Cleaner, more professional experience
5. California compliant

**The $0.23 difference ($18.47 vs $18.24) is worth it** for the cleaner customer experience.

---

## Bottom Line

1. **Customer always pays tax** - It's the law
2. **You can't split tax** - It's not your money
3. **For all-in pricing:** Use **$18.24**
4. **Customer sees:** One price, no tax breakdown ✅
5. **Business gets:** $15.00 ✅
6. **Platform gets:** $1.05 ✅

**This is the best solution for your requirements.**

