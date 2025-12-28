# Sentry Setup - Step-by-Step Guide

## Platform Selection Guide

When creating your Sentry projects, select these platforms:

### ✅ Frontend Project
**Select: "React"**
- This is for your Vite + React frontend application
- Located in `src/` directory
- Uses `@sentry/react` package

### ✅ Backend Project  
**Select: "Node.js"**
- This is for your Vercel serverless functions (API routes)
- Located in `api/` directory
- Uses `@sentry/node` package

---

## Complete Setup Steps

### 1. Create Frontend Project

1. In Sentry, click **"Create Project"** or **"Add Project"**
2. Search for or select **"React"** from the platform list
3. Enter project name: `gameday-tickets-frontend`
4. Click **"Create Project"**
5. **Copy the DSN** - you'll see it on the next screen
   - Format: `https://[key]@[org-id].ingest.sentry.io/[project-id]`
6. You can **skip the setup wizard** (we've already configured everything)

### 2. Create Backend Project

1. Click **"Create Project"** again (or go back to projects list)
2. Search for or select **"Node.js"** from the platform list
3. Enter project name: `gameday-tickets-backend`
4. Click **"Create Project"**
5. **Copy the DSN** - you'll see it on the next screen
6. You can **skip the setup wizard** (we've already configured everything)

### 3. Add DSNs to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `sports-tickets` project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

   **For Production environment:**
   ```
   Name: SENTRY_DSN
   Value: [Paste your Node.js project DSN here]
   
   Name: VITE_SENTRY_DSN
   Value: [Paste your React project DSN here]
   ```

   **For Preview environment (optional):**
   - Add the same variables
   - This allows testing in preview deployments

   **For Development environment (optional):**
   ```
   Name: SENTRY_DSN
   Value: [Paste your Node.js project DSN here]
   
   Name: VITE_SENTRY_DSN
   Value: [Paste your React project DSN here]
   
   Name: SENTRY_ENABLE_DEV
   Value: true
   
   Name: VITE_SENTRY_ENABLE_DEV
   Value: true
   ```

5. Click **"Save"** for each variable

### 4. Redeploy

After adding environment variables, you need to redeploy:

1. Go to Vercel Dashboard → Your Project → **Deployments**
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Or push a new commit to trigger a deployment

### 5. Test It Works

Once deployed, test that Sentry is capturing errors:

```bash
# Test backend error tracking
curl "https://www.gamedaytickets.io/api/test-sentry?action=exception"

# Test frontend (open browser console and trigger an error)
# Or visit the test endpoint
```

Then check your Sentry dashboard - you should see the test events appear within seconds!

---

## Visual Guide

### Platform Selection Screen

When you see the platform list, look for:

**For Frontend:**
- ✅ **React** (not Next.js, not React Native - just "React")

**For Backend:**
- ✅ **Node.js** (not Express, not Nest.js - just "Node.js")

### DSN Location

After creating each project, the DSN will be shown on a screen that says:
- "Configure React" or "Configure Node.js"
- Look for a code block showing: `SENTRY_DSN="https://..."`
- Copy the URL inside the quotes (without the quotes)

---

## Troubleshooting

### "I don't see React in the list"
- Make sure you're looking at the "Browser" or "Popular" section
- Use the search box to find "React"

### "I don't see Node.js in the list"
- Make sure you're looking at the "Server" section
- Use the search box to find "Node.js"

### "Which DSN goes where?"
- **SENTRY_DSN** = Node.js project DSN (for backend/API routes)
- **VITE_SENTRY_DSN** = React project DSN (for frontend)

### "I already created projects with wrong platforms"
- You can delete and recreate them
- Or keep them - the DSNs will still work, just less optimal organization

---

## Next Steps After Setup

1. ✅ Test with `/api/test-sentry` endpoint
2. ✅ Set up alerts (see `MONITORING_SETUP.md`)
3. ✅ Monitor your dashboard for real errors

---

**Need help?** Check `MONITORING_SETUP.md` for detailed documentation.

