# 🧪 Quick Test Commands - Async Email Queue

## ✅ CORRECT Commands (Use These!)

### Test Worker Locally

```bash
# Step 1: Export CRON_SECRET to environment
export CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d'=' -f2-)

# Step 2: Call worker endpoint (PORT 3000)
curl -X POST http://localhost:3000/api/process-email-queue \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Expected Response (Success):**
```json
{
  "success": true,
  "processed": 0,
  "success_count": 0,
  "failure_count": 0,
  "duration_ms": 123
}
```

**Expected Response (No Jobs):**
```json
{
  "processed": 0,
  "message": "Queue is empty"
}
```

---

## ⚠️ Common Mistakes to Avoid

### ❌ WRONG: Using port 3001
```bash
# DON'T DO THIS - Port 3001 doesn't exist
curl -X POST http://localhost:3001/api/process-email-queue ...
```

### ❌ WRONG: Inline grep (loses padding)
```bash
# DON'T DO THIS - Loses base64 padding
curl ... -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d '=' -f2)"
```

### ✅ CORRECT: Export first, use port 3000
```bash
# DO THIS - Preserves padding, correct port
export CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d'=' -f2-)
curl -X POST http://localhost:3000/api/process-email-queue \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## 🔧 Troubleshooting

### Connection Refused (Port 3001)
**Problem:** `curl: (7) Failed to connect to localhost port 3001`  
**Solution:** Use port **3000** (not 3001)

### Unauthorized Error
**Problem:** `{"error":"Unauthorized","message":"Invalid CRON_SECRET"}`  
**Solution:** 
```bash
# Verify secret is correct
grep CRON_SECRET .env.local

# Export and retry
export CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d'=' -f2-)
curl -X POST http://localhost:3000/api/process-email-queue \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Server Not Running
**Problem:** Connection refused  
**Solution:** Start dev server first
```bash
npm run dev
# Wait for "Local: http://localhost:3000"
```

---

## 📋 Full Test Workflow

### 1. Start Dev Server
```bash
npm run dev
```

### 2. Insert Test Job (Supabase SQL Editor)
```sql
INSERT INTO email_queue (
  ticket_id,
  recipient_email,
  recipient_name,
  qr_code_data,
  event_id,
  status
) VALUES (
  'test_manual_' || NOW()::TEXT,
  'YOUR_EMAIL@example.com',  -- CHANGE THIS
  'Test User',
  'data:image/png;base64,test',
  'test_event_1',
  'pending'
);
```

### 3. Trigger Worker
```bash
export CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d'=' -f2-)
curl -X POST http://localhost:3000/api/process-email-queue \
  -H "Authorization: Bearer $CRON_SECRET"
```

### 4. Verify in Supabase
```sql
SELECT * FROM email_queue 
ORDER BY created_at DESC 
LIMIT 5;
```

Expected: `status` changed from `'pending'` → `'sent'`

### 5. Check Email Inbox
✅ Email should arrive within 30 seconds

---

## 🚀 Production Command

```bash
# For production deployment
export CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d'=' -f2-)
curl -X POST https://your-app.vercel.app/api/process-email-queue \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## 💡 Pro Tips

1. **Always export CRON_SECRET first** - Prevents base64 padding issues
2. **Use port 3000** - Default Vite dev server port
3. **Check server logs** - Worker outputs detailed execution logs
4. **Verify in Supabase** - Check email_queue table for status changes

---

**Quick Test Command (Copy/Paste):**
```bash
export CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d'=' -f2-) && curl -X POST http://localhost:3000/api/process-email-queue -H "Authorization: Bearer $CRON_SECRET"
```

