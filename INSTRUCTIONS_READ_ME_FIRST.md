# 🚨 FIX YOUR STRIPE KEY ERROR - DO THIS NOW

## ❌ Current Problem

You're getting: **Invalid API Key provided: sk_test_********************XXXX**

This means:
1. You copied the PUBLISHABLE key (pk_test_...) instead of SECRET key (sk_test_...)
2. OR your key has extra spaces/newlines
3. OR your key got truncated

---

## ✅ Fix It Now (3 Steps)

### **STEP 1: Get Your CORRECT Stripe Secret Key**

1. Go to: https://dashboard.stripe.com/test/apikeys
2. **Make sure you're in TEST MODE** (toggle top right)
3. Find the "**Secret key**" section (NOT "Publishable key")
4. Click "**Reveal test key**"
5. Click "**Copy**"
6. You should have copied something like:
   ```
   sk_test_51ABC123def456GHI789jkl012MNO345pqr678STU901vwx234YZA567bcd890
   ```
   (Length: ~90-100 characters)

---

### **STEP 2: Update Your .env File**

1. Open: `/Users/garetcrenshaw/Desktop/sports-tickets/.env`
2. Find the line: `STRIPE_SECRET_KEY=...`
3. Replace with your key (NO quotes, NO spaces):
   ```
   STRIPE_SECRET_KEY=sk_test_paste_your_full_key_here
   ```
4. **SAVE the file**

**Make sure:**
- ✅ Starts with `sk_test_` (NOT `pk_test_`)
- ✅ ~90-100 characters long
- ✅ NO quotes: ❌ `"sk_test_..."` 
- ✅ NO spaces: ❌ `sk_test_ ...`

---

### **STEP 3: Restart Your Function Server**

1. Go to the terminal running `npm run dev:functions`
2. Press `Ctrl+C` to stop it
3. Run again:
   ```bash
   npm run dev:functions
   ```
4. Look for these logs:
   ```
   ✅ Stripe key loaded
      Starts with: sk_test_51...
      Length: 98 (expected: ~90-100 chars)
   ```

---

## 🧪 Test Again

1. Open: http://localhost:5173
2. Try purchasing a ticket
3. Check the function server logs for detailed validation

---

## 🆘 Still Broken?

### **See this log?**
```
❌ STRIPE_SECRET_KEY does not start with sk_test_ or sk_live_
```
→ You copied the **Publishable key** by mistake. Go back to Stripe and copy the **SECRET key**.

### **See this log?**
```
⚠️  WARNING: Key is too short! Expected ~90-100 chars, got 30
```
→ Key got truncated. Copy the FULL key from Stripe (don't miss any characters).

### **See this log?**
```
❌ No Stripe key found!
```
→ Your .env file wasn't loaded. Make sure:
- File is named `.env` (with the dot)
- File is in project root: `/Users/garetcrenshaw/Desktop/sports-tickets/.env`
- You restarted the function server after editing

---

## 📖 More Help

See: `STRIPE_KEY_SETUP.md` for detailed instructions with screenshots.

---

**Fix your key and restart the server. The new validation will tell you exactly what's wrong!** 🚀
