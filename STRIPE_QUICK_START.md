# ⚡ Stripe Quick Start - 5 Minutes

## ✅ What's Already Done
- All 16 SoCal Cup events are set to **$17** in the code
- Frontend shows all-in pricing
- Webhook ready to process payments

## 🎯 What You Need to Do

### 1️⃣ Create Products in Stripe (2 minutes)

**Go to**: https://dashboard.stripe.com/products

**Product 1:**
```
Name: SoCal Cup - General Admission
Price: $17.00
Type: One-time
```
→ Copy Price ID: `price_1...`

**Product 2:**
```
Name: SoCal Cup - Parking Pass
Price: $17.00
Type: One-time
```
→ Copy Price ID: `price_1...`

### 2️⃣ Update Supabase (1 minute)

**Go to**: https://supabase.com/dashboard → SQL Editor

**Paste this** (replace with your Price IDs):
```sql
UPDATE events 
SET 
  admission_price = 17.00,
  parking_price = 17.00,
  stripe_admission_price_id = 'price_YOUR_ADMISSION_ID',
  stripe_parking_price_id = 'price_YOUR_PARKING_ID'
WHERE event_name LIKE '%SoCal Cup%';
```

**Click**: Run ✅

### 3️⃣ Verify (30 seconds)

Run this to check:
```sql
SELECT event_name, admission_price, stripe_admission_price_id 
FROM events 
WHERE event_name LIKE '%SoCal Cup%' 
LIMIT 3;
```

Should show:
- `admission_price`: `17.00`
- `stripe_admission_price_id`: `price_1...`

---

## 🎉 Done!

**Next**: Test a purchase with card `4242 4242 4242 4242`

---

## 📋 Full Walkthrough

See `STRIPE_SETUP_WALKTHROUGH.md` for detailed screenshots and troubleshooting.

