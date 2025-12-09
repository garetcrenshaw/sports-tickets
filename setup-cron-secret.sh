#!/bin/bash

# ================================================================
# ASYNC EMAIL QUEUE - ENVIRONMENT SETUP
# Step 5: Add CRON_SECRET to environment variables
# ================================================================

echo "🔐 Setting up CRON_SECRET environment variable..."
echo ""

# Generate a secure random secret
CRON_SECRET=$(openssl rand -base64 32)

echo "✅ Generated CRON_SECRET:"
echo "$CRON_SECRET"
echo ""

# Instructions for .env.local (local development)
echo "📝 Step 1: Add to .env.local (local development)"
echo "=============================================="
echo "Add this line to your .env.local file:"
echo ""
echo "CRON_SECRET=$CRON_SECRET"
echo ""

# Instructions for Vercel (production)
echo "📝 Step 2: Add to Vercel (production)"
echo "=============================================="
echo "Run this command to add to Vercel:"
echo ""
echo "vercel env add CRON_SECRET production"
echo ""
echo "When prompted, paste this value:"
echo "$CRON_SECRET"
echo ""
echo "Or use this one-liner:"
echo "echo \"$CRON_SECRET\" | vercel env add CRON_SECRET production"
echo ""

# Instructions for testing
echo "🧪 Step 3: Test the worker locally"
echo "=============================================="
echo "1. Restart your dev server (to load new env var)"
echo "2. Manually trigger the worker:"
echo ""
echo "curl -X POST http://localhost:3001/api/process-email-queue \\"
echo "  -H \"Authorization: Bearer $CRON_SECRET\""
echo ""

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add CRON_SECRET to .env.local"
echo "2. Restart dev server (npm run dev)"
echo "3. Test webhook + worker locally"
echo "4. Deploy to Vercel"

