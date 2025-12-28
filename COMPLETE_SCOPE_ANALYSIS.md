# Complete Scope Analysis: Webhook 500 Error & Vercel Cache Issue

## Executive Summary

The Stripe webhook (`api/stripe-webhook`) has been returning 500 errors since yesterday. The root cause is **Vercel's build cache** persistently bundling a deleted file (`api/send-ticket.js`) that imports `requireEnv` from `src/lib/stripe.js`, which throws an error when `RESEND_API_KEY` is not found at module load time. Despite multiple attempts to clear the cache, Vercel continues to use the cached build artifact.

---

## Timeline of Events

### December 26, 2025 (Yesterday)

**Initial Problem Discovery:**
- User reported: "Got a 500 error code on my stripe webhook when trying to purchase"
- Stripe webhook was failing with 500 status
- No emails were being sent
- No records were being created in Supabase

**Initial Investigation:**
- Error logs showed: `Error: Missing required environment variable: RESEND_API_KEY`
- Error trace: `at requireEnv (/var/task/src/lib/stripe.js:7:11) at Object.<anonymous> (/var/task/api/send-ticket.js:5:27)`
- This indicated `api/send-ticket.js` was trying to import and use `requireEnv` from `src/lib/stripe.js`

**Root Cause Identified:**
- `api/send-ticket.js` file existed (either as flat file or in folder structure)
- This file was importing `requireEnv` from `src/lib/stripe.js`
- `requireEnv('RESEND_API_KEY')` was being called at module load time (top-level)
- This threw an error before any handler code could run

**Initial Fixes Attempted:**
1. ✅ Added error handling to webhook
2. ✅ Added extensive logging
3. ✅ Fixed raw body reading for Vercel compatibility
4. ✅ Created minimal stub `api/send-ticket.js` file with no imports
5. ✅ Deleted `api/send-ticket/index.js` folder structure
6. ✅ Removed old test files that referenced send-ticket

**The Cache Problem Emerged:**
- Even after deleting `send-ticket.js`, Vercel logs showed it was still trying to load it
- Build logs showed: `Restored build cache from previous deployment (H5G91KfNb6thD1RkQoyVYpTDtrsQ)`
- Redeploying with "Use existing Build Cache" unchecked didn't help
- The cached build artifact persisted across multiple deployments

---

### December 27, 2025 (Today)

**Continued Cache Issues:**
- Multiple redeployments attempted
- File completely deleted from repository
- Created override files to replace cached version
- Changed `vercel.json` to add build command
- Added `.vercelignore` (then removed it)
- Multiple git commits and pushes

**Current State:**
- ✅ `api/send-ticket.js` is completely deleted from codebase
- ✅ Nothing in codebase imports or references `send-ticket.js`
- ✅ Webhook code (`api/stripe-webhook/index.js`) is clean - no imports of send-ticket
- ❌ Vercel still returns 500 errors
- ❌ NO logs appear from webhook function (not even first console.log)
- ❌ Build cache `H5G91KfNb6thD1RkQoyVYpTDtrsQ` persists

**Evidence:**
- Build logs show: `Restored build cache from previous deployment (H5G91KfNb6thD1RkQoyVYpTDtrsQ)`
- Stripe webhook logs show generic 500: `{"error": {"code": "500", "message": "A server error has occurred"}}`
- Vercel function logs show NO output (function fails before any code executes)

---

## Technical Analysis

### The Problem Chain

```
1. Original Issue
   └─> api/send-ticket.js existed with imports
       └─> Imported requireEnv from src/lib/stripe.js
           └─> Called requireEnv('RESEND_API_KEY') at module load
               └─> Threw error before handler code could run

2. Current Issue (After Deletion)
   └─> File deleted from repository
       └─> Vercel build cache still contains old file
           └─> Vercel bundles cached version into deployment
               └─> Module loader tries to load send-ticket.js
                   └─> Same error occurs (module load failure)
                       └─> Function returns 500 before ANY code runs
```

### Why Vercel Cache Won't Clear

**Possible Reasons:**
1. **Deep Cache Persistence**: Vercel's build cache is stored separately from deployment artifacts
2. **Cache Key Reuse**: Build cache key `H5G91KfNb6thD1RkQoyVYpTDtrsQ` is being reused across deployments
3. **Function-Level Caching**: Serverless functions may have their own cache layer
4. **Unchecked Option Not Working**: The "Use existing Build Cache" unchecked option may not be clearing function-level caches

### Why We Can't See Logs

