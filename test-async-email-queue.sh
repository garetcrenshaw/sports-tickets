#!/bin/bash

# ================================================================
# ASYNC EMAIL QUEUE - LOCAL TESTING SCRIPT
# Tests the complete flow: Webhook → Queue → Worker → Email
# ================================================================

set -e  # Exit on error

echo "🧪 TESTING ASYNC EMAIL QUEUE SYSTEM"
echo "===================================="
echo ""

# Load environment variables
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local not found"
  echo "Please create .env.local from env-local-template.txt"
  exit 1
fi

# Source the env file
export $(cat .env.local | grep -v '^#' | xargs)

# Verify required variables
echo "1️⃣ Verifying environment variables..."
REQUIRED_VARS=(
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "RESEND_API_KEY"
  "CRON_SECRET"
)

for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    echo "❌ Missing: $VAR"
    exit 1
  fi
done

echo "✅ All environment variables present"
echo ""

# Generate test session ID
TEST_SESSION_ID="cs_test_async_queue_$(date +%s)"
echo "2️⃣ Test session ID: $TEST_SESSION_ID"
echo ""

# Test 1: Webhook queues email (doesn't send directly)
echo "3️⃣ TEST 1: Webhook queues email job"
echo "===================================="
echo "Creating mock Stripe webhook event..."

# Create mock event payload
WEBHOOK_PAYLOAD=$(cat <<EOF
{
  "id": "evt_test_$(date +%s)",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "$TEST_SESSION_ID",
      "payment_status": "paid",
      "customer_details": {
        "email": "test@example.com",
        "name": "Test User"
      },
      "metadata": {
        "event_id": "test_event_1",
        "admissionQuantity": "2",
        "parkingQuantity": "1"
      }
    }
  }
}
EOF
)

echo "Sending webhook to local server..."
echo ""

# Note: This won't actually work without Stripe signature
# For real testing, use stripe trigger or a real purchase
echo "⚠️  NOTE: For full webhook testing, you need to:"
echo "   1. Start dev server: npm run dev"
echo "   2. Use Stripe CLI: stripe trigger checkout.session.completed"
echo "   3. OR make a real test purchase at http://localhost:3002"
echo ""

# Test 2: Manually insert a job to email_queue (simulates webhook)
echo "4️⃣ TEST 2: Manually inserting job to email_queue"
echo "================================================="

# Check if Node.js is available
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Skipping database test."
else
  # Create a Node.js script to insert test job
  node <<'NODESCRIPT'
const { createClient } = require('@supabase/supabase-js');

async function insertTestJob() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const testJobId = `test_job_${Date.now()}`;
  
  console.log('Inserting test job to email_queue...');
  
  const { data, error } = await supabase
    .from('email_queue')
    .insert({
      ticket_id: testJobId,
      recipient_email: process.env.TEST_EMAIL || 'test@example.com',
      recipient_name: 'Test User',
      qr_code_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      event_id: 'test_event_1',
      status: 'pending',
      retry_count: 0
    })
    .select();

  if (error) {
    console.error('❌ Insert failed:', error.message);
    process.exit(1);
  }

  console.log('✅ Test job inserted:', testJobId);
  console.log('   Email will be sent to:', process.env.TEST_EMAIL || 'test@example.com');
  return data;
}

insertTestJob().catch(console.error);
NODESCRIPT

  if [ $? -eq 0 ]; then
    echo "✅ Job inserted to email_queue"
    echo ""
  else
    echo "❌ Failed to insert job"
    exit 1
  fi
fi

# Test 3: Call worker to process queue
echo "5️⃣ TEST 3: Calling email worker"
echo "================================"
echo "Triggering worker endpoint..."
echo ""

# Determine the base URL
if [ -z "$BASE_URL" ]; then
  BASE_URL="http://localhost:3001"
fi

# Call the worker endpoint
WORKER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/process-email-queue" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json")

echo "Worker response:"
echo "$WORKER_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$WORKER_RESPONSE"
echo ""

# Check if worker succeeded
if echo "$WORKER_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Worker executed successfully"
else
  echo "❌ Worker execution failed"
  echo "Response: $WORKER_RESPONSE"
fi

echo ""

# Test 4: Verify email_queue status
echo "6️⃣ TEST 4: Verifying email_queue status"
echo "========================================"

if command -v node &> /dev/null; then
  node <<'NODESCRIPT'
const { createClient } = require('@supabase/supabase-js');

async function checkQueue() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Get queue stats
  const { data, error } = await supabase
    .from('email_queue')
    .select('status')
    .gte('created_at', new Date(Date.now() - 60000).toISOString()); // Last 1 minute

  if (error) {
    console.error('❌ Query failed:', error.message);
    return;
  }

  const stats = {
    pending: 0,
    sent: 0,
    failed: 0
  };

  data.forEach(job => {
    stats[job.status] = (stats[job.status] || 0) + 1;
  });

  console.log('Queue status (last 1 minute):');
  console.log(`  Pending: ${stats.pending}`);
  console.log(`  Sent:    ${stats.sent}`);
  console.log(`  Failed:  ${stats.failed}`);
  console.log('');

  if (stats.sent > 0) {
    console.log('✅ Emails are being processed!');
  } else if (stats.pending > 0) {
    console.log('⏳ Jobs pending - wait for next worker run (1 min)');
  } else {
    console.log('ℹ️  No recent jobs in queue');
  }
}

checkQueue().catch(console.error);
NODESCRIPT
fi

echo ""
echo "===================================="
echo "🎉 TESTING COMPLETE"
echo "===================================="
echo ""
echo "Next steps:"
echo "1. Check your email inbox for test email"
echo "2. Check Supabase email_queue table for job status"
echo "3. Run a real purchase test: http://localhost:3002"
echo ""
echo "To monitor the queue in real-time:"
echo "  SELECT * FROM email_queue ORDER BY created_at DESC LIMIT 10;"
echo ""

