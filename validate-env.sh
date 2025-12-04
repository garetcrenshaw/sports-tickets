#!/bin/bash

# Environment Variable Validator for Vercel & Local
# Checks for trailing spaces, missing vars, and format issues

echo "🔍 Environment Variable Audit"
echo "=============================="

# Required environment variables
REQUIRED_VARS=(
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "RESEND_API_KEY"
  "VITE_SUPABASE_URL"
  "VITE_SUPABASE_ANON_KEY"
)

# Check local .env file if it exists
if [ -f .env ]; then
  echo "✅ Found .env file"
  echo ""
  
  for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^${var}=" .env; then
      value=$(grep "^${var}=" .env | cut -d '=' -f2-)
      
      # Check for trailing spaces
      if [[ "$value" =~ [[:space:]]$ ]]; then
        echo "⚠️  ${var}: HAS TRAILING SPACE (will cause errors!)"
      else
        echo "✅ ${var}: Present"
      fi
      
      # Check format
      case $var in
        "STRIPE_SECRET_KEY")
          if [[ ! "$value" =~ ^sk_ ]]; then
            echo "   ⚠️  Should start with 'sk_'"
          fi
          ;;
        "STRIPE_WEBHOOK_SECRET")
          if [[ ! "$value" =~ ^whsec_ ]]; then
            echo "   ⚠️  Should start with 'whsec_'"
          fi
          ;;
        "SUPABASE_URL")
          if [[ ! "$value" =~ ^https:// ]]; then
            echo "   ⚠️  Should be a URL starting with https://"
          fi
          ;;
        "RESEND_API_KEY")
          if [[ ! "$value" =~ ^re_ ]]; then
            echo "   ⚠️  Should start with 're_'"
          fi
          ;;
      esac
    else
      echo "❌ ${var}: MISSING"
    fi
  done
else
  echo "⚠️  No .env file found (checking system environment only)"
fi

echo ""
echo "================================"
echo "🌐 Vercel Environment Check"
echo "================================"
echo ""

# Check if vercel CLI is available
if command -v vercel &> /dev/null; then
  echo "Running: vercel env ls"
  echo ""
  vercel env ls 2>&1 || echo "⚠️  Failed to list Vercel env vars (may need to login: vercel login)"
else
  echo "⚠️  Vercel CLI not installed. Install with: npm i -g vercel"
fi

echo ""
echo "================================"
echo "💡 Next Steps"
echo "================================"
echo ""
echo "If you found trailing spaces:"
echo "  1. Edit .env file and remove them"
echo "  2. For Vercel: vercel env rm <KEY> && vercel env add <KEY> <VALUE>"
echo "  3. Redeploy: vercel --prod"
echo ""
echo "To validate Stripe webhook secret:"
echo "  1. Start: stripe listen --forward-to localhost:3000/api/stripe-webhook"
echo "  2. Copy the whsec_... signing secret"
echo "  3. Set in .env: STRIPE_WEBHOOK_SECRET=whsec_..."
echo ""
echo "To test components:"
echo "  curl http://localhost:3000/api/test-supabase"
echo "  curl http://localhost:3000/api/test-resend"
echo "  curl http://localhost:3000/api/test-qr"
echo ""

