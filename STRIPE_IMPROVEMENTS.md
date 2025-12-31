# Stripe Integration - Review & Recommendations

## Current Implementation Status ✅

Your Stripe integration is **solid and production-ready**. Here's what's working well:

### ✅ Strengths
1. **Proper Checkout Session Creation** - Using Stripe Checkout (hosted) for security
2. **Metadata Handling** - All order details stored in session metadata
3. **Fee Model Support** - Handles both `pass_through` and `baked_in` models
4. **Error Tracking** - Sentry integration for error monitoring
5. **CORS Handling** - Proper CORS headers for API access

## Recommended Improvements

### 1. **Portal Redirect URLs** 🔴 Priority

**Issue:** Redirect URLs are hardcoded to `gamedaytickets.io`, which breaks portal redirects.

**Current Code:**
```javascript
const successUrl = 'https://gamedaytickets.io/success?session_id={CHECKOUT_SESSION_ID}';
const cancelUrl = 'https://gamedaytickets.io/cancel';
```

**Recommended Fix:**
```javascript
// In api/create-checkout/index.js
const { portalSlug } = req.body || {};

// Determine redirect URLs based on context
let successUrl, cancelUrl;

if (portalSlug) {
  // Portal checkout - redirect back to portal
  const baseUrl = process.env.SITE_URL || 'https://gamedaytickets.io';
  successUrl = `${baseUrl}/org/${portalSlug}/success?session_id={CHECKOUT_SESSION_ID}`;
  cancelUrl = `${baseUrl}/org/${portalSlug}/cancel`;
} else {
  // B2C checkout - redirect to main site
  successUrl = 'https://gamedaytickets.io/success?session_id={CHECKOUT_SESSION_ID}';
  cancelUrl = 'https://gamedaytickets.io/cancel';
}
```

**Why:** This allows parent portal checkouts to redirect back to the branded portal experience.

---

### 2. **Environment-Based URLs** 🟡 Medium Priority

**Issue:** Hardcoded production URLs make local testing difficult.

**Recommended:**
```javascript
const baseUrl = process.env.SITE_URL || 
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://gamedaytickets.io');

const successUrl = portalSlug 
  ? `${baseUrl}/org/${portalSlug}/success?session_id={CHECKOUT_SESSION_ID}`
  : `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
```

**Why:** Makes local development easier and allows staging environments.

---

### 3. **Better Error Messages** 🟡 Medium Priority

**Current:** Generic error messages
**Recommended:** More specific error handling

```javascript
if (lineItems.length === 0) {
  res.status(400).json({ 
    error: 'Please select at least one ticket or parking pass to continue.',
    code: 'NO_ITEMS_SELECTED'
  });
  return;
}

// Add validation for event existence
if (!eventPricing[eventId]) {
  res.status(400).json({ 
    error: 'Event not found. Please try again.',
    code: 'EVENT_NOT_FOUND'
  });
  return;
}
```

**Why:** Better UX when things go wrong.

---

### 4. **Session Metadata Enhancement** 🟢 Low Priority

**Current:** Good metadata, but could include portal context

**Recommended:**
```javascript
metadata: {
  buyerName: name,
  buyerEmail: email,
  eventId: eventId?.toString(),
  admissionQuantity: admissionQuantity?.toString(),
  parkingQuantity: parkingQuantity?.toString(),
  feeModel: feeModel || 'baked_in',
  serviceFeePerTicket: serviceFeePerTicket?.toString() || '0',
  totalServiceFee: (serviceFeePerTicket * totalTickets)?.toString() || '0',
  portalSlug: portalSlug || '', // Add portal context
  checkoutSource: portalSlug ? 'portal' : 'b2c', // Track where checkout came from
}
```

**Why:** Better analytics and debugging.

---

### 5. **Price ID Configuration** 🟡 Medium Priority

**Issue:** Price IDs are hardcoded in the function.

**Recommended:** Move to environment variables or database

```javascript
// Option 1: Environment variables (current approach, but expand)
const eventPricing = {
  1: {
    admission: process.env.GA_PRICE_ID,
    parking: process.env.PARKING_PRICE_ID,
  },
  // ... more events
};

// Option 2: Database lookup (better for scaling)
// Fetch from Supabase events table which has price_id fields
```

**Why:** Easier to manage multiple events without code changes.

---

## Implementation Priority

1. **🔴 High:** Portal redirect URLs (breaks portal checkout experience)
2. **🟡 Medium:** Environment-based URLs, better error messages, price ID management
3. **🟢 Low:** Enhanced metadata (nice to have)

## Testing Checklist

After implementing changes:

- [ ] Test B2C checkout (main site) - success and cancel flows
- [ ] Test Portal checkout (org portal) - success and cancel flows  
- [ ] Test with past events (should be filtered out before checkout)
- [ ] Test error cases (no items selected, invalid event)
- [ ] Verify metadata in Stripe dashboard
- [ ] Check Sentry for any errors

## Next Steps

1. **Start with Portal Redirect URLs** - This is the most critical fix
2. **Add environment-based URLs** - Makes development easier
3. **Enhance error handling** - Better user experience
4. **Consider moving price IDs to database** - Better scalability

---

**Note:** Your current Stripe integration is production-ready. These improvements are optimizations for better UX and maintainability.

