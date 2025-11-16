# Local Development Guide

## Prerequisites

- Node.js 18+ installed
- Netlify CLI installed globally: `npm install -g netlify-cli`

## Environment Variables

Create a `.env` file in the root with:

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Price IDs
GA_PRICE_ID=price_...
FREE_PRICE_ID=price_...
PARKING_PRICE_ID=price_...

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...

# Resend (for emails)
RESEND_API_KEY=re_...

# Stripe Webhook Secret (for local testing)
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Running Locally

### Option 1: Netlify Dev (Recommended - Full Stack)

This runs both the frontend AND functions together:

```bash
npm run dev:functions
```

- Frontend: http://localhost:8888
- Functions: http://localhost:8888/.netlify/functions/*
- All environment variables loaded automatically

### Option 2: Vite Only (Frontend Development)

For faster frontend-only development:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Functions: Must deploy to staging or use Option 1

## Testing the Flow

### 1. Test Free Tickets
- Select "Free Admission"
- Enter name and email
- Click "Claim Free"
- Should receive immediate confirmation + email

### 2. Test Paid Tickets (3x General Admission)
- Select "General Admission"
- Set quantity to 3
- Enter name and email
- Click "Pay $45.00"
- Enter test card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits
- Should receive 3 separate emails, each with a unique QR code

### 3. Test Webhook
If testing webhooks locally, use Stripe CLI:

```bash
stripe listen --forward-to localhost:8888/.netlify/functions/webhook
```

## Project Structure

```
sports-tickets/
├── functions/              # Netlify Functions (backend)
│   ├── create-ticket.js    # Creates payment intent
│   ├── webhook.js          # Stripe webhook handler
│   └── send-ticket.js      # Sends email with QR codes
├── src/                    # React frontend
│   ├── App.jsx            # Main app component
│   └── pages/
│       └── Validate.jsx   # QR code validation
├── netlify.toml           # Netlify configuration
└── package.json
```

## Common Issues

### Functions not loading
- Make sure `netlify.toml` has `[functions] directory = "functions"`
- Check environment variables are set
- Run `netlify dev` instead of `vite`

### Stripe errors
- Verify all Stripe keys are set correctly
- Check Price IDs exist in your Stripe dashboard
- For webhooks, ensure webhook secret is correct

### Email not sending
- Check `RESEND_API_KEY` is valid
- Verify email domain is configured in Resend
- Check function logs for errors

## Deployment

Deploy to Netlify:

```bash
# First time
netlify init

# Deploy
git push origin main
```

Or manual deploy:

```bash
netlify deploy --prod
```

## Support

Check the main README.md for more information.

