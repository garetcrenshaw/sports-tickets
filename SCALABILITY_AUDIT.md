# 🔍 Platform Scalability Audit
## Gameday Tickets - Full Backend Analysis

**Audit Date:** January 3, 2026  
**Auditor:** Development Review  
**Purpose:** Assess platform readiness for multi-event/multi-provider scaling

---

## 📊 Executive Summary

Your platform has a **solid foundation** for scaling. The core architecture (single `tickets` table with `event_id`) is correct. However, there are **3 critical items** that need updates before adding more events/providers.

| Category | Status | Action Required |
|----------|--------|-----------------|
| Database Schema | ✅ Good | Minor additions needed |
| Stripe Webhook | ✅ Good | Works for all events |
| Create Checkout API | ⚠️ Needs Work | Hardcoded event mapping |
| Frontend Events | ⚠️ Needs Work | Hardcoded data |
| Provider Dashboard | ❌ Not Built | Needed for self-service |
| Organization Isolation | ❌ Not Built | Needed for multi-tenant |

---

## 🗄️ DATABASE ARCHITECTURE

### Current Tables

| Table | Purpose | Multi-Event Ready? |
|-------|---------|-------------------|
| `tickets` | All purchased tickets | ✅ YES - uses `event_id` |
| `parking_passes` | Parking passes | ✅ YES - uses `event_id` |
| `events` | Event registry | ✅ YES - stores all events |
| `email_queue` | Async email delivery | ✅ YES - uses `event_id` |
| `scan_logs` | Scanner audit trail | ✅ YES - uses `event_id` |

### How Tickets Table Works

```
┌─────────────────────────────────────────────────────────────────┐
│                        TICKETS TABLE                            │
├─────────────────────────────────────────────────────────────────┤
│  id          │ stripe_session_id │ ticket_id    │ event_id     │
│  buyer_name  │ buyer_email       │ ticket_type  │ qr_url       │
│  status      │ created_at        │ scanned_at   │ scanned_by   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ event_id references
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        EVENTS TABLE                             │
├─────────────────────────────────────────────────────────────────┤
│  id  │ event_name           │ event_date   │ venue_name        │
│  has_admission │ admission_price │ stripe_admission_price_id    │
│  has_parking   │ parking_price   │ stripe_parking_price_id      │
│  scanner_pin   │ owner_email     │ status                       │
└─────────────────────────────────────────────────────────────────┘
```

**Answer to your question:** YES, all tickets go into the **same `tickets` table**. They are differentiated by `event_id`. You do NOT need separate tables for each event or provider.

### What You DON'T Need to Add

- ❌ Separate tickets table per event
- ❌ Separate database per provider
- ❌ New Stripe webhook per event

### What You MIGHT Want to Add (Phase 2)

```sql
-- Optional: Organizations table (for provider isolation)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,           -- 'socal-cup', 'springfield-little-league'
  name TEXT NOT NULL,                  -- 'SoCal Cup'
  owner_email TEXT NOT NULL,           -- Primary contact
  logo_url TEXT,                       -- Logo image URL
  primary_color TEXT DEFAULT '#f97316',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add org_id to events table
ALTER TABLE events ADD COLUMN org_id UUID REFERENCES organizations(id);

-- Create index for fast queries
CREATE INDEX idx_events_org ON events(org_id);
```

This would allow you to:
- Link events to organizations
- Build provider dashboards with proper isolation
- Generate per-organization reports

---

## 🔌 API ENDPOINTS AUDIT

### ✅ GOOD TO GO (No Changes Needed)

#### `/api/stripe-webhook/index.js`
**Status:** ✅ Multi-event ready

The webhook correctly:
- Extracts `event_id` from Stripe session metadata
- Inserts tickets with the correct `event_id`
- Works for ANY event automatically

```javascript
// Line 278-279 - Already correct!
const eventIdRaw = session.metadata?.eventId || session.metadata?.event_id || '1';
const eventId = parseInt(eventIdRaw, 10) || 1;
```

