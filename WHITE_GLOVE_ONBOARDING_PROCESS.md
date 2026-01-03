# White-Glove Event Onboarding Process

## Overview
This document outlines the complete onboarding process for new events/tournaments in the Gameday Tickets platform. This ensures every client receives white-glove service while maintaining development efficiency.

---

## Phase 1: Initial Client Consultation (Business)

### Information Gathering Checklist

**Client Information:**
- [ ] Organization/Event name
- [ ] Contact person name and email
- [ ] Phone number (optional)
- [ ] Website URL (if applicable)

**Branding Assets:**
- [ ] Logo file (PNG preferred, SVG acceptable)
  - Format: High-resolution PNG or SVG
  - Location: Save to `/Users/garetcrenshaw/Desktop/sports-tickets-event-logos/`
- [ ] Brand colors (primary, secondary, accent)
  - If not provided, extract from logo
- [ ] Custom fonts (if any)
  - Font name and source (Google Fonts, custom, etc.)

**Event Details:**
- [ ] Event name
- [ ] Season/year
- [ ] Number of games/events
- [ ] Dates for each event
- [ ] Times (if available, or mark as TBD)
- [ ] Venue name
- [ ] Venue address
- [ ] City, State

**Pricing:**
- [ ] General Admission price per ticket
- [ ] Parking pass price (if applicable)
- [ ] Fee model preference:
  - `pass_through`: Buyer pays service fee separately ($1.50 per ticket)
  - `baked_in`: Service fee included in ticket price

**Ticket Types:**
- [ ] General Admission (yes/no)
- [ ] Parking passes (yes/no)
- [ ] Any other ticket types?

---

## Phase 2: Development Setup

### Step 1: Organization Configuration

**File**: `src/config/organizations.js`

1. Add new organization entry:
```javascript
'client-slug': {
  id: 'client-slug',
  name: 'Client Name',
  logo: '/client-logo.png', // or emoji: '⚾'
  season: '2026 Season',
  primaryColor: '#HEXCODE', // Main brand color
  secondaryColor: '#HEXCODE', // Secondary brand color
  backgroundColor: '#0a0a0a', // Usually dark
  accentColor: '#HEXCODE', // Accent/highlight color
  fontFamily: 'Font Name' // Optional, or null
}
```

2. **Logo Setup:**
   - Copy logo from `sports-tickets-event-logos/` folder
   - Save to `public/client-logo.png`
   - Update logo path in config

3. **Font Setup (if custom):**
   - Add font to `index.html` (Google Fonts link)
   - Set `fontFamily` in organization config

### Step 2: Add Events to Frontend

**File**: `src/App.jsx`

1. Add events to `EVENTS_DATA` array:
```javascript
{
  id: X, // Next available ID
  name: 'Event Name',
  date: 'Day, Month Date', // e.g., 'Saturday, January 10'
  time: 'TBD' or '7:30 PM',
  venue: 'Venue Name',
  city: 'City, State',
  category: 'Sport Type',
  price: 15, // General Admission price
  parkingPrice: 15, // Parking price (0 if no parking)
  hasAdmission: true,
  hasParking: true,
  feeModel: 'pass_through', // or 'baked_in'
  serviceFee: SERVICE_FEE_DISPLAY // $1.50 if pass_through
}
```

2. **Event ID Management:**
   - Keep track of used IDs
   - SoCal Cup uses IDs 4-19
   - Next available: 20+

### Step 3: Database Setup

**File**: Create `client-events-setup.sql`

1. Create SQL script with all events:
```sql
INSERT INTO events (
  id, event_name, event_slug, event_date, event_time,
  venue_name, venue_city, venue_address, category,
  has_admission, admission_price, stripe_admission_price_id, admission_quantity_limit,
  has_parking, parking_price, stripe_parking_price_id, parking_quantity_limit,
  scanner_pin, owner_email, status
) VALUES
-- Event 1
(
  'X',
  'Event Name',
  'event-slug',
  '2026-01-10',
  NULL, -- or '19:30:00'
  'Venue Name',
  'City, State',
  'Full Address',
  'Sport Type',
  true,
  15.00,
  NULL, -- TODO: Add Stripe Price ID
  10,
  true,
  15.00,
  NULL, -- TODO: Add Stripe Price ID
  4,
  'XXXX', -- Unique scanner PIN
  'garetcrenshaw@gmail.com',
  'active'
),
-- ... more events
```

2. **Scanner PINs:**
   - Generate unique 4-digit PIN for each event
   - Keep track to avoid duplicates
   - Format: '4001', '4002', etc.

### Step 4: Stripe Price Setup

**Required for each event:**
1. Create Stripe Price for General Admission (if applicable)
2. Create Stripe Price for Parking (if applicable)
3. Update SQL script with actual Price IDs
4. Re-run SQL script in Supabase

