# 💰 Optimal Pricing: Business $30 Total, Platform $1+ Minimum

## Requirements

**Business:**
- Needs $30 total net from 1 admission + 1 parking
- Currently makes $15 per person from admission + parking

**Platform:**
- Wants at least $1 from at least one purchase
- More is great, but need happy medium

**Customers:**
- Need round numbers
- Need clear separation (parking vs admission)
- Need reasonable prices

---

## Strategy: Parking MORE, Admission LESS

Since parking can be more expensive (makes sense - it's per car), let's explore:

---

## Option 1: $20 Parking + $10 Admission

**What customer sees:**
```
SoCal Cup - General Admission    $10.00
SoCal Cup - Parking Pass        $20.00
──────────────────────────────────────
Total                            $30.00
```

**Revenue breakdown:**

**Admission ($10.00):**
- Base: $10.00 ÷ 1.08625 = $9.21
- Tax: $0.79
- Stripe fee: $9.21 × 0.029 + $0.30 = $0.57
- Net: $9.21 - $0.57 = **$8.64**
- Business: $7.64
- Platform: $1.00 ✅

**Parking ($20.00):**
- Base: $20.00 ÷ 1.08625 = $18.41
- Tax: $1.59
- Stripe fee: $18.41 × 0.029 + $0.30 = $0.83
- Net: $18.41 - $0.83 = **$17.58**
- Business: $16.58
- Platform: $1.00 ✅

**Total:**
- Business: $7.64 + $16.58 = **$24.22** ❌ (Not enough! Need $30)

---

## Option 2: $25 Parking + $10 Admission

**What customer sees:**
```
SoCal Cup - General Admission    $10.00
SoCal Cup - Parking Pass        $25.00
──────────────────────────────────────
Total                            $35.00
```

**Revenue breakdown:**

**Admission ($10.00):**
- Net: $8.64
- Business: $7.64
- Platform: $1.00 ✅

**Parking ($25.00):**
- Base: $25.00 ÷ 1.08625 = $23.02
- Tax: $1.98
- Stripe fee: $23.02 × 0.029 + $0.30 = $0.97
- Net: $23.02 - $0.97 = **$22.05**
- Business: $21.05
- Platform: $1.00 ✅

**Total:**
- Business: $7.64 + $21.05 = **$28.69** ❌ (Close but not $30)

---

## Option 3: $25 Parking + $12 Admission

**What customer sees:**
```
SoCal Cup - General Admission    $12.00
SoCal Cup - Parking Pass        $25.00
──────────────────────────────────────
Total                            $37.00
```

**Revenue breakdown:**

**Admission ($12.00):**
- Base: $12.00 ÷ 1.08625 = $11.05
- Tax: $0.95
- Stripe fee: $11.05 × 0.029 + $0.30 = $0.62
- Net: $11.05 - $0.62 = **$10.43**
- Business: $9.43
- Platform: $1.00 ✅

**Parking ($25.00):**
- Net: $22.05
- Business: $21.05
- Platform: $1.00 ✅

**Total:**
- Business: $9.43 + $21.05 = **$30.48** ✅ (Exceeds $30!)

**Platform:**
- $1.00 from admission + $1.00 from parking = **$2.00 total** ✅

---

## Option 4: $24 Parking + $12 Admission

**What customer sees:**
```
SoCal Cup - General Admission    $12.00
SoCal Cup - Parking Pass        $24.00
──────────────────────────────────────
Total                            $36.00
```

**Revenue breakdown:**

**Admission ($12.00):**
- Net: $10.43
- Business: $9.43
- Platform: $1.00 ✅

**Parking ($24.00):**
- Base: $24.00 ÷ 1.08625 = $22.10
- Tax: $1.90
- Stripe fee: $22.10 × 0.029 + $0.30 = $0.94
- Net: $22.10 - $0.94 = **$21.16**
- Business: $20.16
- Platform: $1.00 ✅

**Total:**
- Business: $9.43 + $20.16 = **$29.59** ⚠️ (Very close to $30)

**Platform:**
- $1.00 from admission + $1.00 from parking = **$2.00 total** ✅

---

## Option 5: $25 Parking + $13 Admission

**What customer sees:**
```
SoCal Cup - General Admission    $13.00
SoCal Cup - Parking Pass        $25.00
──────────────────────────────────────
Total                            $38.00
```

**Revenue breakdown:**

**Admission ($13.00):**
- Base: $13.00 ÷ 1.08625 = $11.97
- Tax: $1.03
- Stripe fee: $11.97 × 0.029 + $0.30 = $0.65
- Net: $11.97 - $0.65 = **$11.32**
- Business: $10.32
- Platform: $1.00 ✅

**Parking ($25.00):**
- Net: $22.05
- Business: $21.05
- Platform: $1.00 ✅

**Total:**
- Business: $10.32 + $21.05 = **$31.37** ✅ (Exceeds $30!)

**Platform:**
- $1.00 from admission + $1.00 from parking = **$2.00 total** ✅

---

## Comparison Table

| Option | Admission | Parking | Total | Business Gets | Platform Gets | Meets Requirements? |
|-------|-----------|---------|-------|--------------|--------------|---------------------|
| 1: $10 + $20 | $10 | $20 | $30 | $24.22 | $2.00 | ❌ Business too low |
| 2: $10 + $25 | $10 | $25 | $35 | $28.69 | $2.00 | ⚠️ Business close |
| 3: $12 + $25 | $12 | $25 | $37 | $30.48 | $2.00 | ✅ Perfect! |
| 4: $12 + $24 | $12 | $24 | $36 | $29.59 | $2.00 | ⚠️ Business close |
| 5: $13 + $25 | $13 | $25 | $38 | $31.37 | $2.00 | ✅ Exceeds! |

---

## My Recommendation: Option 3 ($12 Admission + $25 Parking) ✅

**Why this is optimal:**

1. ✅ **Business gets $30.48** (exceeds $30 requirement)
2. ✅ **Platform gets $2.00** ($1.00 from each purchase)
3. ✅ **Round numbers** ($12, $25, $37)
4. ✅ **Clear separation** (admission vs parking)
5. ✅ **Makes logical sense:**
   - "Admission is $12 per person"
   - "Parking is $25 per car (carpool to save!)"
   - "4 people carpool = $12×4 + $25 = $73 total"

**What customer sees:**
```
SoCal Cup - General Admission    $12.00
SoCal Cup - Parking Pass        $25.00
──────────────────────────────────────
Total                            $37.00
```

**Explanation to parents:**
- "Admission is $12 per person"
- "Parking is $25 per car"
- "Carpool with friends to save! 4 people = $12×4 + $25 = $73"
- "That's only $18.25 per person when you carpool!"

**This is the happy medium!** 🎯

---

## Alternative: Option 5 ($13 Admission + $25 Parking)

If you want business to get even more:
- Business: $31.37 (exceeds $30)
- Platform: $2.00
- Total: $38.00

**But $37 total is probably better than $38 for customer perception.**

---

## Final Recommendation

**Use $12 Admission + $25 Parking = $37 Total**

**Result:**
- Business: $30.48 ✅ (exceeds $30)
- Platform: $2.00 ✅ ($1.00 from each)
- Customers: Round numbers, clear separation ✅
- Happy medium achieved! ✅

**Should I set this up?** 🚀

