# White-Label Branding Implementation Guide

## Overview
This guide documents the optimal approach for implementing a business's brand for their parent portal on Gameday Tickets. The system supports full white-label customization through a simple configuration file.

## Architecture

### Portal Structure
- **Route Pattern**: `/org/:orgSlug`
- **Layout Component**: `PortalLayout` (wraps all portal pages)
- **Configuration File**: `src/config/organizations.js`
- **Context Provider**: `OrgContext` (shares org data throughout portal)

### Key Features
- Complete visual isolation from B2B marketing site
- Custom colors, fonts, logos, and branding
- Consistent branding across all portal pages (events, checkout, success, cancel)
- Mobile-responsive with continuous scrolling bottom banner

## Implementation Steps

### 1. Add Organization Configuration

Edit `src/config/organizations.js` and add a new entry:

```javascript
'business-slug': {
  id: 'business-slug',                    // Unique identifier (URL-friendly)
  name: 'Business Name',                  // Display name
  logo: '/logo.svg',                      // Logo path or emoji
  season: '2025 Season',                  // Season/event label
  primaryColor: '#f97316',                // Main brand color (buttons, accents)
  secondaryColor: '#ea580c',              // Secondary brand color
  backgroundColor: '#0a0a0a',             // Background color
  accentColor: '#ff6b35',                 // Accent/highlight color
  fontFamily: 'Custom Font',              // Optional: body font
  headlineFont: 'Display Font'            // Optional: headline font
}
```

### 2. Logo Implementation

**Option A: SVG/PNG Logo (Recommended)**
- Place logo file in `public/` directory
- Use path: `'/logo.svg'` or `'/logo.png'`
- Supports both image and SVG formats
- Automatically sized and displayed in header

**Option B: Emoji Logo (Quick Start)**
- Use emoji directly: `logo: '🏐'`
- Good for testing or simple branding
- Can be upgraded to image later

### 3. Color Scheme

**Best Practices:**
- **Primary Color**: Main brand color used for buttons, CTAs, and key accents
- **Secondary Color**: Complementary color for hover states and secondary elements
- **Background Color**: Page background (typically dark `#0a0a0a` or light `#f9fafb`)
- **Accent Color**: Highlight color for special elements

**Color Examples:**
- **Dark Theme**: `#0a0a0a` background with bright primary colors
- **Light Theme**: `#f9fafb` or `#ffffff` background with darker primary colors
- **High Contrast**: Ensure text readability on chosen backgrounds

### 4. Typography

**Font Loading:**
1. Add font to `index.html` (Google Fonts, custom font, etc.)
2. Reference in config: `fontFamily: 'Font Name'`
3. System automatically applies to portal

**Font Hierarchy:**
- **Body Font**: Applied to all text (`fontFamily`)
- **Headline Font**: Applied to titles (`headlineFont` - optional)
- **Fallback**: System defaults if not specified

### 5. Add Events

In `src/App.jsx`, add events with `organizationId` matching your slug:

```javascript
{
  id: 100,
  name: 'Event Name',
  date: 'Saturday, April 5',
  time: '9:00 AM',
  venue: 'Venue Name',
  city: 'City, State',
  category: 'Sport Category',
  price: 20,
  parkingPrice: 15,
  hasAdmission: true,
  hasParking: true,
  feeModel: 'all_in',
  organizationId: 'business-slug'  // Must match config slug
}
```

## Branding Elements

### Portal Header
- Logo (image or emoji)
- Organization name
- Season label
- Uses primary color for accents

### Mobile Bottom Banner
- Continuous scrolling logo and name
- Always visible on mobile
- Uses organization branding

### Event Cards
- Organization colors applied
- Custom fonts if specified
- Consistent with brand identity

### Checkout Page
- Branded header with logo
- Primary color for checkout button
- Custom fonts throughout
- All-in pricing display

### Success/Cancel Pages
- Branded confirmation screens
- Primary color for buttons
- Consistent messaging

## CSS Variables

The system uses CSS custom properties for dynamic theming:

```css
--portal-primary: #f97316
--portal-secondary: #ea580c
--portal-bg: #0a0a0a
--portal-accent: #ff6b35
--portal-font: 'Custom Font'
--portal-headline-font: 'Display Font'
```

These are automatically set based on organization config and applied throughout the portal.

## Real-World Examples

### SoCal Cup (Production)
- **Logo**: PNG file (`/socal-cup-logo.png`)
- **Colors**: Lime green theme (`#32cd32`)
- **Font**: Rubik (for rotating text)
- **Theme**: Dark background with bright green accents

### Coastal Youth Sports (Production)
- **Logo**: Emoji (`🏐`)
- **Colors**: Teal/turquoise theme (`#00d4aa`)
- **Font**: DM Sans
- **Theme**: Dark background with teal accents

## Testing Checklist

- [ ] Organization appears in `/events` page
- [ ] Portal loads at `/org/:orgSlug`
- [ ] Logo displays correctly (image or emoji)
- [ ] Colors applied throughout portal
- [ ] Custom fonts load (if specified)
- [ ] Events filter correctly by organization
- [ ] Checkout page uses brand colors
- [ ] Success/cancel pages are branded
- [ ] Mobile banner scrolls continuously
- [ ] All pages maintain brand consistency

## Best Practices

1. **Logo Quality**: Use high-resolution SVG or PNG (minimum 200x200px)
2. **Color Contrast**: Ensure WCAG AA compliance for text readability
3. **Font Loading**: Preload fonts in `index.html` to avoid FOUT
4. **Consistency**: Keep branding consistent across all portal pages
5. **Testing**: Test on mobile and desktop before going live
6. **Performance**: Optimize logo file size (< 50KB recommended)

## Migration from Mock to Production

When moving from a mock/test organization to production:

1. Keep the same slug (or update all references)
2. Replace emoji logos with actual brand assets
3. Refine color scheme based on brand guidelines
4. Add custom fonts if brand requires them
5. Test thoroughly before public launch
6. Update events to use production data

## Support

For questions or issues with branding implementation:
- Check `src/config/organizations.js` for configuration
- Review `src/App.jsx` PortalLayout component for structure
- Inspect CSS variables in browser DevTools
- Refer to existing production organizations as examples
