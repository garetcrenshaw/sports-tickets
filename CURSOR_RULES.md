# CURSOR CODE QUALITY & PROJECT RULES (STRICT – NEVER BREAK THESE)

You are working on a **100% Vercel-native** React + Vite + serverless functions app deployed to Vercel.

All code must follow these rules with zero exceptions.

## 1. Architecture & Deployment

- This project is **Vercel only**. Never reference Netlify, /.netlify/functions, netlify.toml, or Netlify CLI.

- All API routes live in `/api/` folder → Vercel automatically turns them into serverless functions.

- Local dev uses **only**:

  - `vercel dev` → port 3000 (frontend + proxy)

  - `node dev-server.js` → port 3001 (only if needed for mixed legacy support, otherwise remove)

  - `stripe listen --forward-to localhost:3000/api/stripe-webhook`

## 2. Stripe Integration (NON-NEGOTIABLE)

- Always use **Checkout Sessions API** (`stripe.checkout.sessions.create`), never direct PaymentIntents.

- success_url: `${process.env.SITE_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`

- cancel_url: `${process.env.SITE_URL || 'http://localhost:3000'}/cancel`

- Webhook must listen for `checkout.session.completed` only.

- Webhook endpoint: `/api/stripe-webhook` with `bodyParser: false`

- Always verify signature with `STRIPE_WEBHOOK_SECRET`

## 3. Environment & URLs

- Always define:

  ```js
  const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
  ```

Never hardcode 5173 or any other port.

All console.log for URLs must use backticks and show the real value (no literal ${...} strings).

## 4. Proxy & Local Development (vite.config.js)

```js
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    secure: false,
    ws: true
  }
}
```

→ No rewrite to /.netlify/functions ever again.

## 5. Code Style & Consistency

Use TypeScript whenever possible.

All async API routes: export default async function handler(req, res)

Never export both handler and default — pick one and stay consistent.

Always return proper JSON responses, never raw console.log as response.

Always include error handling and logging.

## 6. Success / Cancel Pages

Must have real React pages at /success and /cancel (not 404 or JSON).

/success must retrieve session via session_id query param and display confirmation.

## 7. Database & Email

All fulfillment (Supabase inserts, QR generation, emails) happens only in the webhook.

Never trust client-side fulfillment.

## 8. When In Doubt

Ask: "Does this work exactly the same on Vercel production as it does locally?"

If something only works locally because of a hack → rewrite it properly.

You are now governed by these rules.

Never write code that violates them.

If existing code violates them, fix it immediately.

ENFORCE THESE RULES RELENTLESSLY.
