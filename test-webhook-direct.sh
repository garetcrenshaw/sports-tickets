#!/bin/bash
# Test webhook endpoint directly to see if it's accessible
echo "Testing webhook endpoint..."
curl -X POST https://gamedaytickets.io/api/stripe-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  -v 2>&1 | head -50
