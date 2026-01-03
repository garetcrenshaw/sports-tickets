# 📱 Twilio Setup Guide - Step by Step

## ✅ We're Using "With Code" (Already Built!)

The SMS sending code is **already implemented** in `api/send-sms/index.js`. You just need to:
1. Create Twilio account
2. Get credentials
3. Add to Vercel

---

## Step-by-Step Setup

### Step 1: Create Twilio Account

1. **Go to**: https://www.twilio.com/try-twilio
2. **Sign up** with your email
3. **Verify your email** (check inbox)
4. **Verify your phone** (they'll send a code)

### Step 2: Get Your Account Credentials

Once logged in, you'll see your **Twilio Console Dashboard**.

**Find these 3 things:**

1. **Account SID** (starts with `AC`)
   - Location: Dashboard → Account Info (top right)
   - Looks like: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Copy this!

2. **Auth Token**
   - Location: Dashboard → Account Info → Auth Token
   - Click "View" to reveal it
   - Copy this! (You can only see it once, so save it)

3. **Phone Number** (you'll get this in Step 3)

### Step 3: Get a Phone Number

1. **Go to**: https://console.twilio.com/us1/develop/phone-numbers/manage/search
2. **Click**: "Buy a number" (or "Get a number" for trial)
3. **Choose**:
   - Country: United States
   - Capabilities: ✅ SMS
   - Click "Search"
4. **Select** a number (trial accounts get a free number)
5. **Click "Buy"** (or "Get" for trial)
6. **Copy the number** (format: `+15551234567`)

> **Note**: Trial accounts can only send SMS to **verified phone numbers**. To send to any number, upgrade to a paid account (~$1/month + usage).

### Step 4: Add Credentials to Vercel

1. **Go to**: https://vercel.com/dashboard
2. **Select** your `sports-tickets` project
3. **Go to**: Settings → Environment Variables
4. **Add these 3 variables**:

| Name | Value | Example |
|------|-------|---------|
| `TWILIO_ACCOUNT_SID` | Your Account SID | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Your Auth Token | `your_auth_token_here` |
| `TWILIO_PHONE_NUMBER` | Your phone number | `+15551234567` |

5. **Select**: All environments (Production, Preview, Development)
6. **Click**: "Save"
7. **Redeploy** your app (or it will auto-deploy on next push)

---

## Testing

### Test Locally (Optional)

1. **Create `.env.local`** in project root:
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+15551234567
```

2. **Test SMS**:
```bash
curl -X POST http://localhost:3000/api/send-sms \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+15551234567",
    "buyerName": "Test User",
    "ticketCount": 2,
    "eventName": "SoCal Cup Test",
    "orderId": "test_123"
  }'
```

### Test in Production

1. **Make a test purchase** on your live site
2. **Use your real phone number**
3. **You should receive** a text with ticket link

---

## Troubleshooting

### "SMS not sending"
- ✅ Check credentials are correct in Vercel
- ✅ Verify phone number format includes `+1` country code
- ✅ Check Twilio Console → Monitor → Logs for errors
- ✅ Trial accounts can only text verified numbers

### "Invalid phone number"
- ✅ Format must be: `+1XXXXXXXXXX` (with country code)
- ✅ No spaces or dashes
- ✅ Example: `+15551234567` ✅ (not `555-123-4567` ❌)

### "Trial account restrictions"
- ✅ Trial can only send to **verified phone numbers**
- ✅ To send to any number: Upgrade to paid account
- ✅ Paid account: ~$1/month + $0.0075 per SMS

---

## Cost Estimate

**For 1,000 tickets/month:**
- Phone number: $1/month
- SMS: 1,000 × $0.0075 = $7.50
- **Total: ~$8.50/month**

**Per ticket cost: ~$0.0085** (less than 1 cent!)

---

## Next Steps

Once Twilio is set up:
1. ✅ Create $17 products in Stripe
2. ✅ Update Supabase with Price IDs
3. ✅ Deploy and test!

