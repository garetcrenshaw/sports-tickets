# 🔔 Stripe Webhook Setup Instructions

## ⚠️ CRITICAL: Complete These Steps for Tickets to Work

The webhook is what creates tickets and sends emails after payment. Without it, customers will pay but receive nothing.

---

## 📋 Prerequisites

Make sure you have these in your `.env` file:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_your_secret_here  ✅ (you already have this)
STRIPE_WEBHOOK_SECRET=whsec_...       ❌ (get from step 4 below)

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...  (service role, not anon)

# Resend
RESEND_API_KEY=re_...
```

---

## 🎯 Step 1: Set Up Supabase Database

### **A. Create the `tickets` table:**

Go to Supabase SQL Editor and run:

```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT UNIQUE NOT NULL,
  event_id TEXT NOT NULL,
  ticket_type TEXT NOT NULL,
  purchaser_name TEXT NOT NULL,
  purchaser_email TEXT NOT NULL,
  qr_code_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'valid',
  stripe_session_id TEXT,
  price_paid_cents INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  validated_by TEXT
);

-- Create index for faster lookups
CREATE INDEX idx_tickets_ticket_id ON tickets(ticket_id);
CREATE INDEX idx_tickets_email ON tickets(purchaser_email);
CREATE INDEX idx_tickets_status ON tickets(status);
```

### **B. Create the `qrcodes` storage bucket:**

1. Go to **Storage** in Supabase dashboard
2. Click **New bucket**
3. Name: `qrcodes`
4. **✅ Make it PUBLIC** (so QR codes can be displayed in emails)
5. Click **Create bucket**

### **C. Set bucket policy (make QR codes public):**

```sql
-- Allow public read access to qrcodes bucket
CREATE POLICY "Public QR codes are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'qrcodes');

-- Allow service role to upload
CREATE POLICY "Service role can upload QR codes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'qrcodes' AND auth.role() = 'service_role');
```

---

## 🌐 Step 2: Set Up Resend for Emails

### **A. Sign up for Resend:**
1. Go to https://resend.com
2. Sign up (free tier = 100 emails/day, 3,000/month)
3. Verify your email

### **B. Get API Key:**
1. Go to **API Keys** in dashboard
2. Click **Create API Key**
3. Name: "Sports Tickets Webhook"
4. Copy the key (starts with `re_...`)
5. Add to `.env`:
   ```
   RESEND_API_KEY=re_your_key_here
   ```

### **C. (Optional) Add verified domain:**
For production, verify your domain to send from `tickets@yourdomain.com` instead of `onboarding@resend.dev`.

---

## 🪝 Step 3: Test Webhook Locally with Stripe CLI

### **A. Install Stripe CLI:**
```bash
# Mac
brew install stripe/stripe-cli/stripe

# Or download from: https://stripe.com/docs/stripe-cli
```

### **B. Login to Stripe:**
```bash
stripe login
```

### **C. Forward webhooks to your local function:**
```bash
# Make sure your function server is running first:
npm run dev:functions