#### `/api/scan-ticket/index.js`
**Status:** ✅ Multi-event ready

- Validates scanner PIN against `events` table
- Checks ticket belongs to correct event
- Logs all scans with `event_id`

#### `/api/validate-pin/index.js`
**Status:** ✅ Multi-event ready

- Looks up PIN in `events` table
- Returns event info for the scanner app

#### `/api/process-email-queue/index.js`
**Status:** ✅ Multi-event ready

- Processes emails with `event_id`
- Generates QR codes per ticket

---

### ⚠️ NEEDS UPDATE

#### `/api/create-checkout/index.js`
**Status:** ⚠️ CRITICAL - Hardcoded event pricing

**Current Code (Lines 59-76):**
```javascript
// THIS IS THE PROBLEM - Only 3 events hardcoded!
const eventPricing = {
  1: {
    admission: process.env.GA_PRICE_ID,
    parking: process.env.PARKING_PRICE_ID,
  },
  2: {
    admission: null,
    parking: process.env.SPORTSPLEX_SHOWDOWN_PARKING_PRICE_ID,
  },
  3: {
    admission: process.env.SPORTSPLEX_EVENT_ADMISSION_PRICE_ID,
    parking: null,
  },
};
```

**RECOMMENDED FIX:** Fetch pricing from Supabase `events` table

```javascript
// FIXED: Dynamic event pricing from database
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Inside handler function:
const { data: eventData, error } = await supabase
  .from('events')
  .select('stripe_admission_price_id, stripe_parking_price_id, has_admission, has_parking')
  .eq('id', eventId)
  .single();

if (error || !eventData) {
  return res.status(404).json({ error: 'Event not found' });
}

const lineItems = [];

if (admissionQuantity > 0 && eventData.has_admission && eventData.stripe_admission_price_id) {
  lineItems.push({
    price: eventData.stripe_admission_price_id,
    quantity: admissionQuantity,
  });
}

if (parkingQuantity > 0 && eventData.has_parking && eventData.stripe_parking_price_id) {
  lineItems.push({
    price: eventData.stripe_parking_price_id,
    quantity: parkingQuantity,
  });
}
```

#### `/api/refund-ticket/index.js`
**Status:** ⚠️ Minor - Hardcoded email sender

```javascript
// Line 163 - Hardcoded sender name
from: 'GameDay Tickets <tickets@gamedaytickets.io>',
```

For true white-label, you'd need to:
- Look up the event's organization
- Use org-specific sender name
- (Not critical for initial scaling)

---

### 📋 Frontend Changes Needed

#### `src/App.jsx` - EVENTS_DATA
**Status:** ⚠️ Hardcoded events

**Current:** Events are hardcoded in `EVENTS_DATA` array (lines 124-366)

**Recommended:** Fetch from Supabase API

```javascript
// Create new API: /api/get-events/index.js
export default async function handler(req, res) {
  const { org_id } = req.query;
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  let query = supabase
    .from('events')
    .select('*')
    .eq('status', 'active')
    .gte('event_date', new Date().toISOString().split('T')[0])
    .order('event_date', { ascending: true });
  
  if (org_id) {
    query = query.eq('org_id', org_id);
  }
  
  const { data, error } = await query;
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  return res.status(200).json(data);
}
```

---

## 🛡️ SECURITY CONSIDERATIONS

### Current Security
- ✅ Stripe webhook signature verification
- ✅ Scanner PIN validation per event
- ✅ CRON_SECRET for email worker
- ✅ Service role key for Supabase (not exposed to client)

### Recommended Additions (Phase 2)

1. **Row Level Security (RLS)** - Isolate provider data
```sql
-- Enable RLS on tickets
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Providers can only see their events' tickets
CREATE POLICY "Providers see own tickets" ON tickets
  FOR SELECT USING (
    event_id IN (
      SELECT id FROM events 
      WHERE org_id = auth.jwt()->>'org_id'
    )
  );
```

2. **Provider Authentication**
- Add Supabase Auth for providers
- Create provider dashboard with login
- Scope data access by organization

