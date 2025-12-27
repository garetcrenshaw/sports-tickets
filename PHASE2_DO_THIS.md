# 🚀 PHASE 2 - SIMPLE INSTRUCTIONS

## ✅ Step 1: Copy This SQL (1 minute)

1. Open this file: `phase2-setup.sql` (it's already updated with your Price IDs!)
2. Select ALL (Cmd+A on Mac or Ctrl+A on Windows)
3. Copy (Cmd+C or Ctrl+C)

## ✅ Step 2: Run in Supabase (2 minutes)

1. Go to: https://supabase.com/dashboard
2. Click on your project
3. Click **SQL Editor** (in the left sidebar)
4. Click **New Query**
5. Paste the SQL you copied (Cmd+V or Ctrl+V)
6. Click **Run** (or press Cmd+Enter / Ctrl+Enter)
7. You should see: "Success. No rows returned"

## ✅ Step 3: Verify It Worked (30 seconds)

In the same SQL Editor, paste this and click Run:

```sql
SELECT id, event_name, scanner_pin FROM events;
```

You should see:
```
1 | Gameday Empire Showcase | 1234
2 | Sportsplex Showdown     | 5678
3 | Sportsplex Event        | 9012
```

## ✅ Step 4: Tell Me "Done!" 

Once you see your 3 events, just reply **"Done!"** and I'll:
- Create the scanner PIN system (so staff can only see their event)
- Set up daily email reports
- Test everything

---

## 🎯 THAT'S IT!

Just 3 steps:
1. Copy `phase2-setup.sql`
2. Paste in Supabase SQL Editor
3. Click Run

Then tell me "Done!" and I'll handle the rest! 🚀

---

**Questions?**
- Can't find Supabase? → Go to https://supabase.com/dashboard
- Which project? → Look for your sports-tickets project
- SQL Editor? → Left sidebar, looks like "</>" icon
- Run button? → Bottom right corner or Cmd+Enter

**Everything is ready. The SQL has your Price IDs. Just copy → paste → run!**

