#!/bin/bash

# E2E Test Script - Buy to QR Flow
# Tests the complete fulfillment pipeline

set -e

echo "🎯 E2E Fulfillment Test - Buy to QR"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="${1:-http://localhost:3000}"

echo "Testing against: $BASE_URL"
echo ""

# Step 1: Health Check
echo "1️⃣  Checking API health..."
if curl -s "${BASE_URL}/api/health" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ API is healthy${NC}"
else
  echo -e "${RED}❌ API is not responding${NC}"
  echo "Start with: npm run dev"
  exit 1
fi
echo ""

# Step 2: Component Tests
echo "2️⃣  Testing Components..."

echo "   QR Generation..."
QR_RESULT=$(curl -s "${BASE_URL}/api/test-qr" 2>/dev/null || echo '{"success":false}')
if echo "$QR_RESULT" | grep -q '"success":true'; then
  echo -e "   ${GREEN}✅ QR generation working${NC}"
else
  echo -e "   ${RED}❌ QR generation failed${NC}"
  echo "   $QR_RESULT"
fi

echo "   Supabase Connection..."
SUPABASE_RESULT=$(curl -s "${BASE_URL}/api/test-supabase" 2>/dev/null || echo '{"success":false}')
if echo "$SUPABASE_RESULT" | grep -q '"success":true'; then
  echo -e "   ${GREEN}✅ Supabase working${NC}"
else
  echo -e "   ${RED}❌ Supabase failed${NC}"
  echo "   $SUPABASE_RESULT"
  echo ""
  echo "   Fix: Check SUPABASE_URL has https:// prefix"
  echo "        Check SUPABASE_SERVICE_ROLE_KEY is set"
fi

echo "   Resend Email..."
RESEND_RESULT=$(curl -s "${BASE_URL}/api/test-resend" 2>/dev/null || echo '{"success":false}')
if echo "$RESEND_RESULT" | grep -q '"success":true'; then
  echo -e "   ${GREEN}✅ Email service working${NC}"
  echo "   Check garetcrenshaw@gmail.com inbox"
else
  echo -e "   ${RED}❌ Email failed${NC}"
  echo "   $RESEND_RESULT"
  echo ""
  echo "   Fix: Regenerate RESEND_API_KEY in dashboard"
  echo "        Verify domain gamedaytickets.io"
fi

echo ""

# Step 3: Webhook Test
echo "3️⃣  Testing Webhook Signature..."
echo "   Note: Requires 'stripe listen' running"
echo "   Run: stripe listen --forward-to ${BASE_URL}/api/stripe-webhook"
echo "   Then: stripe trigger checkout.session.completed"
echo ""
read -p "   Have you tested the webhook? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "   ${GREEN}✅ Webhook test completed${NC}"
else
  echo -e "   ${YELLOW}⏭️  Skipped webhook test${NC}"
fi
echo ""

# Step 4: Frontend Check
echo "4️⃣  Checking Frontend..."
if curl -s "http://localhost:3002" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Frontend is running on http://localhost:3002${NC}"
  echo "   - Visit to test buy flow"
  echo "   - Use card: 4242 4242 4242 4242"
  echo "   - Should redirect to /success with QR code"
else
  echo -e "${YELLOW}⚠️  Frontend not running${NC}"
  echo "   Start with: npm run dev (starts both API + frontend)"
fi
echo ""

# Summary
echo "===================================="
echo "🎯 E2E Test Summary"
echo "===================================="
echo ""
echo "To complete E2E test:"
echo "  1. ${GREEN}✅${NC} Components tested above"
echo "  2. Visit http://localhost:3002"
echo "  3. Buy test ticket (4242 4242 4242 4242)"
echo "  4. After checkout, check:"
echo "     - Redirected to /success?session_id=..."
echo "     - QR code displays on page"
echo "     - Email received with QR"
echo "     - Row in Supabase tickets table"
echo ""
echo "Production test:"
echo "  stripe trigger checkout.session.completed"
echo "  vercel logs --follow"
echo ""

