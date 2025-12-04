#!/bin/bash

# Quick Deploy Script with Pre-checks
# Ensures everything is ready before deploying

set -e

echo "🚀 Pre-Deployment Checklist"
echo "============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

# Check 1: Git status
echo "1️⃣  Checking git status..."
if [[ -n $(git status -s) ]]; then
  echo -e "${YELLOW}⚠️  Uncommitted changes found${NC}"
  git status -s
  read -p "   Continue with deployment? (y/N): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
else
  echo -e "${GREEN}✅ Working directory clean${NC}"
fi
echo ""

# Check 2: Required files
echo "2️⃣  Checking required files..."
REQUIRED_FILES=("package.json" "vercel.json" "api/stripe-webhook/index.js")
for file in "${REQUIRED_FILES[@]}"; do
  if [[ -f "$file" ]]; then
    echo -e "   ${GREEN}✅${NC} $file"
  else
    echo -e "   ${RED}❌${NC} $file missing"
    ERRORS=$((ERRORS + 1))
  fi
done
echo ""

# Check 3: vercel.json has bodyParser: false
echo "3️⃣  Checking vercel.json configuration..."
if grep -q '"bodyParser": false' vercel.json; then
  echo -e "${GREEN}✅ bodyParser: false found${NC}"
else
  echo -e "${RED}❌ bodyParser: false missing in vercel.json${NC}"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 4: Webhook has timeout handling
echo "4️⃣  Checking webhook timeout handling..."
if grep -q 'timeoutPromise' api/stripe-webhook/index.js; then
  echo -e "${GREEN}✅ Timeout handling present${NC}"
else
  echo -e "${YELLOW}⚠️  Timeout handling not found${NC}"
fi
echo ""

# Check 5: Vercel CLI
echo "5️⃣  Checking Vercel CLI..."
if command -v vercel &> /dev/null; then
  echo -e "${GREEN}✅ Vercel CLI installed${NC}"
  vercel --version
else
  echo -e "${RED}❌ Vercel CLI not installed${NC}"
  echo "   Install with: npm i -g vercel"
  ERRORS=$((ERRORS + 1))
fi
echo ""

if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}❌ Pre-deployment checks failed. Fix errors above.${NC}"
  exit 1
fi

echo "============================="
echo -e "${GREEN}✅ All checks passed!${NC}"
echo "============================="
echo ""

# Deployment options
echo "Choose deployment option:"
echo "  1) Deploy to production (vercel --prod)"
echo "  2) Build only (npm run build)"
echo "  3) Cancel"
echo ""
read -p "Enter choice (1-3): " -n 1 -r
echo ""

case $REPLY in
  1)
    echo ""
    echo "🚀 Deploying to production..."
    echo ""
    
    # Commit changes if any
    if [[ -n $(git status -s) ]]; then
      read -p "Commit message: " COMMIT_MSG
      git add .
      git commit -m "${COMMIT_MSG:-deploy: production update}"
      git push origin main
      echo ""
      echo "✅ Changes committed and pushed"
      echo ""
    fi
    
    # Deploy
    vercel --prod
    
    echo ""
    echo "============================="
    echo "✅ Deployment Complete!"
    echo "============================="
    echo ""
    echo "Next steps:"
    echo "  1. Update Stripe webhook URL in dashboard"
    echo "  2. Test: stripe trigger checkout.session.completed"
    echo "  3. Watch logs: vercel logs --follow"
    echo "  4. Verify: Check Stripe/Supabase/Resend/Email"
    echo ""
    ;;
  2)
    echo ""
    echo "🔨 Building..."
    npm run build
    echo ""
    echo "✅ Build complete. Deploy manually with: vercel --prod"
    ;;
  3)
    echo "Cancelled."
    exit 0
    ;;
  *)
    echo "Invalid choice."
    exit 1
    ;;
esac

