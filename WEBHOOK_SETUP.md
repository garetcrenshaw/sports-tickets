# 🔗 Stripe Webhook Setup Guide

## 📋 Prerequisites

Before setting up the webhook, you need:
- ✅ Stripe account (test mode)
- ✅ Supabase project
- ✅ Resend account

---

## 1️⃣ Create Supabase Table

### **SQL to Run in Supabase SQL Editor:**

```sql
-- Create tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT UNIQUE NOT NULL,
  event_id INTEGER NOT NULL,
  ticket_type TEXT NOT NULL,
  purchaser_name TEXT NOT NULL,
  purchaser_email TEXT NOT NULL,
  qr_code_url TEXT NOT NULL,
  status TEXT DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'cancelled')),
  stripe_session_id TEXT,
  price_cents INTEGER,
  scanned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on ticket_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_id ON public.tickets(ticket_id);

-- Create index on email for customer lookups
CREATE INDEX IF NOT EXISTS idx_tickets_email ON public.tickets(purchaser_email);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to do everything
CREATE POLICY "Service role has full access" ON public.tickets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Users can read their own tickets (for future customer portal)
CREATE POLICY "Users can view their own tickets" ON public.tickets
  FOR SELECT
  TO authenticated
  USING (purchaser_email = auth.jwt()->>'email');
```

---

## 2️⃣ Create Supabase Storage Bucket

### **In Supabase Dashboard:**

1. Go to **Storage** → Click **New bucket**
2. **Name:** `qrcodes`
3. **Public bucket:** ✅ **YES** (check this box)
4. Click **Create bucket**

### **Set Bucket Policies:**

Go to **Storage** → **qrcodes** → **Policies** → Click **New policy**

```sql
-- Policy: Allow public read access to QR codes
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'qrcodes' );

-- Policy: Allow service role to upload QR codes
CREATE POLICY "Service role can upload"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK ( bucket_id = 'qrcodes' );
```

---

## 3️⃣ Get Your API Keys

### **Stripe:**
1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy **Secret key** (starts with `sk_test_`)
3. We'll get the webhook secret in the next step

### **Supabase:**
1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
2. Copy **Project URL** (e.g., `https://abc123.supabase.co`)
3. Copy **anon public** key (starts with `eyJ...`)
4. Copy **service_role** key (starts with `eyJ...`) - ⚠️ **Keep this secret!**

### **Resend:**
1. Go to: https://resend.com/api-keys
2. Create new API key
3. Copy the key (starts with `re_`)

---

## 4️⃣ Update Your .env File

Add these to `/Users/garetcrenshaw/Desktop/sports-tickets/.env`:

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_51SNPmWRzFa5vaG1DqEMGZ6XaFvJRGJt6cL1J8GYFiNyHQlvehjAsWtkWXUCjL3s1gTfc01IlmuUyFzPYLF8QlTy500kOSBuhwf
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Supabase Keys
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_public_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Resend Key
RESEND_API_KEY=re_your_resend_key_here

# Other
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
GA_PRICE_ID=price_1STzm4RzFa5vaG1DBe0qzBRZ
VALIDATE_PASSWORD=staff123
SITE_URL=http://localhost:5173
```

---

## 5️⃣ Set Up Stripe Webhook (Local Testing)

### **Option A: Using Stripe CLI (Recommended for Local)**

1. **Install Stripe CLI:**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Or download from: https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe:**
   ```bash
   stripe login
   ```

3. **Forward webhooks to your local server:**
   ```bash
   stripe listen --forward-to http://localhost:3001/.netlify/functions/stripe-webhook
   ```

4. **Copy the webhook signing secret:**
   - The CLI will output: `Ready! Your webhook signing secret is whsec_...`
   - Copy this to your `.env` as `STRIPE_WEBHOOK_SECRET`

5. **Trigger a test event:**
   ```bash
   stripe trigger checkout.session.completed
   ```

### **Option B: Using ngrok (Alternative)**

1. **Install ngrok:**
   ```bash
   brew install ngrok
   ```

2. **Start ngrok:**
   ```bash
   ngrok http 3001
   ```

3. **Copy the https URL** (e.g., `https://abc123.ngrok.io`)

4. **Add webhook in Stripe Dashboard:**
   - Go to: https://dashboard.stripe.com/test/webhooks
   - Click **Add endpoint**
   - **Endpoint URL:** `https://abc123.ngrok.io/.netlify/functions/stripe-webhook`
   - **Events to send:** Select `checkout.session.completed`
   - Click **Add endpoint**

5. **Copy the signing secret:**
   - Click on your webhook
   - Click **Reveal** under "Signing secret"
   - Copy to `.env` as `STRIPE_WEBHOOK_SECRET`

---

