# 🔧 ENVIRONMENT VARIABLES FIX GUIDE

## Required Environment Variables

### Backend (Vercel + Local)
```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...              # From Stripe Dashboard > Developers > API keys
STRIPE_WEBHOOK_SECRET=whsec_...            # From Stripe Dashboard > Webhooks > Signing secret

# Supabase (CRITICAL: Must be full HTTPS URL)
SUPABASE_URL=https://xjvzehjpgbwiiuvsnflk.supabase.co  # Full URL with https://
SUPABASE_SERVICE_ROLE_KEY=eyJ...           # From Supabase > Settings > API > service_role

# Resend
RESEND_API_KEY=re_...                      # From Resend Dashboard > API Keys

# Stripe Price IDs
GA_PRICE_ID=price_...                      # Gameday admission price ID
PARKING_PRICE_ID=price_...                 # Parking price ID

# Validation
VALIDATE_PASSWORD=gameday2024              # Password for ticket validation
```

### Frontend (Vite - must start with VITE_)
```bash
VITE_SUPABASE_URL=https://xjvzehjpgbwiiuvsnflk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...              # From Supabase > Settings > API > anon key (PUBLIC key)
```

---

## Common Issues & Fixes

### ❌ Issue: "Invalid URL" or Supabase connection fails
**Cause**: SUPABASE_URL missing `https://` prefix

**Fix**:
```bash
# WRONG ❌
SUPABASE_URL=xjvzehjpgbwiiuvsnflk.supabase.co

# CORRECT ✅
SUPABASE_URL=https://xjvzehjpgbwiiuvsnflk.supabase.co
```

### ❌ Issue: "Invalid API key" or "Forbidden" from Resend
**Cause**: Old or invalid API key

**Fix**:
1. Go to Resend Dashboard > API Keys
2. Click "Regenerate" or create new key
3. Copy the new key (starts with `re_`)
4. Update everywhere:
   ```bash
   # Local
   # Edit .env.local and update RESEND_API_KEY=re_new_key
   
   # Vercel
   vercel env rm RESEND_API_KEY production
   vercel env add RESEND_API_KEY re_new_key production
   vercel --prod
   ```

### ❌ Issue: Frontend can't read tickets from Supabase
**Cause**: Missing `VITE_` prefix on frontend env vars

**Fix**:
```bash
# Frontend needs VITE_ prefix for Vite to expose them
VITE_SUPABASE_URL=https://xjvzehjpgbwiiuvsnflk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# NOT this (won't work in frontend):
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

### ❌ Issue: Trailing spaces causing errors
**Run validation**:
```bash
./validate-env.sh
```

**Manual check**:
```bash
# Show spaces as dots
cat .env.local | sed 's/ /·/g'

# Look for dots at end of lines - those are spaces that break things
```

---

## Setup Steps

### 1. Local Development (.env.local)

Create/update `.env.local`:
```bash
# Copy from template
cp env-local-template.txt .env.local

# Edit with your actual values
nano .env.local
```

**Full .env.local template**:
```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase (Backend - service role)
SUPABASE_URL=https://xjvzehjpgbwiiuvsnflk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Resend
RESEND_API_KEY=re_...

# Stripe Products
GA_PRICE_ID=price_...
PARKING_PRICE_ID=price_...

# Validation
VALIDATE_PASSWORD=gameday2024

# Frontend (Vite needs these)
VITE_SUPABASE_URL=https://xjvzehjpgbwiiuvsnflk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 2. Vercel Production

**Option A: Pull from Vercel (if already set)**
```bash
vercel env pull .env.local
```

**Option B: Set manually**
```bash
# Add each variable
vercel env add STRIPE_SECRET_KEY sk_test_... production
vercel env add STRIPE_WEBHOOK_SECRET whsec_... production
vercel env add SUPABASE_URL https://xjvzehjpgbwiiuvsnflk.supabase.co production
vercel env add SUPABASE_SERVICE_ROLE_KEY eyJ... production
vercel env add RESEND_API_KEY re_... production
vercel env add GA_PRICE_ID price_... production
vercel env add PARKING_PRICE_ID price_... production
vercel env add VALIDATE_PASSWORD gameday2024 production
vercel env add VITE_SUPABASE_URL https://xjvzehjpgbwiiuvsnflk.supabase.co production
vercel env add VITE_SUPABASE_ANON_KEY eyJ... production

# After adding, redeploy
vercel --prod
```

