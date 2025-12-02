# 🚀 START ALL THREE REQUIRED SERVERS

You need **THREE terminals running at the same time** for the webhook to work.

## Terminal 1: Vite Frontend (Port 3000)

```bash
cd /Users/garetcrenshaw/Desktop/sports-tickets
npm run dev
```

**Keep this running. You should see:**
```
VITE v5.4.21 ready in 240 ms
➜  Local:   http://localhost:3000/
```

---

## Terminal 2: Function Server (Port 3001)

```bash
cd /Users/garetcrenshaw/Desktop/sports-tickets
node dev-server.cjs
```

**Keep this running. You should see:**
```
🚀 Function server running on http://localhost:3001
📡 Ready to serve functions at /api/*
🔥 WEBHOOK MODULE LOADING...
🔥 STEP 1: Modules imported
🔥 STEP 2: Checking environment variables...
  STRIPE_SECRET_KEY: EXISTS ✅
  STRIPE_WEBHOOK_SECRET: EXISTS ✅
  SUPABASE_URL: EXISTS ✅
  SUPABASE_SERVICE_ROLE_KEY: EXISTS ✅
  RESEND_API_KEY: EXISTS ✅
🔥 STEP 3: Creating Supabase client...
🔥 STEP 4: Supabase client created ✅
🔥 STEP 5: Creating Resend client...
🔥 STEP 6: Resend client created ✅
🔥 WEBHOOK MODULE LOADED SUCCESSFULLY ✅
```

---

## Terminal 3: Stripe CLI Webhook Forwarding ⚠️ THIS IS MISSING!

```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

**Keep this running. You should see:**
```
Ready! You are using Stripe API Version [2024-XX-XX]. Your webhook signing secret is whsec_xxxxx (^C to quit)
```

**CRITICAL:** When you see the `whsec_xxxxx` secret, you need to:

1. Copy that `whsec_xxxxx` value
2. Add it to your `.env` file:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```
3. **RESTART Terminal 2** (the function server) so it picks up the new .env value

---

## ✅ HOW TO VERIFY ALL 3 ARE RUNNING:

Open a 4th terminal and run:
```bash
# Check Vite
curl http://localhost:3000

# Check Function Server
curl http://localhost:3001/api/create-checkout

# Check Stripe CLI
# (should show "Ready!" in terminal 3)
```

---

## 🧪 THEN TEST:

1. Go to http://localhost:3000
2. Enter your email: `garetcrenshaw@gmail.com`
3. Enter name: `Garet`
4. Select quantity: 3
5. Click "Buy Tickets"
6. Use test card: `4242 4242 4242 4242`
7. Complete payment

**Watch Terminal 2 and Terminal 3:**

- **Terminal 3** will show: `checkout.session.completed [evt_xxx] Succeeded`
- **Terminal 2** will EXPLODE with logs showing every step

---

## 🚨 COMMON MISTAKES:

1. **Not running Terminal 3 at all** ← THIS IS YOUR CURRENT PROBLEM
2. Running Stripe CLI but wrong port (should be 3001, not 3000)
3. Not copying webhook secret to .env
4. Not restarting function server after updating .env

---

## 🔍 IF STRIPE CLI IS NOT INSTALLED:

Install it first:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Then login
stripe login
```

---

## 📋 QUICK START CHECKLIST:

- [ ] Terminal 1: `npm run dev` (Vite on 3000)
- [ ] Terminal 2: `node dev-server.cjs` (Functions on 3001)
- [ ] Terminal 3: `stripe listen --forward-to localhost:3000/api/stripe-webhook`
- [ ] Copy `whsec_xxx` from Terminal 3 to `.env` as `STRIPE_WEBHOOK_SECRET=whsec_xxx`
- [ ] Restart Terminal 2 (CTRL+C, then `npm run dev:functions` again)
- [ ] Verify Terminal 2 shows "WEBHOOK MODULE LOADED SUCCESSFULLY ✅"
- [ ] Make a test purchase
- [ ] Watch the explosion of logs in Terminal 2

