#!/bin/bash

# Manual Email Queue Trigger
# Use this to immediately process pending emails without waiting for the cron

echo "🚀 Manually triggering email queue processor..."
echo ""

# Get the CRON_SECRET from Vercel
CRON_SECRET=$(vercel env pull --environment=production .env.production 2>&1 | grep CRON_SECRET || echo "")

if [ -z "$CRON_SECRET" ]; then
    echo "⚠️  Could not get CRON_SECRET automatically"
    echo "Please enter your CRON_SECRET:"
    read -r CRON_SECRET
fi

# Your production URL
PROD_URL="https://sports-tickets-3jl0surpr-garetcrenshaw-9092s-projects.vercel.app"

echo "📧 Triggering email processor at: $PROD_URL/api/process-email-queue"
echo ""

# Trigger the email processor
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$PROD_URL/api/process-email-queue")

http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

echo "Response Status: $http_status"
echo "Response Body:"
echo "$body"
echo ""

if [ "$http_status" = "200" ]; then
    echo "✅ Email processor triggered successfully!"
    echo ""
    echo "💡 Check your email - QR codes should arrive within 10-15 seconds"
else
    echo "❌ Failed to trigger email processor"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check if CRON_SECRET is correct"
    echo "2. Verify the production URL is correct"
    echo "3. Check Vercel logs: vercel logs https://sports-tickets-3jl0surpr-garetcrenshaw-9092s-projects.vercel.app"
fi