---

## 📈 SCALING CHECKLIST

### Phase 1: Add More Events (Immediate)
- [x] Database schema supports multiple events ✅
- [x] Webhook handles any event ✅
- [ ] **Fix `create-checkout` to use dynamic pricing** ⚠️
- [ ] Add Stripe Price IDs to events table
- [ ] Create events via SQL or admin UI

### Phase 2: Add More Providers (Next)
- [ ] Create `organizations` table
- [ ] Link events to organizations
- [ ] Build provider login/dashboard
- [ ] Add RLS policies for data isolation
- [ ] White-label email sender per org

### Phase 3: Self-Service (Future)
- [ ] Provider self-onboarding
- [ ] Event creation UI
- [ ] Stripe Connect for payouts
- [ ] Real-time analytics dashboard

---

## 🔧 IMMEDIATE ACTION ITEMS

### Priority 1: Fix Create-Checkout API (Required Now)

Your SoCal Cup events (IDs 4-19) won't work for checkout because the pricing is hardcoded. Fix this:

```bash
# File to update:
api/create-checkout/index.js
```

Replace hardcoded `eventPricing` with database lookup (see code above).

### Priority 2: Add Stripe Price IDs to Events Table

For each SoCal Cup event, you need to:
1. Create 2 products in Stripe Dashboard (Admission, Parking)
2. Create prices for each product
3. Update the `events` table with price IDs:

```sql
-- Example for Event 4
UPDATE events 
SET 
  stripe_admission_price_id = 'price_xxxxx',
  stripe_parking_price_id = 'price_yyyyy'
WHERE id = '4';
```

### Priority 3: Test Full Flow

After updates:
1. Create test checkout for SoCal Cup event
2. Complete payment with test card
3. Verify ticket appears in `tickets` table with correct `event_id`
4. Verify email is queued and sent
5. Test scanner with event-specific PIN

---

## 📊 Data Flow Diagram

```
                         ┌───────────────────┐
                         │   BUYER (Parent)  │
                         └─────────┬─────────┘
                                   │
                         ┌─────────▼─────────┐
                         │  Portal Frontend  │
                         │  /org/socal-cup   │
                         └─────────┬─────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  POST /api/create-checkout  │
                    │  - Looks up event pricing   │
                    │  - Creates Stripe session   │
                    │  - Passes eventId metadata  │
                    └──────────────┬──────────────┘
                                   │
                         ┌─────────▼─────────┐
                         │  Stripe Checkout  │
                         │  (Customer pays)  │
                         └─────────┬─────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  POST /api/stripe-webhook   │
                    │  - Extracts eventId         │
                    │  - Creates tickets          │
                    │  - Queues emails            │
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
    ┌─────────▼─────────┐ ┌───────▼────────┐ ┌────────▼────────┐
    │   tickets table   │ │  email_queue   │ │ Stripe Payment  │
    │  (event_id: 4)    │ │  (pending)     │ │   (completed)   │
    └───────────────────┘ └───────┬────────┘ └─────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │  CRON: process-email-queue │
                    │  - Generates QR codes      │
                    │  - Sends emails            │
                    └─────────────┬─────────────┘
                                  │
                         ┌────────▼────────┐
                         │   Buyer Email   │
                         │  (QR Codes)     │
                         └────────┬────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │    EVENT DAY: Scanner     │
                    │  - POST /api/scan-ticket  │
                    │  - Validates event PIN    │
                    │  - Marks ticket as used   │
                    └───────────────────────────┘
```

---

## ✅ Conclusion

**Your platform is architecturally sound for scaling.** The main changes needed are:

1. **One API fix** (`create-checkout`) - Convert from hardcoded to database-driven pricing
2. **Database updates** - Add Stripe Price IDs to events table
3. **Future: Organizations table** - For true multi-tenant isolation

You do NOT need:
- Separate webhooks per event
- Separate tables per event
- Major architectural changes

The foundation is solid! 🎉

