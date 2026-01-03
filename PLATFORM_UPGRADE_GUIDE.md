# 🚀 Platform Upgrade - January 2026

## What's New

### 1. ✅ All-In Pricing (California Compliant)
- **Price shown = Price charged** - No separate fees
- Ticket price: **$17** all-in
- Business gets: **$15**
- Platform gets: **~$1** (after Stripe 2.9% + $0.30)

### 2. 📱 SMS Ticket Delivery
- Tickets sent via text message (not email)
- Link opens mobile ticket viewer with swipeable cards
- QR codes generated for scanning at gate

---

## Setup Steps

### Step 1: Install Dependencies

```bash
cd /Users/garetcrenshaw/Desktop/sports-tickets
npm install twilio
```

### Step 2: Set Up Twilio

1. **Create Twilio Account**: https://www.twilio.com/try-twilio
2. **Get a Phone Number**: Purchase a phone number for sending SMS
3. **Find Your Credentials**: 
   - Account SID: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Auth Token: `your_auth_token`
   - Phone Number: `+1XXXXXXXXXX`

4. **Add to Environment Variables** (Vercel Dashboard → Settings → Environment Variables):

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15551234567
```

### Step 3: Update Stripe Products (All-In Pricing)

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/products

2. **Create New Products** (or update existing):

   **SoCal Cup - General Admission ($17)**
   - Name: `SoCal Cup - General Admission`
   - Price: `$17.00` (one-time)
   - Copy the Price ID: `price_xxxxxxxxx`

   **SoCal Cup - Parking Pass ($17)**
   - Name: `SoCal Cup - Parking Pass`  
   - Price: `$17.00` (one-time)
   - Copy the Price ID: `price_yyyyyyyyy`

### Step 4: Update Supabase Database

1. **Go to Supabase**: https://supabase.com/dashboard
2. **Open SQL Editor**
3. **Run the upgrade SQL**:

```sql
-- Add phone column to tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS buyer_phone TEXT;

-- Update prices (replace price IDs with yours)
UPDATE events 
SET 
  admission_price = 17.00,
  parking_price = 17.00,
  stripe_admission_price_id = 'price_YOUR_ADMISSION_ID',
  stripe_parking_price_id = 'price_YOUR_PARKING_ID'
WHERE event_name LIKE '%SoCal Cup%';
```

### Step 5: Deploy

```bash
npm run deploy
```

---

## How It Works

### Purchase Flow
```
1. Customer enters name + phone number
2. Selects tickets/parking
3. Sees all-in total ($17 per item)
4. Pays via Stripe Checkout
5. Stripe webhook fires
6. System:
   - Creates ticket records in Supabase
   - Generates QR codes
   - Sends SMS with ticket link
7. Customer receives text: "🎟️ Your tickets are ready! [link]"
8. Link opens swipeable ticket viewer
```

### SMS Format
```
🎟️ Hey [Name]! Your [N] tickets for [Event] are ready.

View tickets: https://gamedaytickets.io/tickets?order=cs_xxx

Show the QR code at entry. See you there!
```

---

## Revenue Breakdown

For a **$17 ticket**:

| Item | Amount |
|------|--------|
| Customer Pays | $17.00 |
| Stripe Fee (2.9% + $0.30) | -$0.79 |
| Net to Platform | $16.21 |
| Business Share | -$15.00 |
| **Platform Profit** | **$1.21** |

---

## Testing

1. **Local Test**: 
   ```bash
   npm run dev
   ```
   Go to: http://localhost:3000/org/socal-cup

2. **Test Purchase**:
   - Use phone: Your actual phone number
   - Use card: `4242 4242 4242 4242`
   - You should receive a text with ticket link

3. **View Tickets**:
   - Click the link in SMS
   - Swipe through tickets
   - Test QR scanning with validate page

---

## Troubleshooting

### SMS Not Sending?
- Check Twilio credentials in Vercel env vars
- Verify phone number format includes country code (+1)
- Check Twilio dashboard for error logs

### QR Codes Not Showing?
- Verify Supabase storage bucket `qr-codes` exists and is public
- Check webhook logs for QR generation errors

### Price Wrong in Checkout?
- Confirm Stripe Price IDs are correct in events table
- Check that legacy pricing fallback isn't being used

