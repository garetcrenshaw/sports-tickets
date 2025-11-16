# Sports Tickets App

A full-featured ticket purchasing system built with React, Netlify Functions, Stripe Checkout, and Supabase.

## Features

- **Multi-ticket purchase**: Select 1-10 General Admission tickets
- **Stripe Checkout integration**: Secure payment processing
- **Email delivery**: Automatic ticket emails with QR codes via Resend
- **Ticket validation**: Staff-only validation with password protection
- **Webhook handling**: Automated ticket generation on successful payment

## Local Development

### Prerequisites

- Node.js 18+
- Netlify CLI (`npm install -g netlify-cli`)
- Stripe test account
- Supabase project
- Resend API key

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   
   Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

   Required variables:
   - `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe test publishable key (pk_test_...)
   - `STRIPE_SECRET_KEY` - Stripe test secret key (sk_test_...)
   - `GA_PRICE_ID` - Stripe Price ID for General Admission (price_...)
   - `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret (whsec_...)
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_ANON_KEY` - Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
   - `RESEND_API_KEY` - Resend API key (re_...)
   - `VALIDATE_PASSWORD` - Staff password for ticket validation
   - `SITE_URL` - Your site URL (http://localhost:8888 for dev)

3. **Start development server:**
   ```bash
   npm run dev
   ```

   This starts Netlify Dev which serves:
   - Frontend: `http://localhost:8888`
   - Functions: `http://localhost:8888/.netlify/functions/*`

4. **Test Stripe payments:**
   
   Use test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
   - Any ZIP code

### Database Schema

Required Supabase table:

```sql
CREATE TABLE tickets (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  ticket_number INTEGER NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  event_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  qr_code_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  validated_at TIMESTAMP
);
```

### Stripe Webhook Setup

1. In Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-site.netlify.app/webhook`
3. Select event: `checkout.session.completed`
4. Copy signing secret to `STRIPE_WEBHOOK_SECRET`

For local testing:
```bash
stripe listen --forward-to localhost:8888/webhook
```

## Project Structure

```
sports-tickets/
├── netlify/
│   └── functions/           # Serverless functions
│       ├── create-checkout.js   # Creates Stripe Checkout session
│       ├── webhook.js           # Handles Stripe webhooks
│       ├── send-ticket.js       # Sends ticket emails
│       ├── validate-ticket.js   # Validates tickets
│       └── get-events.js        # Returns event data
├── src/
│   ├── lib/                # Shared utilities
│   │   ├── stripe.js           # Stripe client helper
│   │   ├── db.js               # Supabase helper
│   │   └── qr.js               # QR code generation
│   ├── pages/              # React pages
│   │   ├── Success.jsx         # Payment success page
│   │   └── Validate.jsx        # Ticket validation page
│   └── App.jsx             # Main app component
├── netlify.toml            # Netlify configuration
├── .env.example            # Environment variable template
└── package.json
```

## Deployment

### Netlify Setup

1. **Connect repository** to Netlify
2. **Build settings:**
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Environment variables:**
   
   Add all variables from `.env.example` in Netlify dashboard:
   - Site settings → Environment variables → Add variables
   - Use your production Stripe keys (pk_live_..., sk_live_...)

4. **Deploy:**
   ```bash
   git push origin main
   ```

### Post-Deployment

1. Update Stripe webhook endpoint to production URL
2. Test complete purchase flow with test cards
3. Switch to live Stripe keys when ready for production

## Troubleshooting

### 404 on `/api/create-checkout`

- Check `netlify.toml` has correct redirects
- Verify function exists at `netlify/functions/create-checkout.js`
- Check Netlify function logs

### "Purchase failed" error

- Check browser console for detailed error logs
- Verify all environment variables are set
- Check Stripe dashboard for failed payments
- Review Netlify function logs

### Emails not sending

- Verify `RESEND_API_KEY` is set correctly
- Check Resend dashboard for email logs
- Verify sender email is authorized in Resend

### Tickets not created

- Check webhook signature verification
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- Review webhook function logs in Netlify

## Support

For issues or questions, check:
- Netlify function logs
- Browser developer console
- Stripe dashboard logs
- Supabase database logs
