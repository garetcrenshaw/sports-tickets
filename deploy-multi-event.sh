#!/bin/bash

# Multi-Event Platform Deployment Script
# This script automates the Stripe product creation and guides you through deployment

set -e

echo "🎫 Multi-Event Platform Deployment Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    print_error "Stripe CLI is not installed"
    echo "Install it from: https://stripe.com/docs/stripe-cli"
    exit 1
fi

print_success "Stripe CLI is installed"

# Check if user is logged in to Stripe
if ! stripe config --list &> /dev/null; then
    print_error "You are not logged in to Stripe CLI"
    echo "Run: stripe login"
    exit 1
fi

print_success "Logged in to Stripe CLI"
echo ""

# Check if user wants to create new products
print_info "This script will create 2 NEW Stripe products:"
echo "  1. Sportsplex Showdown - Parking Pass (\$15)"
echo "  2. Sportsplex Event - General Admission (\$15)"
echo ""
read -p "Do you want to continue? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled"
    exit 0
fi

echo ""
print_info "Creating Stripe products and prices..."
echo ""

# Create Sportsplex Showdown Parking Product
print_info "Creating Sportsplex Showdown - Parking Pass..."

SHOWDOWN_PRODUCT=$(stripe products create \
  --name "Sportsplex Showdown - Parking Pass" \
  --description "Parking pass for Sportsplex Showdown event on January 5" \
  --format json)

SHOWDOWN_PRODUCT_ID=$(echo $SHOWDOWN_PRODUCT | grep -o '"id": *"[^"]*"' | head -1 | sed 's/"id": *"\(.*\)"/\1/')
print_success "Product created: $SHOWDOWN_PRODUCT_ID"

# Create price for Sportsplex Showdown Parking
SHOWDOWN_PARKING_PRICE=$(stripe prices create \
  --product "$SHOWDOWN_PRODUCT_ID" \
  --unit-amount 1500 \
  --currency usd \
  --nickname "Sportsplex Showdown Parking" \
  --format json)

SHOWDOWN_PARKING_PRICE_ID=$(echo $SHOWDOWN_PARKING_PRICE | grep -o '"id": *"[^"]*"' | head -1 | sed 's/"id": *"\(.*\)"/\1/')
print_success "Price created: $SHOWDOWN_PARKING_PRICE_ID"
echo ""

# Create Sportsplex Event Admission Product
print_info "Creating Sportsplex Event - General Admission..."

EVENT_PRODUCT=$(stripe products create \
  --name "Sportsplex Event - General Admission" \
  --description "General admission ticket for Sportsplex Event on January 11" \
  --format json)

EVENT_PRODUCT_ID=$(echo $EVENT_PRODUCT | grep -o '"id": *"[^"]*"' | head -1 | sed 's/"id": *"\(.*\)"/\1/')
print_success "Product created: $EVENT_PRODUCT_ID"

# Create price for Sportsplex Event Admission
EVENT_ADMISSION_PRICE=$(stripe prices create \
  --product "$EVENT_PRODUCT_ID" \
  --unit-amount 1500 \
  --currency usd \
  --nickname "Sportsplex Event Admission" \
  --format json)

EVENT_ADMISSION_PRICE_ID=$(echo $EVENT_ADMISSION_PRICE | grep -o '"id": *"[^"]*"' | head -1 | sed 's/"id": *"\(.*\)"/\1/')
print_success "Price created: $EVENT_ADMISSION_PRICE_ID"
echo ""

# Save to file
PRICE_IDS_FILE="STRIPE_PRICE_IDS.txt"
cat > $PRICE_IDS_FILE <<EOF
# Stripe Price IDs - Multi-Event Platform
# Created: $(date)

# Event 1: Gameday Empire Showcase (Full Bundle)
GA_PRICE_ID=(your existing admission price ID)
PARKING_PRICE_ID=(your existing parking price ID)

# Event 2: Sportsplex Showdown (Parking Only)
SPORTSPLEX_SHOWDOWN_PARKING_PRICE_ID=$SHOWDOWN_PARKING_PRICE_ID

# Event 3: Sportsplex Event (Admission Only)
SPORTSPLEX_EVENT_ADMISSION_PRICE_ID=$EVENT_ADMISSION_PRICE_ID
EOF

print_success "Price IDs saved to $PRICE_IDS_FILE"
echo ""

# Display summary
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                   🎉 PRODUCTS CREATED SUCCESSFULLY             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
print_info "Your new Price IDs:"
echo ""
echo "  SPORTSPLEX_SHOWDOWN_PARKING_PRICE_ID=$SHOWDOWN_PARKING_PRICE_ID"
echo "  SPORTSPLEX_EVENT_ADMISSION_PRICE_ID=$EVENT_ADMISSION_PRICE_ID"
echo ""
print_warning "IMPORTANT: Copy these Price IDs somewhere safe!"
echo ""

# Ask if user wants to add to Vercel
read -p "Do you want to add these to Vercel now? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Check if vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        print_error "Vercel CLI is not installed"
        echo "Install it with: npm i -g vercel"
        exit 1
    fi
    
    print_info "Adding environment variables to Vercel..."
    echo ""
    
    # Add Sportsplex Showdown Parking Price ID
    echo "$SHOWDOWN_PARKING_PRICE_ID" | vercel env add SPORTSPLEX_SHOWDOWN_PARKING_PRICE_ID production
    print_success "Added SPORTSPLEX_SHOWDOWN_PARKING_PRICE_ID to Vercel"
    
    # Add Sportsplex Event Admission Price ID
    echo "$EVENT_ADMISSION_PRICE_ID" | vercel env add SPORTSPLEX_EVENT_ADMISSION_PRICE_ID production
    print_success "Added SPORTSPLEX_EVENT_ADMISSION_PRICE_ID to Vercel"
    
    echo ""
    print_success "Environment variables added to Vercel!"
else
    print_info "Skipped Vercel configuration"
    echo ""
    print_warning "Don't forget to manually add these to Vercel:"
    echo "  vercel env add SPORTSPLEX_SHOWDOWN_PARKING_PRICE_ID production"
    echo "  vercel env add SPORTSPLEX_EVENT_ADMISSION_PRICE_ID production"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                        NEXT STEPS                               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
print_info "1. Add the Price IDs to your .env.local file"
print_info "2. Update Event 1 Price IDs if you don't have them yet"
print_info "3. Deploy to Vercel: vercel --prod"
print_info "4. Create Stripe webhook endpoint (see MULTI_EVENT_DEPLOYMENT_PLAN.md)"
print_info "5. Test all 3 events thoroughly"
echo ""
print_success "Deployment script complete!"
print_info "For detailed instructions, see: MULTI_EVENT_DEPLOYMENT_PLAN.md"
echo ""

