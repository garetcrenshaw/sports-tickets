# 🔥 FIX WEBHOOK - COMPLETE END-TO-END GUIDE

## ✅ YOUR CURRENT STATUS:
- ✅ Function server is running (port 3001)
- ✅ Vite frontend is running (port 3000)
- ✅ Proxy is working correctly
- ✅ Supabase schema is correct
- ✅ Webhook code is working (Jenny Rosen test proved this!)

## ❌ THE PROBLEM:
Your Stripe CLI is NOT catching webhook events from real checkout completions. This is why:
- `stripe trigger` works → Stripe CLI manually injects events
- Real checkout completions don't work → Stripe CLI isn't forwarding live events

---

## 🎯 THE SOLUTION (DO THIS NOW):

### Step 1: Stop Everything Clean

In your **Stripe CLI terminal** (Terminal 3), press `Ctrl+C`

### Step 2: Restart Stripe CLI with Correct Setup

Run this EXACT command:

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

**WAIT** for this message:
```
> Ready! You are using Stripe API Version [2025-XX-XX]. Your webhook signing secret is whsec_938eab... (^C to quit)
```

### Step 3: Verify the Secret Matches

The `whsec_...` value shown should match what's in your `.env.local` file:
```
STRIPE_WEBHOOK_SECRET=whsec_938eab87d4b6d6a06a5156e515d2fbc9d77a82db4dd5f354486dc52f5d7a0835
```

✅ If it matches → Perfect, continue!
❌ If it's different → Update `.env.local` and restart function server

---

## 🧪 COMPLETE END-TO-END TEST (FOLLOW EXACTLY):

### Step 1: Open Fresh Browser Window

Go to: **http://localhost:3000**

❗ **IMPORTANT:** Don't reuse old checkout links! Always start from the home page.

### Step 2: Fill Out Form

- **Name:** `Garet E2E Test`
- **Email:** `garetcrenshaw@gmail.com`
- **Admission Tickets:** `2`
- **Parking Passes:** `1`

### Step 3: Click "Buy Tickets"

You'll be redirected to Stripe's checkout page.

### Step 4: Complete Payment on Stripe

- **Card Number:** `4242 4242 4242 4242`
- **Expiry:** `12/34`
- **CVC:** `123`
- **ZIP:** `12345`
- **CLICK THE "PAY" BUTTON** ← THIS IS CRITICAL!

### Step 5: Watch ALL 3 Terminals Simultaneously

**Terminal 1 (Stripe CLI)** should show:
```
2025-11-24 XX:XX:XX   --> product.created [evt_xxx]
2025-11-24 XX:XX:XX  <--  [200] POST http://localhost:3000/api/webhook [evt_xxx]
2025-11-24 XX:XX:XX   --> price.created [evt_xxx]
2025-11-24 XX:XX:XX  <--  [200] POST http://localhost:3000/api/webhook [evt_xxx]
2025-11-24 XX:XX:XX   --> checkout.session.completed [evt_xxx]
2025-11-24 XX:XX:XX  <--  [200] POST http://localhost:3000/api/webhook [evt_xxx]
```

**Terminal 2 (Function Server)** should show:
```
🔥 WEBHOOK RECEIVED ===================================
Method: POST
✅ Webhook secret loaded: whsec_938eab8...
✅ Webhook verified! Event type: checkout.session.completed
🎫 Processing checkout.session.completed...
Session ID: cs_test_xxxxx
Customer email: garetcrenshaw@gmail.com
Metadata: {
  "eventId": "1",
  "admissionQuantity": "2",
  "parkingQuantity": "1",
  "buyerName": "Garet E2E Test",
  "buyerEmail": "garetcrenshaw@gmail.com"
}
📦 handleCheckoutSession START
Parsed quantities: { admissionQty: 2, parkingQty: 1 }
🎫 Building 2 ticket rows...
✅ Built 2 ticket rows
🅿️  Building 1 parking rows...
✅ Built 1 parking rows
💾 Inserting into Supabase...
✅ Created 2 tickets in Supabase
✅ Created 1 parking passes in Supabase
📧 Sending email to garetcrenshaw@gmail.com...
✅ Email sent successfully!
✅ ✅ ✅ WEBHOOK PROCESSING COMPLETE! ✅ ✅ ✅
```

**Terminal 3 (Browser)** should show:
- Redirect to success page: `http://localhost:3000/success?session_id=cs_test_xxxxx`
- Success message displayed

### Step 6: Verify Results

1. **Check your email** (garetcrenshaw@gmail.com)
   - Subject: "Your 2 Tickets + 1 Parking Pass"
   - Should have 2 ticket QR codes (green)
   - Should have 1 parking QR code (orange)

2. **Check Supabase**
   - `tickets` table: 2 new rows for garetcrenshaw@gmail.com
   - `parking_passes` table: 1 new row for garetcrenshaw@gmail.com

---

## 🚨 IF STRIPE CLI SHOWS NOTHING:

This means the Stripe CLI lost connection or timed out. Here's how to fix:

### Option 1: Restart Stripe CLI

```bash
# Press Ctrl+C in Stripe CLI terminal
# Then run:
stripe listen --forward-to localhost:3000/api/webhook

# Make a NEW test purchase (don't reuse old checkout links)
```

### Option 2: Check Stripe CLI Connection

```bash
# In a new terminal:
stripe status

# Should show:
# ✔ You're connected to Stripe as [your account]
```

### Option 3: Re-authenticate Stripe CLI

```bash
stripe login
# Follow prompts in browser
# Then restart: stripe listen --forward-to localhost:3000/api/webhook
```

---

## 🔍 COMMON MISTAKES TO AVOID:

1. ❌ **Reusing old checkout links**
   - Stripe only sends webhook once per session
   - Always start fresh from http://localhost:3000

2. ❌ **Not clicking "Pay" button**
   - Just filling out the form doesn't complete checkout
   - You MUST click the Pay button!

3. ❌ **Stripe CLI disconnected**
   - Check if CLI is still showing "Ready!"
   - If you see "Connection lost", restart it

4. ❌ **Wrong endpoint in Stripe CLI**
   - Should be: `localhost:3000/api/webhook`
   - NOT: `localhost:3000/api/stripe-webhook`
   - NOT: `localhost:3001/api/webhook`

---

## ✅ SUCCESS CHECKLIST:

When everything works, you'll see:

- [ ] Stripe CLI shows `checkout.session.completed` event
- [ ] Stripe CLI shows `<--  [200]` response code
- [ ] Function server logs show "WEBHOOK PROCESSING COMPLETE"
- [ ] Browser redirects to success page
- [ ] Email arrives with QR codes (check spam!)
- [ ] Supabase has new ticket rows
- [ ] Supabase has new parking pass rows

---

## 📞 NEXT STEP:

**Run the diagnostic:**
```bash
node test-webhook-setup.js
```

**Then make a fresh test purchase following the steps above!**

When you complete payment and see all the logs, **COME BACK AND TELL ME WHAT YOU SEE!** 🚀

