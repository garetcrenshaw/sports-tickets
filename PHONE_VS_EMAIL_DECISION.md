# 📱 Phone vs Email: Decision & Implementation

## Current Situation

**Portal (Parent Portal):**
- ✅ Phone: Required
- ✅ Email: Optional
- ✅ Message: "Your tickets will be texted to your phone"

**Main Site (EventPage):**
- ❌ Email: Required
- ❌ Phone: Not collected
- ❌ Uses email for ticket delivery

**Stripe Checkout:**
- Email: Collected (required by Stripe)
- Phone: Disabled

---

## Your Recommendation: Phone Only ✅

**Why this makes sense:**
1. ✅ **Twilio SMS delivery** - You're using SMS for tickets
2. ✅ **Simpler for users** - One field instead of two
3. ✅ **More reliable** - Phone numbers are more consistent
4. ✅ **Mobile-first** - Most users are on mobile anyway
5. ✅ **Faster checkout** - Less fields = faster conversion

---

## What Needs to Change

### Option 1: Phone Only (Recommended)

**Changes:**
1. **Main Site (EventPage):** Change from email to phone
2. **Stripe:** Enable phone collection, make email optional
3. **Keep portal as-is** (already uses phone)

**Pros:**
- Consistent across all entry points
- Simpler for users
- Better for SMS delivery

**Cons:**
- Stripe still needs email (but can be auto-generated or optional)

### Option 2: Phone Primary, Email Optional

**Changes:**
1. **Main Site:** Ask for phone (required), email (optional)
2. **Stripe:** Collect phone, email optional
3. **Portal:** Keep as-is (phone required, email optional)

**Pros:**
- Flexibility (can use email as backup)
- Stripe happy (has email if needed)

**Cons:**
- More fields = slightly slower checkout

---

## My Recommendation: Phone Only ✅

**Implementation:**
1. Main site: Phone required, email optional (or auto-fill from phone)
2. Stripe: Enable phone collection, email optional
3. Portal: Keep as-is (already perfect)

**This gives you:**
- Phone for SMS delivery ✅
- Email as backup (optional) ✅
- Consistent experience ✅

---

## Next Steps

1. **Fix Stripe pricing first** (see STRIPE_PRICING_FIX_GUIDE.md)
2. **Then update forms to phone-only**
3. **Test in localhost**
4. **Deploy**

Want me to update the forms now, or fix pricing first?

