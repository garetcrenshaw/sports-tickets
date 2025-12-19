# 🏗️ MULTI-EVENT BUSINESS INTELLIGENCE ARCHITECTURE

## Strategic Decision: Database Design for Multi-Event Platform

---

## 🎯 YOUR QUESTION: Separate Tables vs Unified Tables?

### **RECOMMENDATION: Keep Unified Tables with Event-Specific Views** ✅

Here's why this is the BEST approach for your use case:

---

## 📊 ARCHITECTURE DECISION

### ❌ DON'T DO: Separate Tables Per Event

```
Bad Approach:
├─ tickets_gameday_empire
├─ tickets_sportsplex_showdown  
├─ tickets_sportsplex_event
├─ email_queue_gameday_empire
├─ email_queue_sportsplex_showdown
└─ email_queue_sportsplex_event
```

**Why this is bad:**
- ❌ Code duplication (need 3x webhook handlers)
- ❌ Harder to scale (add event = change code)
- ❌ Complex n8n workflows (need separate automation per event)
- ❌ Difficult cross-event analytics
- ❌ More maintenance overhead

---

### ✅ DO THIS: Unified Tables with Event Metadata

```
Good Approach (Current):
├─ tickets (event_id column differentiates)
├─ email_queue (event_id column)
├─ events (master event registry) ← NEW
└─ event_pins (PIN per event) ← NEW
```

**Why this is better:**
- ✅ Single webhook handles all events
- ✅ Add new events without code changes
- ✅ Easy cross-event analytics
- ✅ One n8n workflow handles all events
- ✅ Scalable to 100+ events

---

## 🏗️ PROPOSED DATABASE SCHEMA

### Table 1: `events` (Master Event Registry) - NEW

```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,                    -- "1", "2", "3"
  event_name TEXT NOT NULL,               -- "Gameday Empire Showcase"
  event_slug TEXT UNIQUE NOT NULL,        -- "gameday-empire-showcase"
  event_date DATE NOT NULL,               -- 2025-12-28
  event_time TIME,                        -- 19:30:00
  venue_name TEXT,                        -- "Downtown Arena"
  venue_city TEXT,                        -- "Los Angeles, CA"
  category TEXT,                          -- "Basketball", "Sports"
  
  -- Product Configuration
  has_admission BOOLEAN DEFAULT false,
  admission_price DECIMAL(10,2),          -- 15.00
  stripe_admission_price_id TEXT,         -- price_XXX
  
  has_parking BOOLEAN DEFAULT false,
  parking_price DECIMAL(10,2),            -- 15.00
  stripe_parking_price_id TEXT,           -- price_XXX
  
  -- Scanner Access
  scanner_pin TEXT NOT NULL,              -- "1234" (unique per event)
  
  -- Business Intelligence
  owner_email TEXT NOT NULL,              -- "garetcrenshaw@gmail.com"
  customer_name TEXT,                     -- "John's Sports Arena"
  
  -- Status
  status TEXT DEFAULT 'active',           -- active, ended, cancelled
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table 2: `tickets` (Keep Current, Add Columns) - ENHANCED

```sql
-- Your existing table with additions:
ALTER TABLE tickets 
ADD COLUMN event_name TEXT,                -- Denormalized for easy exports
ADD COLUMN event_date DATE,                -- For filtering/reporting
ADD COLUMN customer_name TEXT;             -- If B2B, who bought platform access
```

### Table 3: `event_pins` (Scanner Authentication) - NEW

```sql
CREATE TABLE event_pins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT REFERENCES events(id) NOT NULL,
  pin_code TEXT NOT NULL,                 -- "1234"
  pin_type TEXT DEFAULT 'scanner',        -- scanner, admin, manager
  created_by TEXT,                        -- email of creator
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP                    -- Optional: time-limited PINs
);

