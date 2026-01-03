# SoCal Cup B2C Portal Setup - Complete ✅

## Overview
The SoCal Cup volleyball event has been successfully added to Gameday Tickets with a fully branded B2C portal.

## What Was Created

### 1. Organization Configuration ✅
- **File**: `src/config/organizations.js`
- **Slug**: `socal-cup`
- **Access URL**: `http://localhost:3000/org/socal-cup`
- **Branding**:
  - Logo: `/socal-cup-logo.svg` (custom SVG logo)
  - Primary Color: `#32cd32` (Lime green from logo)
  - Secondary Color: `#228b22` (Darker green)
  - Font: `Rubik` (for rotating bottom text)
  - Season: `2026 Season`

### 2. Logo & Fonts ✅
- **Logo File**: `public/socal-cup-logo.svg`
  - Custom SVG based on SoCal Cup brand identity
  - Features shield design with trophy, bears, stars, and triangle
- **Font Added**: Rubik font loaded in `index.html`
  - Used for rotating bottom banner text in portal

### 3. Events Added ✅
- **Total Events**: 16 volleyball events for 2026 season
- **Event IDs**: 4-19 (IDs 1-3 are existing events)
- **Location**: All events at AIM Sportsplex, Seal Beach, CA
- **Ticket Types**: Each event has:
  - General Admission tickets
  - Parking passes
- **Events List**:
  1. 12-18 Friendly (Jan 10)
  2. 14/13 Tourney 2 (Feb 21)
  3. 12 Tourney 2 (Feb 22)
  4. 14/13 Tourney 3 (Mar 21)
  5. 12 Tourney 3 (Mar 22)
  6. 14/13 Tourney 4 (Apr 11)
  7. 12 Tourney 4 (Apr 12)
  8. 14/13 Tourney 5 (Apr 25)
  9. 12 Tourney 5 (Apr 26)
  10. 14/13 Championship (May 16)
  11. 12 Championship (May 17)
  12. 15-18 Friendly (May 23)
  13. 16/15 Tourney 3 (May 30)
  14. 18/17 Tourney 3 (May 31)
  15. 16/15 Spring Championship (Jun 6)
  16. 18/17 Spring Championship (Jun 7)

### 4. Database Setup ✅
- **SQL File**: `socal-cup-events-setup.sql`
- **Ready to run** in Supabase SQL Editor
- **Includes**: All 16 events with proper structure
- **Note**: Stripe Price IDs need to be added (marked as TODO in SQL)

### 5. Portal Enhancements ✅
- **Image Logo Support**: Portal now supports both emoji and image logos
- **Font Styling**: Rubik font applied to rotating bottom banner
- **Brand Colors**: All portal elements use SoCal Cup brand colors

## Next Steps

### 1. Create Stripe Price IDs
For each of the 16 events, you need to create 2 Stripe prices:
- General Admission ticket price
- Parking pass price

Then update the SQL file (`socal-cup-events-setup.sql`) with the actual Stripe Price IDs.

### 2. Run Database Setup
1. Open Supabase SQL Editor
2. Run the `socal-cup-events-setup.sql` script
3. Verify all 16 events are created

### 3. Update Ticket Prices (if needed)
Currently set to $15 for both admission and parking. Update in:
- `src/App.jsx` (EVENTS_DATA array)
- `socal-cup-events-setup.sql` (database)

### 4. Test the Portal
1. Start dev server: `npm run dev`
2. Visit: `http://localhost:3000/org/socal-cup`
3. Verify:
   - Logo displays correctly
   - All 16 events appear
   - Brand colors are applied
   - Rotating bottom banner uses Rubik font
   - Checkout flow works

### 5. Update Event Times (if available)
Currently all events show "TBD" for time. Update the `time` field in `EVENTS_DATA` when times are confirmed.

## Files Modified

1. `src/config/organizations.js` - Added SoCal Cup organization
2. `index.html` - Added Rubik font
3. `src/App.jsx` - Added 16 events + image logo support
4. `src/App.css` - Added image logo styles
5. `public/socal-cup-logo.svg` - Created logo file
6. `socal-cup-events-setup.sql` - Created database setup script

## Access URLs

- **B2C Portal**: `http://localhost:3000/org/socal-cup`
- **Individual Event**: `http://localhost:3000/org/socal-cup/event/{eventId}`
- **Buy Page**: `http://localhost:3000/org/socal-cup/event/{eventId}/buy`

## Notes

- All events are set with `feeModel: 'pass_through'` (buyer pays $1.50 service fee per ticket)
- Prices are currently placeholder ($15) - update as needed
- Event times are set to "TBD" - update when confirmed
- Scanner PINs are set (4001-4016) - update if needed
- Logo is a simplified SVG version - can be replaced with actual logo file if available

## Support

If you need to make changes:
- **Organization branding**: Edit `src/config/organizations.js`
- **Events**: Edit `EVENTS_DATA` in `src/App.jsx`
- **Database events**: Run updated SQL in Supabase
- **Logo**: Replace `public/socal-cup-logo.svg` with your actual logo file

