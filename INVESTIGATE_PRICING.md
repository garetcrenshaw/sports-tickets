# 🔍 Pricing Investigation - What I'm Doing

## What I've Added

1. **Enhanced logging in checkout API:**
   - Logs database query results
   - Logs which Price IDs are being used
   - Logs actual Stripe price amounts
   - Logs if falling back to legacy pricing

2. **Debug endpoint:** `/api/debug-pricing?eventId=4`
   - Shows database prices
   - Shows Stripe Price IDs
   - Shows actual Stripe prices
   - Identifies issues

---

## How to Debug

### Step 1: Check Vercel Logs

After making a test purchase, check Vercel logs:

1. Go to [Vercel Dashboard](https://vercel.com)
2. Your project → **Functions** tab
3. Click on a recent `/api/create-checkout` invocation
4. Look for console logs:
   - `CREATE-CHECKOUT: Database event data:`
   - `CREATE-CHECKOUT: Using database pricing` or `Using legacy pricing`
   - `CREATE-CHECKOUT: Stripe admission price details:`
   - `CREATE-CHECKOUT: Stripe parking price details:`

**This will tell us:**
- What's in the database
- What Price IDs are being used
- What prices Stripe actually has for those Price IDs

---

### Step 2: Use Debug Endpoint

Visit (replace with your domain):
```
https://your-site.vercel.app/api/debug-pricing?eventId=4
```

Or locally:
```
http://localhost:3001/api/debug-pricing?eventId=4
```

**This will show:**
- Database prices vs expected
- Stripe Price IDs
- Actual Stripe prices
- List of issues

---

## What to Look For

**In the logs, check:**
1. Is it using database pricing or legacy?
2. What Price IDs are being used?
3. What are the actual Stripe prices for those Price IDs?

**Most likely issue:**
- Database has Price IDs
- But those Price IDs in Stripe are still $15.00
- Need to update prices in Stripe to $18/$19

---

## Next Steps

1. **Make a test purchase**
2. **Check Vercel logs** (see Step 1)
3. **Use debug endpoint** (see Step 2)
4. **Share the results** - I'll tell you exactly what to fix

The enhanced logging will show us exactly what's happening! 🔍