**Option C: Via Vercel Dashboard**
1. Go to your project on vercel.com
2. Settings > Environment Variables
3. Add each variable
4. Click "Redeploy" or push to trigger deploy

---

## Where to Find Values

### Stripe Keys
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Click "Developers" in top nav
3. Click "API keys"
4. Copy:
   - **Secret key** (`sk_test_...` for test mode)
   - For webhook secret, go to "Webhooks" tab, click your endpoint, copy "Signing secret"

### Supabase Keys
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click "Settings" (gear icon)
4. Click "API"
5. Copy:
   - **Project URL** (e.g., `https://xjvzehjpgbwiiuvsnflk.supabase.co`)
   - **anon/public key** (for VITE_SUPABASE_ANON_KEY)
   - **service_role key** (for SUPABASE_SERVICE_ROLE_KEY) - click "Reveal" to see

⚠️ **IMPORTANT**: 
- `anon` key = PUBLIC (safe for frontend)
- `service_role` key = SECRET (backend only, full access)

### Resend API Key
1. Go to [Resend Dashboard](https://resend.com/api-keys)
2. Click "Create API Key" or use existing
3. Copy the key (starts with `re_`)
4. **Verify domain** at [Resend Domains](https://resend.com/domains)
   - Must verify `gamedaytickets.io` with DNS records
   - Status must show "Verified" (green)

---

## Validation

### Run validation script
```bash
./validate-env.sh
```

**Expected output**:
```
✅ STRIPE_SECRET_KEY: Present
✅ STRIPE_WEBHOOK_SECRET: Present
✅ SUPABASE_URL: Present
✅ SUPABASE_SERVICE_ROLE_KEY: Present
✅ RESEND_API_KEY: Present
✅ VITE_SUPABASE_URL: Present
✅ VITE_SUPABASE_ANON_KEY: Present
```

### Test each service

**Supabase**:
```bash
curl http://localhost:3000/api/test-supabase
# Expected: {"success": true, ...}
```

**Resend**:
```bash
curl http://localhost:3000/api/test-resend
# Expected: {"success": true, "emailId": "..."}
# Check inbox/spam for test email
```

**QR**:
```bash
curl http://localhost:3000/api/test-qr
# Expected: {"success": true, "qr": "data:image/png;base64,..."}
```

---

## Troubleshooting

### Test fails with "Invalid URL"
```bash
# Check your SUPABASE_URL
echo $SUPABASE_URL

# Should output: https://xjvzehjpgbwiiuvsnflk.supabase.co
# If missing https://, add it

# Update .env.local
SUPABASE_URL=https://xjvzehjpgbwiiuvsnflk.supabase.co

# Also update VITE_ version
VITE_SUPABASE_URL=https://xjvzehjpgbwiiuvsnflk.supabase.co
```

### Email fails with 403/403
```bash
# Regenerate Resend API key
# 1. Go to https://resend.com/api-keys
# 2. Click "Regenerate" on existing key
# 3. Copy new key
# 4. Update:

# .env.local
RESEND_API_KEY=re_new_key_here

# Vercel
vercel env rm RESEND_API_KEY production
vercel env add RESEND_API_KEY re_new_key_here production
vercel --prod
```

### Frontend can't connect
```bash
# Check Vite env vars exist
cat .env.local | grep VITE_

# Should see:
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...

# If missing, add them and restart dev server
npm run dev
```

---

## Quick Reference Card

| Variable | Where Used | Secret? | Format |
|----------|-----------|---------|--------|
| STRIPE_SECRET_KEY | Backend | ✅ Yes | sk_test_... or sk_live_... |
| STRIPE_WEBHOOK_SECRET | Backend | ✅ Yes | whsec_... |
| SUPABASE_URL | Backend | ❌ No | https://xxx.supabase.co |
| SUPABASE_SERVICE_ROLE_KEY | Backend | ✅ Yes | eyJhbG... (long JWT) |
| RESEND_API_KEY | Backend | ✅ Yes | re_... |
| VITE_SUPABASE_URL | Frontend | ❌ No | https://xxx.supabase.co |
| VITE_SUPABASE_ANON_KEY | Frontend | ❌ No | eyJhbG... (different JWT) |

---

## After Fixing Envs

1. **Restart local dev**: `npm run dev`
2. **Test**: `./test-local-stack.sh`
3. **Redeploy prod**: `vercel --prod`
4. **Verify**: Check Vercel logs + test purchase

✅ **Done!** All services should now connect properly.

