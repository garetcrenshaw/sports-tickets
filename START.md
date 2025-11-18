# 🚀 How to Run Your Sports Ticket App

## ✅ Prerequisites

1. Make sure your `.env` file exists with all required keys:
   ```bash
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   GA_PRICE_ID=price_1STzm4RzFa5vaG1DBe0qzBRZ
   SUPABASE_URL=https://...
   SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   RESEND_API_KEY=...
   STRIPE_WEBHOOK_SECRET=whsec_...
   VALIDATE_PASSWORD=staff123
   SITE_URL=http://localhost:5173
   ```

## 🎯 Run Locally (2 Terminal Windows)

### Terminal 1: Start Frontend (Vite)
```bash
cd /Users/garetcrenshaw/Desktop/sports-tickets
npm run dev
```
**Expected output:**
```
VITE v5.4.21  ready in 240 ms
➜  Local:   http://localhost:5173/
```

### Terminal 2: Start Backend Functions
```bash
cd /Users/garetcrenshaw/Desktop/sports-tickets
npm run dev:functions
```
**Expected output:**
```
🚀 Function server running on http://localhost:3001
📡 Ready to serve functions at /.netlify/functions/*
```

## 🧪 Test Your App

1. **Open browser:** http://localhost:5173
2. **Fill the form:**
   - Name: Test User
   - Email: garetcrenshaw@gmail.com
   - Quantity: 1
3. **Click "Pay $15.00"**
4. **Use Stripe test card:**
   - Card: 4242 4242 4242 4242
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

## ✅ What Should Happen

1. **Console logs:**
   ```
   🛒 Calling /api/create-checkout with: {...}
   📡 Response status: 200
   ✅ Received session: { sessionId: "cs_test_..." }
   🔄 Redirecting to Stripe Checkout...
   ```

2. **Redirect to Stripe:**
   - You'll see Stripe's checkout page
   - Complete payment with test card
   - Redirect to /success page

3. **Email sent:**
   - QR code email to garetcrenshaw@gmail.com
   - Contains ticket details

## 🔧 Troubleshooting

### ❌ "Purchase failed" or 404 error

**Check:**
1. Both servers are running
2. Terminal 1 shows Vite on :5173
3. Terminal 2 shows functions on :3001
4. No errors in either terminal

### ❌ "Price ID not configured"

**Fix:**
```bash
# Make sure .env has:
GA_PRICE_ID=price_1STzm4RzFa5vaG1DBe0qzBRZ
```

### ❌ Function server crashes

**Check console output for:**
- Missing stripe package
- Missing environment variables
- Syntax errors

### ❌ Vite proxy not working

**Restart both servers:**
```bash
# Kill all running processes
Ctrl+C in both terminals

# Restart
npm run dev              # Terminal 1
npm run dev:functions    # Terminal 2
```

## 📊 Request Flow

```
Browser
  ↓
http://localhost:5173/api/create-checkout (POST)
  ↓
Vite Proxy (rewrites /api → /.netlify/functions)
  ↓
http://localhost:3001/.netlify/functions/create-checkout
  ↓
dev-server.js loads netlify/functions/create-checkout.js
  ↓
Creates Stripe Checkout Session
  ↓
Returns { sessionId: "cs_test_..." }
  ↓
Frontend redirects to Stripe
```

## 🎯 Ready to Deploy?

When everything works locally:

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "fix: working local setup"
   git push
   ```

2. **Netlify auto-deploys** from your repo

3. **Test production** at your Netlify URL

---

**Need help?** Check the console logs in both terminals for error messages.

