# ✅ Pricing Decision: $17.00 with Tax Separate

## Final Decision

**Price: $17.00**
**Tax: Shown separately (NOT included in price)**
**"Include tax in price" in Stripe: NO**

## Why This Works

### Customer Experience
- Sees: **$17.00** ticket price
- Tax added automatically: **$1.47** (8.625%)
- Total: **$18.47**

### Revenue Breakdown
1. **Customer pays:** $18.47 total
2. **Tax ($1.47):** Goes to California (you don't keep this)
3. **Stripe fee ($0.79):** Goes to Stripe (you don't keep this)
4. **Net revenue ($16.21):** This is what you actually keep
5. **Business share:** $15.00 ✅
6. **Platform share:** $1.21 ✅

## What to Configure

### Stripe Dashboard
1. Go to Products → SoCal Cup products
2. Set price to: **$17.00**
3. Set "Include tax in price": **NO** ✅
4. Save

### Database
```sql
UPDATE events 
SET admission_price = 17.00, parking_price = 17.00
WHERE event_name LIKE '%SoCal Cup%';
```

### Frontend
- Already set to $17.00 ✅
- Shows $17.00 as ticket price
- Tax will be added by Stripe automatically

## Key Points for Money Guys

1. **Taxes and Stripe fees are SEPARATE** - neither goes to you
2. **Tax ($1.47) goes to California** - you're just collecting it
3. **Stripe fee ($0.79) goes to Stripe** - cost of processing
4. **Net revenue ($16.21) is what you split**
5. **Business gets exactly $15.00** ✅
6. **Platform gets $1.21** (exceeds $1.00 minimum) ✅

## California Compliance

✅ **Compliant because:**
- Tax is shown separately (required)
- No hidden fees
- Transparent pricing
- Stripe handles tax remittance automatically

## Result

- Customer pays: **$18.47** total
- Business gets: **$15.00** ✅
- Platform gets: **$1.21** ✅
- Everyone is happy! 🎉

