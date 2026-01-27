# 🎟️ Gameday Tickets

A modern ticketing platform for sports events with email ticket delivery, QR code scanning, and real-time dashboards.

## Architecture

```
sports-tickets/
├── api/                    # Vercel serverless API routes
│   ├── create-checkout/    # Stripe checkout session creation
│   ├── stripe-webhook/     # Payment confirmation & ticket generation
│   ├── send-sms/           # (Legacy - SMS delivery disabled, using email only)
│   ├── get-tickets/        # Fetch tickets for viewing
│   ├── scan-ticket/        # QR code validation at entry
│   └── ...                 # Other API endpoints
├── src/
│   ├── config/
│   │   ├── pricing.js      # 🔑 SINGLE SOURCE OF TRUTH for all pricing
│   │   ├── events.js       # Event definitions
│   │   └── organizations.js # White-label org branding
│   ├── pages/              # React page components
│   ├── lib/                # Shared utilities (db, stripe, qr)
│   └── App.jsx             # Main React application
├── public/                 # Static assets (logos, icons)
├── scripts/                # Utility scripts
└── vercel.json             # Vercel deployment config
```

## Pricing Architecture

All pricing is centralized in `src/config/pricing.js`:

```javascript
// Edit pricing here - one place, flows everywhere
export const PRICING_TIERS = {
  SOCAL_CUP: {
    admission: 18.00,
    parking: 19.00,
    feeModel: 'all_in',  // California compliant
    stripePriceIds: {
      admission: 'price_xxx',  // Create in Stripe Dashboard
      parking: 'price_yyy',
    }
  },
};
```

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
Copy `env-local-template.txt` to `.env.local` and fill in:
- **Stripe**: Secret key, webhook secret
- **Supabase**: URL, service role key
- **Resend**: API key (required for email ticket delivery)

### 3. Start Development
```bash
npm run dev
```

This starts:
- Vite dev server (port 3002)
- API server (port 3000)
- Stripe webhook listener

### 4. Test the Flow
1. Visit `http://localhost:3002/org/socal-cup`
2. Select an event and quantity
3. Use test card: `4242 4242 4242 4242`
4. Check your email for ticket delivery

## Key Integrations

| Service | Purpose | Env Vars Required |
|---------|---------|-------------------|
| Stripe | Payments | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Supabase | Database | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Resend | Email Ticket Delivery | `RESEND_API_KEY` |

## Deployment

```bash
npm run deploy  # Build and deploy to Vercel
```

## Database Sync

After changing pricing in `src/config/pricing.js`, run this SQL in Supabase:

```sql
-- Located at: scripts/update-pricing.sql
UPDATE events SET
  admission_price = 18.00,
  parking_price = 19.00,
  stripe_admission_price_id = 'price_xxx',
  stripe_parking_price_id = 'price_yyy',
  updated_at = NOW()
WHERE id BETWEEN 4 AND 19;
```

## License

Private - Gameday Tickets © 2026
