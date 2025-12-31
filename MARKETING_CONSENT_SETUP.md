# Marketing Consent Setup Guide

This guide walks you through enabling marketing consent collection for all ticket purchases.

## 📋 Overview

When enabled, customers will see an optional checkbox during Stripe checkout asking if they want to receive marketing emails. Their choice is automatically stored in your database and tied to their purchase.

## ✅ Step-by-Step Setup

### Step 1: Enable Marketing Consent in Stripe Dashboard

1. **Go to Stripe Dashboard**
   - Visit: https://dashboard.stripe.com/settings/checkout
   - Or: Dashboard → Settings → Checkout

2. **Agree to Terms of Service**
   - Look for the "Marketing consent" section
   - Click "Agree to Terms of Service" or "Enable marketing consent"
   - Read and accept Stripe's terms for collecting marketing consent

3. **Verify It's Enabled**
   - You should see a green checkmark or "Enabled" status
   - This allows your checkout to collect marketing consent

### Step 2: Run Database Migration

Add the `marketing_consent` column to your `tickets` table:

```bash
# Option A: Using Supabase Dashboard
# 1. Go to your Supabase project
# 2. Navigate to SQL Editor
# 3. Copy and paste the contents of add-marketing-consent.sql
# 4. Click "Run"

# Option B: Using psql (if you have direct database access)
psql -h your-db-host -U postgres -d your-database -f add-marketing-consent.sql
```

The migration will:
- Add `marketing_consent` column (BOOLEAN: true/false/NULL)
- Create an index for fast queries on opted-in customers

### Step 3: Deploy Code Changes

The code is already updated! Just deploy:

```bash
git add .
git commit -m "Enable marketing consent collection"
git push origin main
```

Vercel will automatically deploy. Wait 1-2 minutes for deployment to complete.

### Step 4: Test It

1. **Make a Test Purchase**
   - Go to your portal: `https://gamedaytickets.io/org/springfield-little-league/event/1`
   - Complete a checkout
   - During Stripe checkout, you should see a checkbox for marketing emails

2. **Verify in Database**
   ```sql
   SELECT buyer_email, buyer_name, marketing_consent, created_at
   FROM tickets
   WHERE stripe_session_id = 'YOUR_SESSION_ID'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

## 📊 How to Use Marketing Consent Data

### Query All Opted-In Customers

```sql
-- Get unique customers who opted in
SELECT DISTINCT 
  buyer_email,
  buyer_name,
  MAX(created_at) as last_purchase,
  COUNT(*) as total_tickets
FROM tickets 
WHERE marketing_consent = true 
GROUP BY buyer_email, buyer_name
ORDER BY last_purchase DESC;
```

### Export for Email Marketing

```sql
-- Export CSV-ready list of opted-in emails
SELECT 
  buyer_email as email,
  buyer_name as name,
  MAX(created_at) as last_purchase_date
FROM tickets
WHERE marketing_consent = true
GROUP BY buyer_email, buyer_name
ORDER BY last_purchase_date DESC;
```

### Check Consent Rate

```sql
-- See consent collection rate
SELECT 
  COUNT(*) as total_purchases,
  COUNT(marketing_consent) as consent_collected,
  COUNT(*) FILTER (WHERE marketing_consent = true) as opted_in,
  COUNT(*) FILTER (WHERE marketing_consent = false) as opted_out,
  ROUND(100.0 * COUNT(*) FILTER (WHERE marketing_consent = true) / NULLIF(COUNT(marketing_consent), 0), 2) as opt_in_rate
FROM tickets
WHERE created_at >= NOW() - INTERVAL '30 days';
```

## 🎯 What Happens During Checkout

1. **Customer sees checkbox** (optional) during Stripe checkout
2. **Customer chooses** to opt in or opt out
3. **Webhook captures** the consent choice
4. **Database stores** `marketing_consent` value:
   - `true` = Customer opted IN to marketing
   - `false` = Customer opted OUT of marketing  
   - `NULL` = Consent not collected (old purchases or consent disabled)

## 🔒 Legal Compliance

- ✅ **GDPR Compliant**: Stripe handles consent collection per GDPR requirements
- ✅ **CAN-SPAM Compliant**: Only email customers who opted in
- ✅ **Audit Trail**: Every purchase has a consent record tied to it
- ✅ **Opt-Out Honored**: Customers who opt out are marked as `false`

## 📧 Best Practices

1. **Only email opted-in customers** (`marketing_consent = true`)
2. **Respect opt-outs** (`marketing_consent = false`)
3. **Always include unsubscribe** link in marketing emails
4. **Track consent rate** to measure engagement
5. **Segment by event** to send relevant marketing

## 🚨 Troubleshooting

### "Error: To set consent_collection.promotions..."

**Problem**: You haven't agreed to Stripe's ToS yet.

**Solution**: 
1. Go to https://dashboard.stripe.com/settings/checkout
2. Find "Marketing consent" section
3. Click "Agree to Terms of Service"
4. Wait 1-2 minutes for changes to propagate

### Consent Not Showing in Database

**Check**:
1. Is the migration run? (`SELECT marketing_consent FROM tickets LIMIT 1;`)
2. Is the webhook processing? (Check Vercel logs)
3. Did customer actually see the checkbox? (Test a purchase)

### Old Purchases Show NULL

**This is normal!** Only purchases made AFTER enabling consent will have consent data. Old purchases will have `NULL`.

## 📝 Next Steps

1. ✅ Enable in Stripe Dashboard (Step 1)
2. ✅ Run database migration (Step 2)
3. ✅ Deploy code (Step 3)
4. ✅ Test a purchase (Step 4)
5. 🎯 Start using consent data for email marketing!

---

**Questions?** Check your Vercel logs or Supabase logs if consent isn't being captured.