**The Function Fails at Module Load Time:**
- Module loading happens BEFORE the handler function executes
- Our first `console.log` is at line 47 of the handler
- The error occurs when Node.js tries to `require()` or `import` modules
- Vercel returns a generic 500 before our error handler can catch it

**Evidence:**
- No logs appear (not even the first `console.log('🚀 WEBHOOK HANDLER CALLED')`)
- Stripe receives generic 500 error
- Function invocation fails silently

---

## What We've Tried

### ✅ Code Changes
1. Deleted `api/send-ticket.js` file completely
2. Deleted `api/send-ticket/index.js` folder structure
3. Removed all imports/references to send-ticket in codebase
4. Created minimal override files (then deleted them)
5. Verified webhook code has no imports of send-ticket

### ✅ Configuration Changes
1. Updated `vercel.json` (added buildCommand, removed memory setting)
2. Created/modified `.vercelignore`
3. Added explicit `vercel-build` script to `package.json`
4. Multiple git commits to trigger fresh deployments

### ✅ Deployment Attempts
1. Multiple redeployments via git push
2. Redeployed via Vercel dashboard with cache unchecked
3. Waited for fresh deployments to complete

### ❌ What We Haven't Tried (Blocked By)
1. **Manual Cache Invalidation**: Requires Vercel support
2. **Viewing Function Logs**: User cannot access function logs tab
3. **Creating New Project**: Nuclear option - would require updating Stripe webhook URL
4. **Vercel CLI Cache Clear**: Not sure if this exists or would work

---

## Current Codebase State

### ✅ What's Correct
- `api/send-ticket.js` - **DELETED** ✅
- `api/stripe-webhook/index.js` - **CLEAN** (no send-ticket imports) ✅
- All API routes verified - no send-ticket references ✅
- Webhook has proper error handling ✅
- Environment variables configured in Vercel ✅

### ❌ What's Wrong
- Vercel build cache contains old `send-ticket.js` ❌
- Build cache key `H5G91KfNb6thD1RkQoyVYpTDtrsQ` persists ❌
- Function fails at module load (before our code runs) ❌
- No logs available to diagnose ❌

---

## Blockers

### Primary Blocker: Vercel Build Cache
- **Issue**: Cannot clear build cache via standard methods
- **Impact**: Old code keeps getting bundled despite deletion
- **Resolution Needed**: Manual cache invalidation by Vercel support

### Secondary Blocker: No Error Visibility
- **Issue**: Cannot see function logs or actual error messages
- **Impact**: Flying blind - don't know exact failure point
- **Resolution Options**:
  1. Access Vercel function logs
  2. Have Vercel support check logs
  3. Add error capture that surfaces to response

---

## Actionable Plan to Fix

### Phase 1: Immediate Diagnosis (15-30 minutes)

**Step 1.1: Get Actual Error Message**
- **Action**: Contact Vercel support to check function logs for latest webhook invocation
- **Alternative**: Access function logs via Vercel dashboard (if accessible)
- **Goal**: See the exact error message causing the 500

**Step 1.2: Verify Current Deployment State**
- **Action**: Check latest deployment build logs
- **Look For**: Whether `send-ticket.js` appears in bundled files
- **Tool**: Vercel deployment logs or support

### Phase 2: Force Cache Clear (30-60 minutes)

**Option A: Vercel Support (Recommended)**
- **Action**: Email Vercel support with:
  - Project: sports-tickets
  - Account: garetcrenshaw-9092
  - Build Cache ID: H5G91KfNb6thD1RkQoyVYpTDtrsQ
  - Request: Invalidate this cache OR force completely fresh build
- **Template**: See `CONTACT_VERCEL_SUPPORT.md`
- **Expected Time**: 2-24 hours for response

