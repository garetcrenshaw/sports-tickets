# 🔑 How to Get Your Stripe Test Secret Key

## ⚠️ CRITICAL: You Need the SECRET Key (Not Publishable)

Your error says you're using an **invalid API key**. This happens when:
1. ❌ You copied the **Publishable key** (`pk_test_...`) instead of **Secret key** (`sk_test_...`)
2. ❌ Extra spaces or newlines when pasting
3. ❌ Key got truncated (should be ~90-100 characters)
4. ❌ Using a key from the wrong Stripe account

---

## ✅ Step-by-Step: Get the Correct Key

### **1. Go to Stripe Dashboard**
```
https://dashboard.stripe.com/test/apikeys
```

### **2. Make Sure You're in TEST MODE**
- Look at the **top right corner**
- Should say "Test mode" with a toggle
- If it says "Live mode", **click the toggle** to switch to Test

### **3. Find "Secret key" Section**
You'll see two types of keys:

```
┌─────────────────────────────────────────┐
│ Publishable key                         │
│ pk_test_51ABC...XYZ                     │ ← ❌ NOT THIS ONE
│ [Copy]                                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Secret key                              │
│ sk_test_51ABC...XYZ                     │ ← ✅ THIS ONE!
│ [Reveal test key] [Copy]                │
└─────────────────────────────────────────┘
```

### **4. Click "Reveal test key"** (if hidden)

### **5. Click "Copy" button**
- Should copy something like: `sk_test_51ABC123...xyz789`
- Length: ~90-100 characters
- Starts with: `sk_test_51` or `sk_test_52`

### **6. Paste into .env file**

Open `/Users/garetcrenshaw/Desktop/sports-tickets/.env`

Add this line (replace with your actual key):
```
STRIPE_SECRET_KEY=sk_test_51ABC123def456GHI789jkl012MNO345pqr678STU901vwx234YZA567bcd890EFG123hij456KLM789nop012QRS345tuv678WXY901
```

**IMPORTANT:**
- ✅ NO quotes around the key
- ✅ NO spaces before or after
- ✅ NO newlines in the middle
- ✅ Just: `STRIPE_SECRET_KEY=sk_test_...`

---

## 🧪 How to Verify You Have the Right Key

### **Length Check:**
```bash
# In terminal, count characters:
echo -n "sk_test_YOUR_KEY_HERE" | wc -c
# Should output: ~90-100
```

### **Format Check:**
```
✅ Correct:  sk_test_51ABC123...xyz789 (90-100 chars)
❌ Wrong:    pk_test_51ABC123...xyz789 (publishable key)
❌ Wrong:    sk_test_51...XXXX (truncated, only 30 chars)
```

---

## 📝 Your .env File Should Look Like This:

```bash
# Correct format:
STRIPE_SECRET_KEY=sk_test_51H7VqRLqZr6zTQ3i5xMf0A8yCkEpW9Xo2Nn1Bd7Gh4Fj6Lk5Mq8Rp3St0Uv2Yw1Az9Cx7Ev6Gw4Hy3Jz1Kx0Lw9My7Nz5

# ❌ WRONG - Has quotes:
STRIPE_SECRET_KEY="sk_test_51..."

# ❌ WRONG - Has spaces:
STRIPE_SECRET_KEY= sk_test_51...

# ❌ WRONG - Wrong key type:
STRIPE_SECRET_KEY=pk_test_51...
```

---

## 🔄 After Pasting Your Key

### **1. Save the .env file**

### **2. Restart your dev server:**
```bash
# Stop the function server (Ctrl+C)
# Then restart:
npm run dev:functions
```

### **3. Check the logs:**
When the function runs, you should see:
```
✅ Stripe key loaded
   Starts with: sk_test_51...
   Length: 98 (expected: ~90-100 chars)
```

### **4. Try purchasing a ticket again**

---

## 🚨 Still Getting Errors?

### **Error: "Key does not start with sk_test_"**
→ You copied the Publishable key by mistake. Go back and copy the SECRET key.

### **Error: "Key is too short"**
→ Key got truncated. Copy the FULL key from Stripe (select all, don't miss any characters).

### **Error: "Invalid API Key"**
→ Possible causes:
1. Key is from a different Stripe account
2. Key has been deleted/revoked in Stripe dashboard
3. Extra characters/spaces in .env file

### **To verify in Stripe Dashboard:**
1. Go to https://dashboard.stripe.com/test/apikeys
2. Click the **gear icon** next to Secret key
3. If it says "Roll key" or "Delete", the key is active ✅
4. If you see a crossed-out key, it's been revoked ❌

---

## 📋 Quick Checklist

Before restarting:
- [ ] Copied from "Secret key" section (NOT "Publishable key")
- [ ] Key starts with `sk_test_`
- [ ] Key is ~90-100 characters long
- [ ] No quotes, spaces, or newlines in .env
- [ ] Saved .env file
- [ ] Stripe dashboard is in TEST MODE

---

## 🎯 Ready?

1. ✅ Get the correct key from Stripe
2. ✅ Paste into `.env` file (no quotes, no spaces)
3. ✅ Save the file
4. ✅ Restart function server: `npm run dev:functions`
5. ✅ Try purchasing again

**You should see detailed validation logs now!**

