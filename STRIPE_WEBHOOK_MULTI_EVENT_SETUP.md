# Stripe Webhook Setup for Multiple Events

## ✅ Good News: You Only Need ONE Webhook!

**You do NOT need separate webhooks for each event.** The webhook is already designed to handle multiple events automatically.

## How It Works

### 1. Single Webhook Endpoint
- **One webhook URL** handles ALL events: `https://gamedaytickets.io/api/stripe-webhook`
- The webhook reads the `eventId` from Stripe session metadata
- It automatically routes tickets to the correct event in your database

### 2. Event ID in Metadata
When a customer checks out:
1. Frontend sends `eventId` (e.g., `4` for SoCal Cup: 12-18 Friendly)
2. `create-checkout` API includes `eventId` in Stripe session metadata
3. Webhook reads `eventId` from metadata and stores tickets with that event ID

### 3. Database Storage
- All tickets are stored in the same `tickets` table
- Each ticket has an `event_id` column that identifies which event it belongs to
- You can filter by `event_id` to see tickets for specific events

## Current Setup Status

### ✅ Already Working
- Webhook reads `eventId` from metadata (line 278 in `api/stripe-webhook/index.js`)
- Tickets are stored with correct `event_id` (line 316)
- Works for any event ID (1, 2, 3, 4, 5, ... 19, etc.)

### ⚠️ Needs Update: Stripe Price IDs
The `create-checkout` API currently only has Price IDs for events 1-3. You need to add SoCal Cup events (4-19).

**File**: `api/create-checkout/index.js`

**Current Code** (lines 60-73):
```javascript
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

**You Need to Add** (events 4-19):
```javascript
const eventPricing = {
  // ... existing 1-3 ...
  4: {
    admission: process.env.SOCAL_CUP_EVENT_4_ADMISSION_PRICE_ID,
    parking: process.env.SOCAL_CUP_EVENT_4_PARKING_PRICE_ID,
  },
  5: {
    admission: process.env.SOCAL_CUP_EVENT_5_ADMISSION_PRICE_ID,
    parking: process.env.SOCAL_CUP_EVENT_5_PARKING_PRICE_ID,
  },
  // ... continue for all 16 events (4-19) ...
};
```

## Setup Steps for SoCal Cup

### Step 1: Create Stripe Prices
For each of the 16 SoCal Cup events, create 2 Stripe Prices:
1. **General Admission** price ($15.00)
2. **Parking Pass** price ($15.00)

**How to Create:**
1. Go to Stripe Dashboard → Products → Create Price
2. Set amount: $15.00
3. Set currency: USD
4. Copy the Price ID (starts with `price_`)
5. Save it for the next step

### Step 2: Add Environment Variables
Add Price IDs to your environment variables (Vercel Dashboard or `.env.local`):

```bash
# SoCal Cup Event 4 (12-18 Friendly)
SOCAL_CUP_EVENT_4_ADMISSION_PRICE_ID=price_xxxxx
SOCAL_CUP_EVENT_4_PARKING_PRICE_ID=price_xxxxx

# SoCal Cup Event 5 (14/13 Tourney 2)
SOCAL_CUP_EVENT_5_ADMISSION_PRICE_ID=price_xxxxx
SOCAL_CUP_EVENT_5_PARKING_PRICE_ID=price_xxxxx

# ... continue for all 16 events ...
```

### Step 3: Update create-checkout API
Update `api/create-checkout/index.js` to include all SoCal Cup events (4-19).

### Step 4: Test
1. Make a test purchase for a SoCal Cup event
2. Check webhook logs to verify `eventId` is correct
3. Check Supabase to verify ticket has correct `event_id`

## Webhook Configuration

### Production Webhook
- **URL**: `https://gamedaytickets.io/api/stripe-webhook`
- **Events**: `checkout.session.completed`
- **Status**: Active

### Testing Webhook
- **URL**: `https://your-vercel-deployment.vercel.app/api/stripe-webhook`
- **Events**: `checkout.session.completed`
- **Status**: Active (for testing)

### Local Testing
```bash
# Start Stripe CLI listener
stripe listen --forward-to localhost:3001/api/stripe-webhook

# Trigger test event
stripe trigger checkout.session.completed
```

## How Multiple Events Work Together

### Example Flow:
1. **Customer buys SoCal Cup Event 4 ticket**
   - Frontend: `eventId = 4`
   - Stripe Session Metadata: `{ eventId: "4" }`
   - Webhook reads: `eventId = 4`
   - Database: Ticket stored with `event_id = 4`

2. **Customer buys SoCal Cup Event 5 ticket**
   - Frontend: `eventId = 5`
   - Stripe Session Metadata: `{ eventId: "5" }`
   - Webhook reads: `eventId = 5`
   - Database: Ticket stored with `event_id = 5`

3. **Both tickets in same table, different `event_id`**
   - Query Event 4 tickets: `SELECT * FROM tickets WHERE event_id = 4`
   - Query Event 5 tickets: `SELECT * FROM tickets WHERE event_id = 5`
   - Query all SoCal Cup: `SELECT * FROM tickets WHERE event_id BETWEEN 4 AND 19`

## Verification Checklist

- [ ] Webhook endpoint is set in Stripe Dashboard
- [ ] Webhook secret is in environment variables
- [ ] Stripe Prices created for all SoCal Cup events (4-19)
- [ ] Environment variables added for all Price IDs
- [ ] `create-checkout` API updated with all event Price mappings
- [ ] Test purchase made for at least one SoCal Cup event
- [ ] Webhook logs show correct `eventId`
- [ ] Supabase shows ticket with correct `event_id`
- [ ] Email delivered with correct event info

## Troubleshooting

### Webhook Not Firing
- Check Stripe Dashboard → Webhooks → Recent deliveries
- Verify endpoint URL is correct
- Check webhook secret matches environment variable

### Wrong Event ID
- Check `create-checkout` logs for metadata
- Verify `eventId` is being passed correctly
- Check webhook logs for parsed `eventId`

### Tickets Not Appearing
- Check Supabase `tickets` table
- Filter by `event_id` to find specific event tickets
- Check webhook logs for errors
- Verify database schema matches webhook expectations

## Summary

✅ **One webhook handles all events** - no need for event-specific webhooks
✅ **Event ID in metadata** - automatically routes to correct event
✅ **Same database table** - all tickets stored together, filtered by `event_id`
⚠️ **Need to add Price IDs** - update `create-checkout` with SoCal Cup Price IDs

The architecture is already set up for multiple events. You just need to:
1. Create Stripe Prices for SoCal Cup events
2. Add Price IDs to environment variables
3. Update `create-checkout` API with Price mappings

That's it! The webhook will automatically handle everything else.