-- Composite unique constraint: one PIN per event
CREATE UNIQUE INDEX idx_event_pin ON event_pins(event_id, pin_code) 
WHERE is_active = true;
```

### Table 4: `event_customers` (B2B Relationship Tracking) - NEW

```sql
CREATE TABLE event_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,            -- "John's Sports Arena"
  customer_email TEXT NOT NULL,           -- Where to send reports
  contact_phone TEXT,
  
  -- Billing
  subscription_tier TEXT,                 -- "basic", "pro", "enterprise"
  pricing_model TEXT,                     -- "per_ticket", "flat_fee", "revenue_share"
  
  -- Status
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Link events to customers
ALTER TABLE events
ADD COLUMN customer_id UUID REFERENCES event_customers(id);
```

---

## 🔐 EVENT-SPECIFIC PIN SYSTEM

### How It Works:

1. **Each event has a unique PIN** (stored in `events.scanner_pin`)
2. **Scanner checks PIN + Event context** before showing tickets
3. **Staff can only see their event's tickets**

### Scanner Flow:

```
Staff opens /scan
  ↓
Enter PIN: "1234"
  ↓
System checks: Which event has PIN "1234"?
  ↓
Found: Event ID "2" (Sportsplex Showdown)
  ↓
Scanner now ONLY shows tickets where event_id = "2"
  ↓
Staff scans QR code
  ↓
Validates ticket belongs to event_id "2"
```

### Implementation:

```javascript
// New API: /api/validate-pin
// Returns: { eventId, eventName, permissions }

// Updated /scan page:
// 1. Ask for PIN first
// 2. Store eventId in session
// 3. Filter all ticket queries by eventId
```

---

## 📤 N8N INTEGRATION STRATEGY

### Recommended Workflow: **Single n8n Workflow for All Events**

```
Trigger: Supabase Webhook (on ticket insert)
  ↓
Filter by event_id
  ↓
Get event details from events table
  ↓
Get customer details from event_customers table
  ↓
Aggregate tickets by event
  ↓
Generate Google Sheets row:
  - Event Name
  - Customer Name
  - Ticket Count
  - Revenue
  - Date/Time
  ↓
Email to customer_email with:
  - Attached spreadsheet
  - Summary stats
  - Download link to full report
```

### N8N Nodes Needed:

1. **Supabase Trigger** - Listen for new tickets
2. **Supabase Query** - Get event + customer details
3. **Aggregate** - Group tickets by event
4. **Google Sheets** - Create/update spreadsheet
5. **Gmail/SendGrid** - Email customer with report
6. **Schedule Trigger** - Daily/weekly automated reports

### Data Export Format:

```
Event Name,Customer,Ticket Type,Quantity,Revenue,Date Sold,Status
"Gameday Empire","Self",Admission,10,$150.00,2025-12-18,active
"Gameday Empire","Self",Parking,8,$120.00,2025-12-18,active
"Sportsplex Showdown","John's Arena",Parking,15,$225.00,2025-12-18,active
"Sportsplex Event","John's Arena",Admission,50,$750.00,2025-12-18,active
```

---

## 🎯 BUSINESS INTELLIGENCE QUERIES

### Query 1: Revenue by Event

```sql
SELECT 
  e.event_name,
  e.event_date,
  ec.customer_name,
  COUNT(t.id) as total_tickets,
  SUM(CASE WHEN t.ticket_type LIKE '%Admission%' THEN e.admission_price ELSE 0 END) +
  SUM(CASE WHEN t.ticket_type LIKE '%Parking%' THEN e.parking_price ELSE 0 END) as total_revenue,
  COUNT(CASE WHEN t.status = 'used' THEN 1 END) as scanned_count,
  ROUND(COUNT(CASE WHEN t.status = 'used' THEN 1 END)::NUMERIC / COUNT(t.id) * 100, 2) as scan_rate_percent
FROM tickets t
LEFT JOIN events e ON t.event_id = e.id
LEFT JOIN event_customers ec ON e.customer_id = ec.id
WHERE e.event_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY e.id, e.event_name, e.event_date, ec.customer_name
ORDER BY e.event_date DESC;
```

### Query 2: Customer Performance Dashboard

```sql
SELECT 
  ec.customer_name,
  ec.customer_email,
  COUNT(DISTINCT e.id) as total_events,
  COUNT(t.id) as total_tickets_sold,
  SUM(
    CASE WHEN t.ticket_type LIKE '%Admission%' THEN e.admission_price ELSE 0 END +
    CASE WHEN t.ticket_type LIKE '%Parking%' THEN e.parking_price ELSE 0 END
  ) as total_revenue