# Then in another terminal:
stripe listen --forward-to http://localhost:3001/.netlify/functions/stripe-webhook
```

**You'll see:**
```
> Ready! Your webhook signing secret is whsec_abc123def456... (^C to quit)
```

### **D. Copy the webhook secret:**
```bash
# Add to your .env file:
STRIPE_WEBHOOK_SECRET=whsec_abc123def456...
```

### **E. Restart your function server:**
```bash
# Terminal with npm run dev:functions
# Press Ctrl+C, then:
npm run dev:functions
```

---

## 🧪 Step 4: Test the Complete Flow

### **A. Make a test purchase:**

1. Open: http://localhost:3000
2. Fill form:
   - Name: Test User
   - Email: your-real-email@gmail.com (use real email to receive!)
   - Quantity: 2
3. Click "Pay $30.00"
4. Use test card: 4242 4242 4242 4242
5. Complete payment

### **B. Watch the webhook logs:**

**Terminal with Stripe CLI:**
```
<-- [200] POST http://localhost:3001/.netlify/functions/stripe-webhook [evt_abc123]
```

**Terminal with function server:**
```
=== STRIPE WEBHOOK RECEIVED ===
✅ Webhook signature verified
💳 Processing checkout.session.completed
Creating 2 tickets for Test User (your-email@gmail.com)
Creating ticket 1/2...
✅ Ticket 1/2 created: 123e4567-e89b-12d3-a456-426614174000
Creating ticket 2/2...
✅ Ticket 2/2 created: 789e4567-e89b-12d3-a456-426614174999
✅ All 2 tickets created successfully
📧 Sending email with all QR codes...
✅ Email sent successfully
```

### **C. Check your email:**
You should receive an email with:
- 2 QR codes (one per ticket)
- Ticket IDs
- Instructions

### **D. Verify in Supabase:**
```sql
SELECT * FROM tickets ORDER BY created_at DESC LIMIT 10;
```

You should see 2 rows with unique `ticket_id` and `qr_code_url` values.

---

## 🚀 Step 5: Deploy Webhook to Production

### **A. Add webhook endpoint in Stripe Dashboard:**

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click **Add endpoint**
3. **Endpoint URL:** `https://your-netlify-site.netlify.app/.netlify/functions/stripe-webhook`
4. **Events to send:** Select `checkout.session.completed`
5. Click **Add endpoint**

### **B. Get the signing secret:**
1. Click on your newly created webhook
2. Click **Reveal** under "Signing secret"
3. Copy the secret (starts with `whsec_...`)

### **C. Add to Netlify environment variables:**
1. Go to Netlify dashboard → Your site → **Site settings** → **Environment variables**
2. Add `STRIPE_WEBHOOK_SECRET` with the production value
3. Click **Save**

### **D. Redeploy:**
```bash
git push
```

Netlify will auto-deploy with the new webhook secret.

---

## 🎯 Verification Checklist

Before going live, verify:

- [ ] Supabase `tickets` table created with correct columns
- [ ] Supabase `qrcodes` bucket created and PUBLIC
- [ ] `.env` has all required keys (Stripe, Supabase, Resend)
- [ ] Local webhook test succeeded (received email with QR codes)
- [ ] Stripe CLI forwarding worked without errors
- [ ] Database shows ticket rows after test purchase
- [ ] QR code images are accessible via public URLs
- [ ] Email contains all QR codes for multi-ticket purchases
- [ ] Production webhook added in Stripe dashboard
- [ ] Production webhook secret added to Netlify env vars

---

## 🔍 Troubleshooting

### **"Webhook signature verification failed"**
→ Wrong `STRIPE_WEBHOOK_SECRET`. Get the correct one from Stripe CLI or dashboard.

### **"Supabase upload error"**
→ Check that `qrcodes` bucket exists and is PUBLIC.

### **"Database insert error"**
→ Check `SUPABASE_SERVICE_ROLE_KEY` (not anon key) and table exists.

### **"Resend email error"**
→ Check `RESEND_API_KEY` is correct and account has available sends.

### **No email received**
→ Check spam folder, verify Resend dashboard for delivery status.

### **Tickets created but no email**
→ Webhook processed successfully but email failed. Check function logs.

---

## 📊 How It Works

```
1. User completes payment on Stripe Checkout
   ↓
2. Stripe sends webhook to your function
   ↓
3. Function verifies webhook signature
   ↓
4. Extracts metadata (name, email, quantity)
   ↓
5. LOOP: For each ticket (1 to quantity):
   - Generate unique ticket ID (UUID)
   - Create QR code image
   - Upload QR to Supabase Storage
   - Insert ticket row in database
   ↓
6. Send ONE email with ALL QR codes
   ↓
7. User receives email with unique tickets
```

---

## 🎉 You're Done!

Once you complete these steps, your ticket system will:
- ✅ Generate unique QR codes for each ticket
- ✅ Store tickets in Supabase
- ✅ Email QR codes to customers
- ✅ Work identically in test and production

**Test it now with Stripe CLI!** 🚀
