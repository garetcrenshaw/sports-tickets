# 🚀 PHASE 2 IMPLEMENTATION - Step by Step

## ✅ Pre-Deployment UX Changes - DEPLOYED!

**Just deployed:**
1. ✅ Removed "Doors open at 6:00 PM" bullet from success page
2. ✅ Parking emails now sent FIRST, then admission (sorted in webhook)
3. ✅ Complete Purchase button already has matching style

**Test URL:** https://sports-tickets-nstf8k7cy-garetcrenshaw-9092s-projects.vercel.app

---

## 🎯 PHASE 2: BUSINESS INTELLIGENCE SETUP (30 Minutes)

### Step 1: Create Events Table in Supabase (5 min)

**Instructions:**

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy/paste the entire contents of `phase2-setup.sql`
6. **IMPORTANT:** Before running, update lines 101 & 107 with your actual Price IDs:

```sql
-- Line 101 (Event 1 Admission):
'YOUR_GA_PRICE_ID_HERE',  -- Replace with actual GA_PRICE_ID

-- Line 107 (Event 1 Parking):
'YOUR_PARKING_PRICE_ID_HERE',  -- Replace with actual PARKING_PRICE_ID
```

7. Click **Run** (or press Cmd+Enter / Ctrl+Enter)
8. You should see: "Success. No rows returned"

**What This Creates:**
- ✅ `events` table (your 3 events)
- ✅ Event-specific PINs (1234, 5678, 9012)
- ✅ Enhanced `tickets` table with event metadata
- ✅ 3 views for business intelligence:
  - `revenue_by_event`
  - `daily_sales_summary`
  - `event_performance_dashboard`

---

### Step 2: Verify Setup (2 min)

**Run these queries in SQL Editor:**

```sql
-- Check your 3 events
SELECT id, event_name, event_date, scanner_pin FROM events;

-- Expected output:
-- id | event_name                | event_date | scanner_pin
-- 1  | Gameday Empire Showcase   | 2025-12-28 | 1234
-- 2  | Sportsplex Showdown       | 2026-01-05 | 5678
-- 3  | Sportsplex Event          | 2026-01-11 | 9012
```

```sql
-- Check revenue dashboard
SELECT * FROM event_performance_dashboard;

-- Should show your 3 events with current ticket counts
```

---

### Step 3: Get Your Event 1 Price IDs (2 min)

If you don't have them, check Vercel environment:

```bash
cd /Users/garetcrenshaw/Desktop/sports-tickets
vercel env ls | grep -E "GA_PRICE_ID|PARKING_PRICE_ID"
```

Or go to: https://dashboard.stripe.com/products

Find:
- Event 1 Admission: `price_XXX`
- Event 1 Parking: `price_XXX`

Then update the SQL and re-run the INSERT for Event 1.

---

### Step 4: Update Scanner to Use Event-Specific PINs (15 min)

I'll create the API and update the scanner page now...

---

### Step 5: Create Daily Email Report Script (10 min)

I'll create an automated daily report that emails you...

---

## 📊 WHAT YOU'LL GET

### 1. Event Management
```sql
-- Add new event (no code changes needed!)
INSERT INTO events (id, event_name, event_date, scanner_pin, ...)
VALUES ('4', 'New Event', '2026-02-15', '3456', ...);
```

### 2. Business Intelligence Queries

**Revenue by Event:**
```sql
SELECT * FROM revenue_by_event;
```

**Output:**
```
event_name                | total_tickets | total_revenue | scan_rate
Gameday Empire Showcase   | 25           | $375.00       | 85%
Sportsplex Showdown       | 15           | $225.00       | 92%
Sportsplex Event          | 50           | $750.00       | 88%
```

**Daily Sales:**
```sql
SELECT * FROM daily_sales_summary WHERE sale_date = CURRENT_DATE;
```

**Event Performance:**
```sql
SELECT event_name, total_revenue, scan_rate 
FROM event_performance_dashboard 
WHERE event_date >= CURRENT_DATE
ORDER BY event_date;
```

### 3. Export Data (For n8n/Spreadsheets)

```sql
-- Export today's sales for Google Sheets
SELECT 
  e.event_name,
  t.ticket_type,
  t.buyer_name,
  t.buyer_email,
  t.created_at::DATE as purchase_date,
  CASE 
    WHEN t.ticket_type LIKE '%Admission%' THEN e.admission_price
    WHEN t.ticket_type LIKE '%Parking%' THEN e.parking_price
  END as price,
  t.status
FROM tickets t
JOIN events e ON t.event_id = e.id
WHERE t.created_at::DATE = CURRENT_DATE
ORDER BY e.event_name, t.ticket_type, t.created_at;
```

### 4. Scanner Security (Event-Specific)

Each event has unique PIN:
- Event 1: PIN `1234` - Only sees Gameday Empire tickets
- Event 2: PIN `5678` - Only sees Sportsplex Showdown tickets
- Event 3: PIN `9012` - Only sees Sportsplex Event tickets

Staff cannot see tickets from other events.

---

## 🔄 NEXT STEPS (Choose Your Priority)

### Option A: Scanner PIN System First (Recommended)
- Most important for event weekend
- Prevents staff from scanning wrong event's tickets
- Takes 15 minutes to implement

### Option B: Daily Email Reports First
- Get automated reports starting tomorrow
- Less urgent if you can query Supabase manually
- Takes 10 minutes to set up

### Option C: n8n Integration (Advanced)
- Automated Google Sheets export
- Email reports to multiple stakeholders
- Takes 30 minutes (requires n8n account)

---

## 🎯 MY RECOMMENDATION

**Do in this order:**

1. ✅ **Run `phase2-setup.sql` NOW** (5 min)
   - Creates events table
   - Sets up views for reporting
   - Foundation for everything

2. **Update Scanner with PIN validation** (15 min)
   - Critical for event weekend
   - I'll implement this next

3. **Test with a purchase** (5 min)
   - Make sure event_name auto-populates
   - Verify views work

4. **Set up daily email reports** (10 min)
   - Automated reporting
   - Can wait until after testing

5. **n8n integration** (when ready)
   - Scale to multiple customers
   - Not urgent for your 3 events

---

## 📞 READY TO PROCEED?

**Tell me:**

1. ✅ "I've run the SQL, events table is created"
2. Then I'll implement scanner PIN validation
3. Then I'll create the daily report automation

**Or:**

- "Wait, I need help with step X"
- "Can you explain Y more?"
- "Let's do Z first instead"

---

**The SQL is ready. Just need to run it in Supabase SQL Editor!** 

Want me to walk you through it, or should I proceed with creating the scanner PIN system?

