# Contact Vercel Support - Build Cache Issue

## Problem Summary

Our Vercel deployment is using cached build artifacts that include a deleted file (`api/send-ticket.js`). Despite:
- Deleting the file from git
- Redeploying with "Use existing Build Cache" unchecked
- Multiple fresh deployments

The cached version persists and causes module loading errors.

## Details

**Project:** sports-tickets  
**Account:** garetcrenshaw-9092  
**Issue:** Build cache (`H5G91KfNb6thD1RkQoyVYpTDtrsQ`) includes deleted file `api/send-ticket.js`

**Error:** Webhook function (`api/stripe-webhook`) returns 500 error with no logs, suggesting module load failure from cached `send-ticket.js` file.

**What we need:**
1. Manual cache invalidation for build cache `H5G91KfNb6thD1RkQoyVYpTDtrsQ`
2. Or guidance on how to force a completely fresh build

## Email Template

```
Subject: Build Cache Not Clearing - Deleted File Still Being Bundled

Hi Vercel Support,

I'm experiencing an issue where a deleted file is still being included in deployments despite:
- File deleted from repository
- Multiple redeployments with "Use existing Build Cache" unchecked
- Fresh git pushes

Project: sports-tickets
Account: garetcrenshaw-9092
Build Cache ID: H5G91KfNb6thD1RkQoyVYpTDtrsQ

The file `api/send-ticket.js` was deleted but is still being bundled in deployments, causing module loading errors in the `api/stripe-webhook` function (returns 500 with no logs).

Could you please:
1. Invalidate/build cache H5G91KfNb6thD1RkQoyVYpTDtrsQ
2. Force a completely fresh build on the next deployment

Thank you!
```

## Alternative: Check Logs via Support

If you can't access logs yourself, ask Vercel support to check the function logs for the most recent webhook invocation to see the actual error.

