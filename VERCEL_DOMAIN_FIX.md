# Vercel Domain & Deployment Fix Guide

## Problem 1: Cannot Redeploy Old Deployment ✅ FIXED

**Solution:** You need to redeploy the **NEWEST** deployment, not the old one.

1. Go to: https://vercel.com/garetcrenshaw/sports-tickets/deployments
2. Look at the **TOP** deployment (most recent)
3. Click **"..."** menu → **"Redeploy"**
4. **UNCHECK** "Use existing Build Cache"
5. Click **"Redeploy"**

---

## Problem 2: Live Domain on Both Preview & Production ❌ NEEDS FIX

**Problem:** `www.gamedaytickets.io` is assigned to BOTH preview AND production deployments.

**Why this is bad:**
- Preview deployments are temporary and get deleted
- Production domain should ONLY point to production deployments
- This causes confusion and can break your live site

**How to Fix:**

### Step 1: Check Current Domain Assignment

1. Go to: https://vercel.com/garetcrenshaw/sports-tickets/settings/domains
2. Find `www.gamedaytickets.io` in the list
3. Check what it shows:
   - ✅ Good: Only shows "Production"
   - ❌ Bad: Shows "Preview" or multiple deployments

### Step 2: Remove from Preview (if needed)

If `www.gamedaytickets.io` is assigned to a preview deployment:

1. Go to: https://vercel.com/garetcrenshaw/sports-tickets/deployments
2. Find any preview deployments that have `www.gamedaytickets.io` assigned
3. Click on that preview deployment
4. Go to the "Domains" tab
5. Remove `www.gamedaytickets.io` from that preview deployment

### Step 3: Ensure Production Only

1. Go back to: https://vercel.com/garetcrenshaw/sports-tickets/settings/domains
2. Click on `www.gamedaytickets.io`
3. Make sure it says:
   - **Target:** Production
   - **Not assigned to any preview deployments**

### Step 4: Verify

1. Go to: https://vercel.com/garetcrenshaw/sports-tickets/deployments
2. Click on the **Production** deployment (the one currently live)
3. Check "Domains" - should show `www.gamedaytickets.io`
4. Click on any **Preview** deployments
5. Check "Domains" - should NOT show `www.gamedaytickets.io`

---

## How Vercel Domains Should Work

- **Production Domain** (`www.gamedaytickets.io`):
  - ✅ Assigned to: Production branch (main) deployments only
  - ✅ Points to: Latest production deployment
  - ❌ Should NOT be on: Preview deployments

- **Preview Deployments**:
  - ✅ Get: Auto-generated URLs like `sports-tickets-abc123.vercel.app`
  - ❌ Should NOT have: Production domains assigned

---

## Quick Check Command (if you have Vercel CLI)

```bash
vercel domains ls
```

This will show all domains and their assignments.