FROM event_customers ec
LEFT JOIN events e ON e.customer_id = ec.id
LEFT JOIN tickets t ON t.event_id = e.id
WHERE ec.status = 'active'
GROUP BY ec.id, ec.customer_name, ec.customer_email
ORDER BY total_revenue DESC;
```

### Query 3: Daily Sales Report (For n8n Automation)

```sql
SELECT 
  t.created_at::DATE as sale_date,
  e.event_name,
  e.id as event_id,
  ec.customer_name,
  ec.customer_email as send_report_to,
  t.ticket_type,
  COUNT(*) as quantity,
  SUM(
    CASE 
      WHEN t.ticket_type LIKE '%Admission%' THEN e.admission_price 
      WHEN t.ticket_type LIKE '%Parking%' THEN e.parking_price 
      ELSE 0 
    END
  ) as revenue
FROM tickets t
JOIN events e ON t.event_id = e.id
LEFT JOIN event_customers ec ON e.customer_id = ec.id
WHERE t.created_at::DATE = CURRENT_DATE
GROUP BY t.created_at::DATE, e.event_name, e.id, ec.customer_name, ec.customer_email, t.ticket_type
ORDER BY e.event_name, t.ticket_type;
```

---

## 🚀 IMPLEMENTATION PLAN

### Phase 2A: Create New Tables (10 min)

```bash
# Run in Supabase SQL Editor:
1. Create events table
2. Create event_pins table
3. Create event_customers table
4. Alter tickets table (add columns)
5. Populate events table with your 3 events
```

### Phase 2B: Implement Event-Specific PINs (20 min)

```bash
1. Create API: /api/validate-event-pin
2. Update /scan page to ask for PIN first
3. Filter scanner queries by event_id
4. Add PIN management UI (optional)
```

### Phase 2C: Set Up n8n Integration (30 min)

```bash
1. Install n8n (cloud or self-hosted)
2. Create Supabase webhook trigger
3. Build workflow (see diagram above)
4. Test with sample data
5. Schedule automated reports
```

---

## 📊 RECOMMENDED APPROACH FOR YOUR USE CASE

### For B2B SaaS Model (Selling Platform to Event Organizers):

**Database Structure:**
```
event_customers (your B2B clients)
  ↓ has many
events (their events)
  ↓ has many
tickets (attendees)
```

**n8n Workflow:**
```
Every night at 11 PM:
  1. Query tickets sold today (grouped by customer)
  2. Generate spreadsheet per customer
  3. Email each customer their report
  4. Also send you (platform owner) a master report
```

**Sample Email (Automated):**
```
To: john@sportsarena.com
Subject: Daily Ticket Sales Report - Sportsplex Showdown

Hi John,

Here's your ticket sales report for December 18, 2025:

Event: Sportsplex Showdown
- Parking Passes Sold: 15
- Total Revenue: $225.00
- Scan Rate: 87%

Attached: Full spreadsheet with ticket details

Best regards,
Gameday Tickets Platform
```

---

## ✅ RECOMMENDED NEXT STEPS

### Step 1: Choose Your Business Model

**Option A: Self-Hosted (You run all events)**
- Skip event_customers table
- All events have `owner_email = your email`
- n8n sends reports to you only

**Option B: B2B SaaS (You sell platform to others)**
- Use full schema with event_customers
- Each customer gets their own reports
- You get master reports for all events

### Step 2: Implement in This Order

1. ✅ **Create `events` table** (10 min) - Foundation for everything
2. ✅ **Create `event_pins` table** (5 min) - Scanner security
3. ✅ **Update scanner to use PINs** (20 min) - Event isolation
4. ⏭️ **Set up n8n** (30 min) - Automated reporting
5. ⏭️ **Create event_customers** (if B2B) (10 min) - Client management

---

## 🎯 MY RECOMMENDATION

**Start with "Self-Hosted" model:**

1. Create `events` table with your 3 events
2. Add unique PINs per event
3. Update scanner to require PIN
4. Set up ONE n8n workflow that emails YOU reports

**Later scale to "B2B SaaS":**

1. Add `event_customers` table
2. Update n8n to email each customer
3. Add customer dashboard (future feature)

This keeps things simple now, easy to scale later.

---

**Want me to create the SQL scripts to set this up?** 

I can give you:
1. All CREATE TABLE statements
2. INSERT statements for your 3 events
3. Updated scanner PIN validation
4. n8n workflow template

Let me know which business model fits you best!

