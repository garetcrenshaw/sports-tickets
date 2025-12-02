# Gameday Empire – Sports Ticketing Experience

## 🚨 REAL PRODUCTION DOMAIN (NEVER CHANGES)
**https://gamedaytickets.io**

All fulfillment, emails, QRs, and links use this URL.
Vercel is DEV ONLY.

We test everything on Vercel.
We launch on gamedaytickets.io.

---

## 🔧 Production Setup (gamedaytickets.io)

### Resend Email Domain
**REQUIRED for emails to work:**
1. Go to [Resend Dashboard](https://resend.com/domains)
2. Add domain: `gamedaytickets.io`
3. Verify DNS records

### Stripe Webhook
Set webhook endpoint to: `https://gamedaytickets.io/api/stripe-webhook`

### DNS Configuration
Point `gamedaytickets.io` → Vercel deployment (or Hostinger if preferred)

---

End-to-end ticketing flow inspired by Ticketmaster, SeatGeek, and every high-performing indie platform in 2025:

- Single event page with **one cart** for admission + parking.
- **Stripe Checkout** for ultra-fast conversion.
- **Supabase** stores both tickets and parking passes (each with unique QR codes).
- **Resend** delivers beautiful, adaptive emails (tickets only, parking only, or bundled).
- **Vercel Serverless Functions** handle all backend logic with bulletproof logging and schema fallbacks.

## ✨ Highlights

- Fans can mix **up to 10 Gameday Tickets**, **4 Gameday Parking** passes, and stack **Gameday All-Access bundles** (each bundle = 1 ticket + 1 parking).
- Live totals, bundle badge, and “Most fans add parking” cues lift AOV.
- Webhook auto-creates the `qrcodes` bucket, writes to both `tickets` and `parking_passes`, and emails a gorgeous bundle confirmation.
- Schema-cache fallback guarantees rows insert even when Supabase metadata lags.

---

## 🔧 Development Setup & Troubleshooting

### Permission Issues on macOS

If you see EPERM errors when starting dev servers:

```bash
# 1. Enable Full Disk Access for Terminal
System Settings → Privacy & Security → Full Disk Access → enable Terminal.app (or iTerm)

# 2. Restart terminal completely (quit and reopen)

# 3. Check for remaining issues
npm run diagnose

# 4. Fix any remaining problems
npm run predev

# 5. Start development
npm run dev
```

**The diagnostic tool checks:**
- ✅ Environment file access (.env, .env.local)
- ✅ Stripe CLI config directory (~/.config/stripe/)
- ✅ Vercel global installation
- ✅ Port binding (3000, 3001)

---

## 🔧 Troubleshooting

### ngrok Setup for Real Webhook Testing
```bash
# Install ngrok globally
npm install ngrok --global

# Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
ngrok authtoken YOUR_TOKEN_HERE

# Start tunnel to test real webhooks
npm run dev:ngrok
```

---

## 🏃 How to run locally (3 steps)

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp env-local-template.txt .env.local
# Then open .env.local and fill in your real API keys
```

### 3. Test Real Purchase
```bash
npm run dev
```

Then:
1. Open http://localhost:3000
2. Fill form (name, email, admission/parking quantities > 0)
3. Complete Stripe checkout (use 4242 card)
4. Check Tab 2 logs for webhook processing
5. Check email for QR codes
6. Check Supabase for database records

### 4. Test Real Webhooks with ngrok
For webhook events from real Stripe checkout:

**Setup ngrok:**
```bash
npm install ngrok --global
# Sign up at ngrok.com and get your authtoken
ngrok authtoken YOUR_TOKEN
npm run dev:ngrok
```

Copy the ngrok HTTPS URL (e.g., `https://abc123.ngrok.io`), then:

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://abc123.ngrok.io/api/stripe-webhook`
3. Select event: `checkout.session.completed`
4. Make real purchase at localhost:3000
5. Webhook fires automatically with real metadata
6. Check email/QR/Supabase for fulfillment

### Debug: No Email Issues
- Check Resend dashboard for delivery status
- Check webhook server logs for "EMAIL SENT TO:" messages
- Check spam/junk folders in email
- Verify buyerEmail is parsed correctly from metadata
- Check Supabase for qr_code_url fields on records
```

### 3. Start everything
```bash
npm run dev
```

This will automatically start:
- Vite dev server (port 3000)
- Function server (port 3001)
- Stripe webhook listener

**Note:** If you need Vercel's full proxy environment, use `npm run dev:full` instead, but `npm run dev` is recommended for most development work.

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Environment Variables Setup

⚠️ **SECURITY IMPORTANT:** Never commit secrets to git. Use `.env.local` for local development.

#### Local Development
1. Copy the template: `cp env-local-template.txt .env.local`
2. Fill in your actual API keys in `.env.local` (this file is gitignored)

#### Required Variables
```
# Public (can be in .env or .env.local)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
SITE_URL=http://localhost:3000

# Secret (MUST be in .env.local only)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service-role-key
RESEND_API_KEY=re_test_xxx
VALIDATE_PASSWORD=staff123
```

#### Production (Vercel)

**Vercel Dashboard Settings (REQUIRED):**

1. Go to Project Settings → General → Build & Development Settings
2. Set:
   - **Framework Preset:** "Vite"
   - **Build Command:** "vite build"
   - **Output Directory:** "dist"
   - **Install Command:** "npm install"

**Environment Variables:**
Set these environment variables in your Vercel dashboard (no .env files needed):
- All variables except `VITE_STRIPE_PUBLISHABLE_KEY` (use `STRIPE_PUBLISHABLE_KEY` in Vercel)

> ℹ️ Stripe CLI prints a fresh `whsec_...` every time you run `stripe listen`. Paste it into `.env.local` and restart the function server.

#### Resend Email Setup
**REQUIRED for emails to work:**
1. Go to [Resend Dashboard](https://resend.com/domains)
2. Click "Add Domain"
3. Enter: `sports-tickets.vercel.app`
4. Click "Add" and follow verification steps (may need to add TXT record to DNS)

### 3. Run everything (3 terminals)

```
# Terminal 1 – Vite frontend
npm run dev

# Terminal 2 – Vercel serverless functions
node dev-server.cjs

# Terminal 3 – Stripe webhook forwarding
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

Visit `http://localhost:3000` → click **Get Tickets + Parking**.

### 4. Pay with Stripe test card

```
4242 4242 4242 4242
Any future expiry
Any 3-digit CVC
```

Within seconds you’ll see:

- Terminal 3 logging `checkout.session.completed`.
- Terminal 2 exploding with logs (bucket creation, ticket/parking inserts, email).
- Inbox receives the adaptive email with QR codes.

---

## 🗄️ Supabase Schema

Run `SUPABASE_SETUP.sql` inside the Supabase SQL editor. It creates:

- `tickets` – general admission records.
- `parking_passes` – parking QR catalog with identical columns.
- Storage policies for the `qrcodes` bucket (the webhook also auto-creates this bucket if missing).

Indexes exist on `ticket_id`, `status`, and `purchaser_email` for fast scans.

---

## 🧠 Functions Overview

| File | Purpose |
| --- | --- |
| `api/create-checkout.js` | Builds Stripe Checkout line items dynamically (tickets + parking) and attaches metadata. |
| `api/webhook.js` | Verifies signatures, auto-creates storage buckets, inserts into `tickets` and `parking_passes` (with schema fallback), uploads QR codes, and sends the adaptive Resend email. |
| `src/App.jsx` | Landing page + single event experience with live totals, bundle messaging, and checkout button. |

Other helper scripts (`START.md`, `START_ALL_SERVERS.md`, etc.) explain the local workflow, Stripe CLI usage, and troubleshooting.

---

## 🧩 Environment Variables Explained

| Variable | Why it matters |
| --- | --- |
| `GA_PRICE_ID` | Stripe Price ID for general admission. |
| `PARKING_PRICE_ID` | Stripe Price ID for the parking product. |
| `SITE_URL` | Used for success/cancel URLs (defaults to `http://localhost:3000`). |
| `STRIPE_WEBHOOK_SECRET` | From `stripe listen ...`. Required for verifying webhook signatures. |
| `SUPABASE_SERVICE_ROLE_KEY` | Needed so the webhook can write to `tickets` + `parking_passes` and upload to storage. |

Bundle both price IDs into the same checkout to mirror Ticketmaster’s best practice: one payment, highest AOV.

---

## 🧪 Validation & Staff Tools

- `/validate` remains for scanning/validating QR codes (protected by `VALIDATE_PASSWORD`).
- `/success` now educates fans that parking + tickets arrive in a single email.

---

## 📦 Deploying to Vercel

1. **Build command:** `npm run build`
2. **Output directory:** `dist`
3. **Install command:** `npm install`
4. Set environment variables in Vercel dashboard.
5. Update Stripe webhook endpoint to point at `https://sports-tickets.vercel.app/api/stripe-webhook`.

---

## 🛠️ Troubleshooting

| Symptom | Fix |
| --- | --- |
| Checkout returns 400 | Ensure at least one ticket or parking pass is selected. |
| Webhook never fires | Stripe CLI not forwarding (check Terminal 3). |
| “Bucket not found” | Already solved – webhook auto-creates bucket. |
| `PGRST204 column not found` | Auto-resolved – webhook retries with fallback payload and logs `Used fallback insert...`. |
| No email | Verify `RESEND_API_KEY` and check Resend dashboard. |

---

You now have a **$100M-grade ticketing UX**: one page, one cart, max revenue. Fire it up, test with the Stripe CLI, and watch each purchase produce tickets + parking like the pros. 🎟🚗
