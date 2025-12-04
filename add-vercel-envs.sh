#!/bin/bash

# Add Vercel Environment Variables (Non-Interactive)
# Run this to add VITE_ variables to Vercel production

echo "🔧 Adding VITE_ Environment Variables to Vercel"
echo "=============================================="
echo ""

# Check and add VITE_SUPABASE_URL
echo "1️⃣  Checking VITE_SUPABASE_URL..."
if vercel env ls 2>/dev/null | grep -q "VITE_SUPABASE_URL"; then
  echo "✅ VITE_SUPABASE_URL already exists (skipping)"
else
  echo "Adding VITE_SUPABASE_URL..."
  echo "https://xjvzehjpgbwiiuvsnflk.supabase.co" | vercel env add VITE_SUPABASE_URL production
  echo "✅ VITE_SUPABASE_URL added"
fi

echo ""
echo "2️⃣  Checking VITE_SUPABASE_ANON_KEY..."
if vercel env ls 2>/dev/null | grep -q "VITE_SUPABASE_ANON_KEY"; then
  echo "✅ VITE_SUPABASE_ANON_KEY already exists (skipping)"
else
  echo "Adding VITE_SUPABASE_ANON_KEY..."
  echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqdnplaGpwZ2J3aWl1dnNuZmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDk1NTksImV4cCI6MjA3NzE4NTU1OX0.Y1vVNyKDuHoklqOvGAcW9zbIVaXOdaHQpgbRi3PeSSs" | vercel env add VITE_SUPABASE_ANON_KEY production
  echo "✅ VITE_SUPABASE_ANON_KEY added"
fi

echo ""
echo "✅ Done! Redeploy to use new variables:"
echo "   vercel --prod"