**Option B: Nuclear - New Project (If Support Can't Help)**
- **Action**: 
  1. Create new Vercel project
  2. Connect same GitHub repo
  3. Deploy to new project
  4. Update Stripe webhook URL to new project URL
- **Time**: 30 minutes
- **Downside**: Requires webhook URL change in Stripe

**Option C: Try Vercel CLI (If Available)**
- **Action**: 
  ```bash
  vercel env pull  # Ensure local env matches
  vercel --force --prod  # Force deploy
  ```
- **Check**: If CLI has cache-busting options

### Phase 3: Verification & Testing (15 minutes)

**Step 3.1: Verify Clean Build**
- **Action**: Check new deployment build logs
- **Verify**: No mention of `send-ticket.js` in build output
- **Verify**: Build cache is different/new ID

**Step 3.2: Test Webhook**
- **Action**: Make test purchase
- **Check**: Webhook logs appear in Vercel
- **Check**: Tickets created in Supabase
- **Check**: Emails sent via Resend

**Step 3.3: Monitor Function Logs**
- **Action**: Watch Vercel function logs during test
- **Verify**: First console.log appears (`🚀 WEBHOOK HANDLER CALLED`)
- **Verify**: No module load errors

### Phase 4: Prevent Future Issues (15 minutes)

**Step 4.1: Add Build Verification**
- **Action**: Add script to verify no send-ticket files in build
- **Tool**: Pre-deploy check script

**Step 4.2: Document Cache Strategy**
- **Action**: Document when/how to clear Vercel cache
- **Add**: To README or deployment docs

**Step 4.3: Add Monitoring**
- **Action**: Set up alerts for webhook failures
- **Tool**: Vercel analytics or external monitoring

---

## Recommended Immediate Actions (Priority Order)

### 1. **Contact Vercel Support** (Do This First)
- **Why**: Fastest path to cache invalidation
- **Time**: 5 minutes to send email
- **Expected Resolution**: 2-24 hours

### 2. **Try Vercel CLI Force Deploy** (While Waiting)
- **Why**: Might bypass cache differently
- **Time**: 5 minutes
- **Command**: `vercel --force --prod`

### 3. **Access Function Logs** (If Possible)
- **Why**: See actual error message
- **Path**: Vercel dashboard → Deployments → Latest → Logs/Functions tab
- **Time**: 10 minutes

### 4. **Nuclear Option: New Project** (If Support Fails)
- **Why**: Guaranteed fresh build
- **Time**: 30 minutes
- **Trade-off**: Must update Stripe webhook URL

---

## Success Criteria

### ✅ Webhook Working When:
1. Vercel function logs show `🚀 WEBHOOK HANDLER CALLED`
2. Webhook returns 200 status to Stripe
3. Tickets appear in Supabase `tickets` table
4. Email queue jobs appear in Supabase `email_queue` table
5. Emails are sent with QR codes

### ✅ Cache Fixed When:
1. Build logs show different/new cache ID (not `H5G91KfNb6thD1RkQoyVYpTDtrsQ`)
2. Build logs show `send-ticket.js` is NOT included
3. Function executes without module load errors
4. Logs appear from webhook handler

---

## Files Changed (Summary)

### Deleted Files
- `api/send-ticket.js` (original problematic file)
- `api/send-ticket/index.js` (folder version)
- `test-webhook.js` (old test file)
- `test-full-webhook.js` (old test file)

### Modified Files
- `api/stripe-webhook/index.js` (added error handling, logging)
- `api/process-email-queue/index.js` (added RESEND_API_KEY check)
- `vercel.json` (added buildCommand, removed memory setting)
- `package.json` (added vercel-build script)
- `.gitignore` (added .env.production, .env.vercel)

### Created Files (Documentation)
- `WEBHOOK_DEBUG_PLAN.md`
- `GET_VERCEL_LOGS.md`
- `CONTACT_VERCEL_SUPPORT.md`
- `VERCEL_DOMAIN_FIX.md`
- `COMPLETE_SCOPE_ANALYSIS.md` (this file)

---

## Next Steps (Immediate)

1. **Send email to Vercel support** (use template in `CONTACT_VERCEL_SUPPORT.md`)
2. **Try `vercel --force --prod` via CLI** (if you have Vercel CLI installed)
3. **Check function logs** in Vercel dashboard (if accessible)
4. **Wait for support response** OR proceed with nuclear option if urgent

---

## Questions to Answer

1. **Do you have Vercel CLI installed?** (Run `vercel --version` to check)
2. **Can you access function logs in Vercel dashboard?** (Check if Functions tab is visible)
3. **How urgent is this?** (Determines if we wait for support or go nuclear)
4. **Do you have access to Stripe webhook settings?** (Needed if we create new project)

---

## Estimated Total Time to Fix

- **With Vercel Support**: 2-24 hours (waiting for response) + 15 minutes (verification)
- **Nuclear Option**: 30-45 minutes (new project + webhook URL update)
- **If Cache Clears**: 15 minutes (verification testing)

---

**Last Updated**: December 27, 2025, 8:50 PM PST
**Current Status**: Blocked by Vercel build cache persistence
**Next Action**: Contact Vercel support OR try Vercel CLI force deploy