**Stripe Price Creation:**
- Go to Stripe Dashboard → Products → Create Price
- Set amount (e.g., $15.00)
- Set currency (USD)
- Copy Price ID (starts with `price_`)
- Add to SQL script

---

## Phase 3: Quality Assurance

### Visual Testing Checklist

- [ ] Logo displays correctly in header
- [ ] Logo displays correctly in mobile banner
- [ ] Brand colors applied throughout:
  - [ ] Buy buttons
  - [ ] Input focus borders
  - [ ] Summary headers
  - [ ] Accent elements
- [ ] Custom font loads (if applicable)
- [ ] Rotating bottom banner works (mobile)
- [ ] All events appear in list
- [ ] Event details are correct

### Functional Testing Checklist

- [ ] Portal loads at `/org/client-slug`
- [ ] Search functionality works
- [ ] Event cards are clickable
- [ ] Buy page loads correctly
- [ ] Form inputs work
- [ ] Quantity selectors work
- [ ] Price calculations are correct
- [ ] Checkout button works
- [ ] Stripe checkout redirects properly
- [ ] Success page displays
- [ ] Email delivery works (test purchase)

### Responsive Testing

- [ ] Mobile view (< 768px):
  - [ ] Logo displays properly
  - [ ] Events list is readable
  - [ ] Buy page is usable
  - [ ] Forms are accessible
  - [ ] Bottom banner displays

- [ ] Tablet view (768px - 1024px):
  - [ ] Layout adapts correctly
  - [ ] No horizontal scrolling

- [ ] Desktop view (> 1024px):
  - [ ] Full layout displays
  - [ ] All elements visible
  - [ ] Proper spacing

### Cross-Browser Testing

- [ ] Chrome/Edge
- [ ] Safari
- [ ] Firefox
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Phase 4: Client Handoff

### Documentation to Provide

1. **Portal URL:**
   - Development: `http://localhost:3000/org/client-slug`
   - Production: `https://gamedaytickets.io/org/client-slug`

2. **Admin Dashboard:**
   - URL: `/dashboard` (after login)
   - Scanner PINs for each event
   - How to view ticket sales

3. **Scanner Setup:**
   - Scanner PIN for each event
   - How to validate tickets
   - Scanner URL: `/validate?ticket={ticket_id}`

### Training Materials

- [ ] How to access portal
- [ ] How to view sales in dashboard
- [ ] How to scan tickets
- [ ] How to handle refunds (if needed)
- [ ] Support contact information

---

## Phase 5: Post-Launch Support

### Monitoring Checklist

- [ ] Monitor for errors (Sentry)
- [ ] Check email delivery
- [ ] Verify webhook processing
- [ ] Check ticket generation
- [ ] Monitor QR code generation

### Common Issues & Solutions

**Logo not displaying:**
- Check file path in `public/` folder
- Verify file name matches config
- Check file format (PNG/SVG)

**Colors not applying:**
- Verify CSS variables are set
- Check portal context is active
- Verify color codes are correct

**Events not showing:**
- Check event IDs are correct
- Verify events are in `EVENTS_DATA`
- Check date filters (past events hidden)

**Checkout not working:**
- Verify Stripe Price IDs are set
- Check webhook endpoint
- Verify environment variables

---

## Development Best Practices

### Code Organization

1. **Keep events separate:**
   - Each organization has its own events
   - Don't mix events from different organizations
   - Use comments to mark organization boundaries

2. **ID Management:**
   - Keep track of used event IDs
   - Document ID ranges per organization
   - Use sequential IDs within organization

3. **File Naming:**
   - Logos: `{org-slug}-logo.png`
   - SQL scripts: `{org-slug}-events-setup.sql`
   - Documentation: `{ORG_NAME}_SETUP.md`

### Version Control

- [ ] Commit organization config changes
- [ ] Commit logo files
- [ ] Commit SQL scripts
- [ ] Commit documentation
- [ ] Tag releases for each organization

### Documentation

- [ ] Create setup document for each organization
- [ ] Document any custom configurations
- [ ] Note any special requirements
- [ ] Keep reference examples updated

---

## Quick Reference

### File Locations

- **Organization Config**: `src/config/organizations.js`
- **Events Data**: `src/App.jsx` (EVENTS_DATA array)
- **Logos**: `public/{org-slug}-logo.png`
- **SQL Scripts**: `{org-slug}-events-setup.sql`
- **Documentation**: `{ORG_NAME}_SETUP.md`

### Common Commands

```bash
# Start dev server
npm run dev

# Check for errors
npm run lint

# Build for production
npm run build
```

### Important URLs

- **Local Dev**: `http://localhost:3000`
- **Portal Template**: `http://localhost:3000/org/{org-slug}`
- **Production**: `https://gamedaytickets.io/org/{org-slug}`

---

## Notes

- Always test thoroughly before client handoff
- Keep client communication clear and professional
- Document any custom requirements
- Maintain reference examples for future clients
- Update this process as you learn and improve

