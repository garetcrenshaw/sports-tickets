# 🎯 Pricing Reality Check: Youth Sports Event

## The Reality

**Event:**
- 800 cars
- 2,000+ people
- People carpool (multiple people per car)

**Financial Requirements:**
- Platform: $1 per car (parking) + $1 per person (admission)
- Business: $15 per person (admission)
- Business: $15 per car (parking) - Wait, does this make sense?

**The Problem:**
- $18.24 for both admission AND parking is weird
- Parents will be confused
- Need round numbers
- Need clear separation

---

## Let Me Think Through This...

### Scenario 1: Business Needs $15 Per Car for Parking

If business needs $15 per car for parking:
- Net needed: $15 (business) + $1 (platform) = $16
- Price with tax: $18.24 per car

If business needs $15 per person for admission:
- Net needed: $15 (business) + $1 (platform) = $16
- Price with tax: $18.24 per person

**Result:** Both are $18.24 - that's the problem!

---

### Scenario 2: Business Needs Less Per Car for Parking

Maybe parking doesn't need to be $15? Let's think...

**What if:**
- Admission: Business needs $15, Platform needs $1 = $16 net = $18.24
- Parking: Business needs $10, Platform needs $1 = $11 net = $12.30

**Result:**
- Admission: $18.24 (weird decimal)
- Parking: $12.30 (weird decimal)

Still weird decimals!

---

### Scenario 3: Round Numbers That Work

**What if we use round numbers and adjust business share?**

**Option A: $18 Admission + $12 Parking**
- Admission $18:
  - Net: $16.58
  - Business: $15.00 ✅
  - Platform: $1.58 ✅
  
- Parking $12:
  - Net: $11.05
  - Business: $10.00 (if that's acceptable)
  - Platform: $1.05 ✅

**But $18 is still not a round number...**

---

### Option B: $20 Admission + $10 Parking ✅

**What customer sees:**
```
SoCal Cup - General Admission    $20.00
SoCal Cup - Parking Pass        $10.00
──────────────────────────────────────
Total                            $30.00
```

**Revenue breakdown:**

**Admission ($20.00):**
- Base: $20.00 ÷ 1.08625 = $18.41
- Tax: $1.59
- Stripe fee: $18.41 × 0.029 + $0.30 = $0.83
- Net: $18.41 - $0.83 = **$17.58**
- Business: $15.00 ✅
- Platform: $2.58 ✅ (exceeds $1.00!)

**Parking ($10.00):**
- Base: $10.00 ÷ 1.08625 = $9.21
- Tax: $0.79
- Stripe fee: $9.21 × 0.029 + $0.30 = $0.57
- Net: $9.21 - $0.57 = **$8.64**
- Business: $7.64 (if acceptable)
- Platform: $1.00 ✅ (exactly $1.00!)

**Pros:**
- ✅ Round numbers ($20, $10, $30)
- ✅ Clear separation
- ✅ Makes sense: Admission is main cost, parking is add-on
- ✅ Platform gets $2.58 per person + $1.00 per car
- ✅ Business gets $15.00 per person

**Cons:**
- Business only gets $7.64 per car (not $15.00)

---

### Option C: $20 Admission + $15 Parking

**What customer sees:**
```
SoCal Cup - General Admission    $20.00
SoCal Cup - Parking Pass        $15.00
──────────────────────────────────────
Total                            $35.00
```

**Revenue breakdown:**

**Admission ($20.00):**
- Net: $17.58
- Business: $15.00 ✅
- Platform: $2.58 ✅

**Parking ($15.00):**
- Base: $15.00 ÷ 1.08625 = $13.81
- Tax: $1.19
- Stripe fee: $13.81 × 0.029 + $0.30 = $0.70
- Net: $13.81 - $0.70 = **$13.11**
- Business: $12.11 (close to $15.00)
- Platform: $1.00 ✅

**Total:**
- Business: $15.00 (admission) + $12.11 (parking) = $27.11
- Platform: $2.58 (admission) + $1.00 (parking) = $3.58

**Pros:**
- ✅ Round numbers ($20, $15, $35)
- ✅ Clear separation
- ✅ Platform gets $1.00 per car + $2.58 per person
- ✅ Business gets $15.00 per person + $12.11 per car

**Cons:**
- Business gets $12.11 per car (not exactly $15.00)

---

## The Key Question

**Does the business need exactly $15 per car for parking?**

If YES:
- Parking must be $18.24 (weird decimal)
- Admission must be $18.24 (weird decimal)
- Both same price = confusing

If NO (business can accept less per car):
- We can use round numbers
- $20 admission + $10 or $15 parking
- Makes more sense to parents

---

## My Recommendation

**Use $20 Admission + $15 Parking**

**Why:**
1. ✅ Round numbers ($20, $15, $35)
2. ✅ Clear separation (admission is main cost)
3. ✅ Makes logical sense to parents
4. ✅ Platform gets $1.00 per car + $2.58 per person
5. ✅ Business gets $15.00 per person + $12.11 per car

**What customer sees:**
```
SoCal Cup - General Admission    $20.00
SoCal Cup - Parking Pass        $15.00
──────────────────────────────────────
Total                            $35.00
```

**Explanation to parents:**
- "Admission is $20 per person"
- "Parking is $15 per car (you can carpool!)"
- "Total depends on how many people and cars"

**This makes sense!** 🎯

---

## Alternative: If Business MUST Get $15 Per Car

Then you're stuck with:
- Admission: $18.24
- Parking: $18.24

**But you can explain it:**
- "All-in pricing: $18.24 includes admission and parking"
- "One price covers everything"
- "No hidden fees"

**But this is still weird because they're separate purchases...**

---

## What Do You Think?

**Does the business need exactly $15 per car for parking?**

If YES → We're stuck with $18.24 for both (weird but explainable)
If NO → Use $20 admission + $15 parking (makes more sense)

Let me know! 🚀

