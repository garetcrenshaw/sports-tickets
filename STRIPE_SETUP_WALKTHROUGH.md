# 💳 Stripe Setup Walkthrough - $17 All-In Products

## 🎯 Goal
Create two products in Stripe:
1. **SoCal Cup - General Admission** ($17.00)
2. **SoCal Cup - Parking Pass** ($17.00)

Then update Supabase with the Price IDs.

---

## Step 1: Go to Stripe Products

1. **Open**: https://dashboard.stripe.com/products
2. **Click**: **"+ Add product"** (top right)

---

## Step 2: Create General Admission Product

### Product Details
- **Name**: `SoCal Cup - General Admission`
- **Description**: `General admission ticket for SoCal Cup volleyball events`

### Pricing
- **Pricing model**: `Standard pricing`
- **Price**: `$17.00`
- **Currency**: `USD` (United States Dollar)
- **Billing period**: `One time` (not recurring)

### Click **"Save product"**

### ✅ Copy the Price ID
After saving, you'll see a **Price ID** that looks like:
```
price_1Qxxxxxxxxxxxxxxxxxxxxx
```
**Copy this!** You'll need it for Supabase.

---

## Step 3: Create Parking Pass Product

1. **Click**: **"+ Add product"** again

### Product Details
- **Name**: `SoCal Cup - Parking Pass`
- **Description**: `Parking pass for SoCal Cup volleyball events`

### Pricing
- **Pricing model**: `Standard pricing`
- **Price**: `$17.00`
- **Currency**: `USD`
- **Billing period**: `One time`

### Click **"Save product"**

### ✅ Copy the Price ID
Copy the second Price ID (different from the first one).

---

## Step 4: Update Supabase Database

1. **Go to**: https://supabase.com/dashboard
2. **Select** your project
3. **Go to**: SQL Editor
4. **Run this SQL** (replace with your actual Price IDs):

```sql
-- Update all SoCal Cup events with $17 pricing and Stripe Price IDs
UPDATE events 
SET 
  admission_price = 17.00,
  parking_price = 17.00,
  stripe_admission_price_id = 'price_YOUR_ADMISSION_PRICE_ID_HERE',
  stripe_parking_price_id = 'price_YOUR_PARKING_PRICE_ID_HERE'
WHERE event_name LIKE '%SoCal Cup%';
```

**Example** (with fake IDs):
```sql
UPDATE events 
SET 
  admission_price = 17.00,
  parking_price = 17.00,
  stripe_admission_price_id = 'price_1QaBcDeFgHiJkLmNoPqRsTu',
  stripe_parking_price_id = 'price_1XyZaBcDeFgHiJkLmNoPqRs'
WHERE event_name LIKE '%SoCal Cup%';
```

5. **Click**: "Run" (or press Cmd+Enter)
6. **Verify**: You should see "Success. No rows returned" or a count of updated rows

---

## Step 5: Verify It Worked

Run this query to check:

```sql
SELECT 
  event_name,
  admission_price,
  parking_price,
  stripe_admission_price_id,
  stripe_parking_price_id
FROM events
WHERE event_name LIKE '%SoCal Cup%'
ORDER BY event_date
LIMIT 5;
```

You should see:
- `admission_price`: `17.00`
- `parking_price`: `17.00`
- `stripe_admission_price_id`: `price_1...` (your ID)
- `stripe_parking_price_id`: `price_1...` (your ID)

---

## 🎉 Done!

Your Stripe products are now connected to your events. When customers buy tickets:
- They'll be charged **$17** (all-in)
- Stripe will process the payment
- Your webhook will create tickets and send SMS

---

## Troubleshooting

### "Price ID not found"
- ✅ Make sure you copied the **Price ID** (starts with `price_`)
- ✅ Not the Product ID (starts with `prod_`)
- ✅ Check for typos in the SQL

### "Events not updating"
- ✅ Make sure the `WHERE` clause matches: `event_name LIKE '%SoCal Cup%'`
- ✅ Check that your events table has the `stripe_admission_price_id` column
- ✅ Run the verification query to see what's in the database

### "Wrong price in checkout"
- ✅ Clear your browser cache
- ✅ Redeploy your Vercel app
- ✅ Check that `create-checkout` API is reading from database (not hardcoded)

---

## Next Steps

Once Stripe is set up:
1. ✅ Test a purchase (use test card: `4242 4242 4242 4242`)
2. ✅ Verify SMS is sent (after Twilio verification)
3. ✅ Check ticket viewing page works

**You're almost ready to launch! 🚀**

