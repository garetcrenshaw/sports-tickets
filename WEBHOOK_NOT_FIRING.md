# 🚨 WEBHOOK NOT FIRING - DIAGNOSIS

## What's Happening

Your Terminal 2 (function server) shows:
- ✅ Checkout session created successfully
- ✅ Stripe Checkout URL generated
- ❌ **NO webhook activity at all**
- ❌ **NO "POST /api/stripe-webhook"**
- ❌ **NO "WEBHOOK MODULE LOADING"**

This means: **The webhook event is NOT reaching your server.**

---

## 🔍 Root Cause

The webhook only fires **AFTER** you complete the payment. There are two scenarios:

### Scenario 1: You didn't complete the payment
- You clicked "Buy Tickets"
- You were redirected to Stripe Checkout
- **BUT** you didn't click the "Pay" button
- **OR** you closed the checkout page

**Solution:** Complete the full payment flow.

### Scenario 2: Stripe CLI is not working
- Terminal 3 stopped running
- Terminal 3 crashed
- Terminal 3 is forwarding to wrong URL

**Solution:** Verify Terminal 3 is running and showing "Ready!"

---

## ✅ HOW TO FIX THIS

### Step 1: Verify Terminal 3 is running

In Terminal 3, you should see:
```
> Ready! You are using Stripe API Version [2025-09-30.clover]. 
  Your webhook signing secret is whsec_938eab87d4b6d6a06a5156e515d2fbc9d77a82db4dd5f354486dc52f5d7a0835 
  (^C to quit)
```

If you DON'T see this:
```bash
# Start it again:
stripe listen --forward-to http://localhost:3001/.netlify/functions/stripe-webhook
```

---

### Step 2: Complete the FULL payment flow

Don't just create the checkout - you need to FINISH the payment:

1. **Go to:** http://localhost:3000
2. **Fill in:**
   - Name: Garet
   - Email: garetcrenshaw@gmail.com
   - Quantity: 4
3. **Click:** "Buy Tickets" button
4. **You'll be redirected to Stripe Checkout page**
5. **Fill in test card:**
   ```
   Card number: 4242 4242 4242 4242
   Expiry: 12/26
   CVC: 123
   Name: Test User
   ZIP: 12345
   ```
6. **Click the "Pay" button** ← **THIS IS CRITICAL!**
7. **Wait** for redirect to /success page

**The webhook only fires AFTER step 6 (clicking Pay)!**

---

### Step 3: Watch Terminal 3 DURING payment

The **instant** you click "Pay" in step 6, Terminal 3 should show:

```
2025-XX-XX XX:XX:XX   --> checkout.session.completed [evt_1234567890]
2025-XX-XX XX:XX:XX  <--  [200] POST localhost:3000/api/stripe-webhook [evt_1234567890]
```

If you see this, then Terminal 2 will immediately show:
```
POST /api/stripe-webhook
🔥 WEBHOOK MODULE LOADING...
🚨 WEBHOOK HANDLER CALLED!
[... 40+ lines of logs ...]
✅ TICKET 1 OF 4 COMPLETE!
✅ TICKET 2 OF 4 COMPLETE!
✅ TICKET 3 OF 4 COMPLETE!
✅ TICKET 4 OF 4 COMPLETE!
✅ EMAIL SENT SUCCESSFULLY!
🎉 WEBHOOK PROCESSING COMPLETE!
```

---

## 🧪 COMPLETE TEST CHECKLIST

- [ ] Terminal 1: `npm run dev` (Vite on 3000) - RUNNING
- [ ] Terminal 2: `npm run dev:functions` (Functions on 3001) - RUNNING
- [ ] Terminal 3: `stripe listen --forward-to http://localhost:3001/.netlify/functions/stripe-webhook` - RUNNING
- [ ] Terminal 3 shows: "Ready! Your webhook signing secret is whsec_..."
- [ ] Go to http://localhost:3000
- [ ] Click "Buy Tickets"
- [ ] **Fill in card 4242 4242 4242 4242**
- [ ] **Click "Pay" button**
- [ ] **Watch Terminal 3** - should show "checkout.session.completed"
- [ ] **Watch Terminal 2** - should explode with logs
- [ ] Check email: garetcrenshaw@gmail.com
- [ ] Check Supabase: 4 rows in tickets table
- [ ] Check Supabase Storage: 4 PNG files in qrcodes bucket

---

## 🚨 COMMON MISTAKE

**Creating the checkout ≠ Completing payment**

Your logs show checkout sessions being created, but that's just step 1.

The webhook fires at step 2: **when payment is completed**.

You MUST:
1. Click "Buy Tickets" ✅ (you did this)
2. Fill in test card ❓ (did you do this?)
3. Click "Pay" button ❓ (did you do this?)
4. Wait for success page ❓ (did you do this?)

If you only did step 1, the webhook will NEVER fire.

---

## 📋 NEXT STEP

**Tell me:**
1. Is Terminal 3 showing "Ready!"?
2. Did you complete the FULL payment (clicked "Pay")?
3. What does Terminal 3 show after you click "Pay"?

Copy and paste the Terminal 3 output here so I can see what's happening.

