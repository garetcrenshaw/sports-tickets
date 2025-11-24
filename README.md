# Gameday Empire – Sports Ticketing Experience

End-to-end ticketing flow inspired by Ticketmaster, SeatGeek, and every high-performing indie platform in 2025:

- Single event page with **one cart** for admission + parking.
- **Stripe Checkout** for ultra-fast conversion.
- **Supabase** stores both tickets and parking passes (each with unique QR codes).
- **Resend** delivers beautiful, adaptive emails (tickets only, parking only, or bundled).
- **Netlify Functions** handle all backend logic with bulletproof logging and schema fallbacks.

## ✨ Highlights

- Fans can mix **up to 10 Gameday Tickets**, **4 Gameday Parking** passes, and stack **Gameday All-Access bundles** (each bundle = 1 ticket + 1 parking).
- Live totals, bundle badge, and “Most fans add parking” cues lift AOV.
- Webhook auto-creates the `qrcodes` bucket, writes to both `tickets` and `parking_passes`, and emails a gorgeous bundle confirmation.
- Schema-cache fallback guarantees rows insert even when Supabase metadata lags.

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
Set these environment variables in your Vercel dashboard (no .env files needed):
- All variables except `VITE_STRIPE_PUBLISHABLE_KEY` (use `STRIPE_PUBLISHABLE_KEY` in Vercel)

> ℹ️ Stripe CLI prints a fresh `whsec_...` every time you run `stripe listen`. Paste it into `.env.local` and restart the function server.

### 3. Run everything (3 terminals)

```
# Terminal 1 – Vite frontend
npm run dev

# Terminal 2 – Netlify-style functions
npm run dev:functions

# Terminal 3 – Stripe webhook forwarding
stripe listen --forward-to http://localhost:3001/.netlify/functions/stripe-webhook
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

## 📦 Deploying to Netlify

1. **Build command:** `npm run build`
2. **Publish directory:** `dist`
3. **Functions folder:** `api/`
4. Replicate all env vars from `.env`.
5. Update Stripe webhook endpoint to point at `https://your-site.vercel.app/api/stripe-webhook`.

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
