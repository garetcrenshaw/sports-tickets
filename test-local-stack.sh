#!/bin/bash

# Quick Local Stack Test
# Tests all components before production deployment

set -e

echo "🧪 Sports Tickets - Local Stack Test"
echo "====================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"

# Check if server is running
echo "Checking if local server is running..."
if ! curl -s "${BASE_URL}/api/health" > /dev/null 2>&1; then
  echo -e "${RED}❌ Local server not running${NC}"
  echo "Start with: npm run dev (in separate terminal)"
  exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}"
echo ""

# Test 1: QR Code Generation
echo "1️⃣  Testing QR Code Generation..."
QR_RESULT=$(curl -s "${BASE_URL}/api/test-qr")
if echo "$QR_RESULT" | jq -e '.success' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ QR generation working${NC}"
else
  echo -e "${RED}❌ QR generation failed${NC}"
  echo "$QR_RESULT" | jq
fi
echo ""

# Test 2: Supabase Insert
echo "2️⃣  Testing Supabase Insert..."
SUPABASE_RESULT=$(curl -s "${BASE_URL}/api/test-supabase")
if echo "$SUPABASE_RESULT" | jq -e '.success' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Supabase insert working${NC}"
  echo "$SUPABASE_RESULT" | jq -r '.message'
else
  echo -e "${RED}❌ Supabase insert failed${NC}"
  echo "$SUPABASE_RESULT" | jq
  echo ""
  echo "Common fixes:"
  echo "  - Check SUPABASE_URL is set"
  echo "  - Check SUPABASE_SERVICE_ROLE_KEY is set (NOT anon key)"
  echo "  - Verify 'tickets' table exists in Supabase"
fi
echo ""

# Test 3: Resend Email
echo "3️⃣  Testing Resend Email..."
echo "   (Sending to garetcrenshaw@gmail.com)"
RESEND_RESULT=$(curl -s "${BASE_URL}/api/test-resend")
if echo "$RESEND_RESULT" | jq -e '.success' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Email sent successfully${NC}"
  echo "   Email ID: $(echo "$RESEND_RESULT" | jq -r '.emailId')"
  echo "   Check inbox/spam"
else
  echo -e "${RED}❌ Email send failed${NC}"
  echo "$RESEND_RESULT" | jq
  echo ""
  echo "Common fixes:"
  echo "  - Check RESEND_API_KEY is set"
  echo "  - Verify domain 'gamedaytickets.io' is verified in Resend dashboard"
fi
echo ""

# Test 4: Stripe Signature (optional - requires stripe listen)
echo "4️⃣  Testing Stripe Signature..."
echo "   Note: This requires 'stripe listen' to be running"
echo "   Skip if not testing webhooks right now"
read -p "   Test Stripe signature? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "   Instructions:"
  echo "   1. Run: stripe listen --forward-to localhost:3000/api/test-stripe-sig"
  echo "   2. In another terminal: stripe trigger checkout.session.completed"
  echo "   3. Check logs for '✅ Event verified'"
else
  echo -e "${YELLOW}⏭️  Skipped Stripe signature test${NC}"
fi
echo ""

# Summary
echo "====================================="
echo "🎯 Test Summary"
echo "====================================="
echo ""
echo "Next steps:"
echo "  1. If all tests pass, deploy: vercel --prod"
echo "  2. Update Stripe webhook URL in dashboard"
echo "  3. Run production test: stripe trigger checkout.session.completed"
echo ""
echo "For full E2E test:"
echo "  1. Visit http://localhost:3002 (frontend)"
echo "  2. Buy test ticket (4242 4242 4242 4242)"
echo "  3. Check /success page shows QR code"
echo "  4. Verify email received"
echo "  5. Check Supabase for new ticket row"
echo ""

