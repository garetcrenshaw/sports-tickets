# 💰 Pricing Options: $19 Parking + $17 Admission

## Option A: $19 Parking + $17 Admission (What You Asked)

**What customer sees:**
```
SoCal Cup - General Admission    $17.00
SoCal Cup - Parking Pass        $19.00
──────────────────────────────────────
Total                            $36.00
```

**Revenue breakdown:**

**Admission ($17.00):**
- Base: $17.00 ÷ 1.08625 = $15.65
- Tax: $1.35
- Stripe fee: $15.65 × 0.029 + $0.30 = $0.75
- Net: $15.65 - $0.75 = **$14.90**
- Business: $14.90

**Parking ($19.00):**
- Base: $19.00 ÷ 1.08625 = $17.50
- Tax: $1.50
- Stripe fee: $17.50 × 0.029 + $0.30 = $0.81
- Net: $17.50 - $0.81 = **$16.69**
- Platform: $16.69 ✅

**Total:**
- Business: $14.90 (from admission)
- Platform: $16.69 (from parking) ✅

**Issues:**
- ❌ Parking ($19) is more expensive than admission ($17) - that's backwards!
- ❌ Parents will be confused: "Why is parking more than the ticket?"
- ❌ Business gets $14.90 (less than $15.00 target)

---

## Option B: $19 Admission + $17 Parking (More Logical)

**What customer sees:**
```
SoCal Cup - General Admission    $19.00
SoCal Cup - Parking Pass        $17.00
──────────────────────────────────────
Total                            $36.00
```

**Revenue breakdown:**

**Admission ($19.00):**
- Base: $19.00 ÷ 1.08625 = $17.50
- Tax: $1.50
- Stripe fee: $17.50 × 0.029 + $0.30 = $0.81
- Net: $17.50 - $0.81 = **$16.69**
- Business: $15.00 ✅ (exactly what they need!)
- Platform: $1.69 ✅ (from admission)

**Parking ($17.00):**
- Base: $17.00 ÷ 1.08625 = $15.65
- Tax: $1.35
- Stripe fee: $15.65 × 0.029 + $0.30 = $0.75
- Net: $15.65 - $0.75 = **$14.90**
- Platform: $14.90 ✅

**Total:**
- Business: $15.00 (from admission) ✅
- Platform: $1.69 + $14.90 = **$16.59** ✅

**Wait, that doesn't make sense either...**

Let me recalculate. If business needs $15.00 from admission, and platform gets the rest, then:

**Admission ($19.00):**
- Net: $16.69
- Business: $15.00 ✅
- Platform: $1.69 ✅

**Parking ($17.00):**
- Net: $14.90
- Platform: $14.90 ✅

**Total:**
- Business: $15.00 ✅
- Platform: $1.69 + $14.90 = $16.59 ✅

**This works!** But parking being $17 is still weird - parking should be cheaper.

---

## Option C: $19 Admission + $2 Parking (Most Logical) ✅ RECOMMENDED

**What customer sees:**
```
SoCal Cup - General Admission    $19.00
SoCal Cup - Parking Pass        $2.00
──────────────────────────────────────
Total                            $21.00
```

**Revenue breakdown:**

**Admission ($19.00):**
- Base: $19.00 ÷ 1.08625 = $17.50
- Tax: $1.50
- Stripe fee: $17.50 × 0.029 + $0.30 = $0.81
- Net: $17.50 - $0.81 = **$16.69**
- Business: $15.00 ✅ (exactly what they need!)
- Platform: $1.69 ✅ (exceeds $1.00!)

**Parking ($2.00):**
- Base: $2.00 ÷ 1.08625 = $1.84
- Tax: $0.16
- Stripe fee: $1.84 × 0.029 + $0.30 = $0.35
- Net: $1.84 - $0.35 = **$1.49**
- Platform: $1.49 ✅

**Total:**
- Business: $15.00 ✅ (from admission)
- Platform: $1.69 + $1.49 = **$3.18** ✅

**Pros:**
- ✅ Business gets exactly $15.00 from admission
- ✅ Platform gets $3.18 total (well above $1.00)
- ✅ Makes logical sense: Admission $19, Parking $2
- ✅ Round numbers
- ✅ Clear separation

**Cons:**
- Total is $21 (higher than $19, but still reasonable)

---

## My Recommendation

**Use Option C: $19 Admission + $2 Parking**

**Why:**
1. ✅ Business gets exactly $15.00 from admission
2. ✅ Platform gets $3.18 total (well above $1.00)
3. ✅ Makes logical sense to parents (admission is main cost, parking is add-on)
4. ✅ Round numbers ($19, $2, $21)
5. ✅ Clear separation

**What customer sees:**
```
SoCal Cup - General Admission    $19.00
SoCal Cup - Parking Pass        $2.00
──────────────────────────────────────
Total                            $21.00
```

**This is the most logical and parent-friendly option!**

---

## Comparison Table

| Option | Admission | Parking | Total | Business Gets | Platform Gets | Makes Sense? |
|--------|-----------|---------|-------|--------------|----------------|--------------|
| A: $17 + $19 | $17 | $19 | $36 | $14.90 | $16.69 | ❌ No (parking > admission) |
| B: $19 + $17 | $19 | $17 | $36 | $15.00 | $16.59 | ⚠️ Weird (parking too high) |
| **C: $19 + $2** | **$19** | **$2** | **$21** | **$15.00** | **$3.18** | **✅ Yes!** |

---

## What Do You Think?

**Option C ($19 admission + $2 parking) is the best because:**
- Business gets exactly $15.00 ✅
- Platform gets $3.18 ✅
- Makes logical sense to parents ✅
- Round numbers ✅

**Should I set this up?** 🚀