## 6️⃣ Set Up Stripe Webhook (Production)

### **After Deploying to Netlify:**

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click **Add endpoint**
3. **Endpoint URL:** `https://your-site.netlify.app/.netlify/functions/stripe-webhook`
4. **Events to send:** `checkout.session.completed`
5. Click **Add endpoint**
6. **Copy the signing secret** → Add to Netlify Environment Variables

### **Add to Netlify Environment Variables:**

1. Go to your Netlify site → **Site settings** → **Environment variables**
2. Add:
   - `STRIPE_WEBHOOK_SECRET` = `whsec_...`
   - `SUPABASE_URL` = `https://...`
   - `SUPABASE_SERVICE_ROLE_KEY` = `eyJ...`
   - `RESEND_API_KEY` = `re_...`

---

## 7️⃣ Test the Complete Flow

### **Start Your Servers:**

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Functions
npm run dev:functions

# Terminal 3: Stripe CLI (if using local webhooks)
stripe listen --forward-to http://localhost:3001/.netlify/functions/stripe-webhook
```

### **Make a Test Purchase:**

1. Open: http://localhost:5173
2. Fill form with your email
3. Click "Pay $15.00"
4. Use test card: `4242 4242 4242 4242`
5. Complete payment

### **Check Results:**

1. **Stripe Dashboard:**
   - Go to: https://dashboard.stripe.com/test/payments
   - Should see successful payment

2. **Webhook Logs:**
   - Go to: https://dashboard.stripe.com/test/webhooks
   - Click your webhook
   - Check **Recent deliveries**
   - Should show `checkout.session.completed` with 200 response

3. **Supabase Database:**
   - Go to: Supabase → **Table Editor** → `tickets`
   - Should see new rows (one per ticket quantity)

4. **Supabase Storage:**
   - Go to: Supabase → **Storage** → `qrcodes`
   - Should see PNG files (one per ticket)

5. **Your Email:**
   - Check inbox for email with QR codes
   - Should have nice HTML layout with all tickets

6. **Function Server Logs:**
   ```
   POST /.netlify/functions/stripe-webhook
   === STRIPE WEBHOOK RECEIVED ===
   ✅ Webhook signature verified
   💳 Checkout session completed: cs_test_...
   🎫 Creating 1 tickets for Test User (test@example.com)
   📝 Creating ticket 1/1: abc-123-def-456
   ✅ QR code uploaded: abc-123-def-456.png
   ✅ Ticket 1 saved to database
   ✅ All 1 tickets created successfully
   📧 Sending email to test@example.com with 1 QR codes
   ✅ Email sent via Resend
   ✅ Email sent successfully
   ```

---

## 🧪 Testing Multiple Tickets

### **Test with Quantity:**

1. Change quantity to 3
2. Purchase
3. Check Supabase → should see 3 rows
4. Check Storage → should see 3 PNG files
5. Check email → should have 3 QR codes in one email

---

## 🚨 Troubleshooting

### **Webhook not receiving events:**

- ✅ Check webhook URL is correct
- ✅ Verify function server is running
- ✅ Check Stripe CLI is forwarding
- ✅ Look at Stripe Dashboard → Webhooks → Recent deliveries

### **Signature verification fails:**

- ✅ Check `STRIPE_WEBHOOK_SECRET` in `.env`
- ✅ Restart function server after updating `.env`
- ✅ Make sure you're using the correct secret (local vs production)

### **Database insert fails:**

- ✅ Check table exists in Supabase
- ✅ Verify column names match
- ✅ Check `SUPABASE_SERVICE_ROLE_KEY` is set
- ✅ Ensure RLS policies allow service role

### **QR upload fails:**

- ✅ Check bucket 'qrcodes' exists
- ✅ Verify bucket is public
- ✅ Check storage policies allow upload

### **Email not sent:**

- ✅ Verify `RESEND_API_KEY` is valid
- ✅ Check Resend dashboard for logs
- ✅ Look for email in spam folder

---

## ✅ Success Checklist

- [ ] Supabase table `tickets` created
- [ ] Supabase storage bucket `qrcodes` created and public
- [ ] All environment variables added to `.env`
- [ ] Stripe webhook endpoint added
- [ ] Webhook secret copied to `.env`
- [ ] Function server restarted
- [ ] Test purchase completed
- [ ] Tickets appear in Supabase
- [ ] QR codes uploaded to Storage
- [ ] Email received with QR codes

---

## 🎉 You're Done!

Your ticket system now:
- ✅ Accepts payments via Stripe
- ✅ Generates unique QR codes per ticket
- ✅ Stores everything in Supabase
- ✅ Sends beautiful emails with all tickets
- ✅ Is production-ready!

**Next:** Deploy to Netlify and update webhook URL to production!

