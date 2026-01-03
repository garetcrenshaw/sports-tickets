# Springfield Little League - Reference Example

This document serves as a reference example for how organizations are configured in the Gameday Tickets system.

## Organization Configuration

**File**: `src/config/organizations.js`

```javascript
'springfield-little-league': {
  id: 'springfield-little-league',
  name: 'Springfield Little League',
  logo: '⚾', // Emoji logo
  season: 'Spring 2025 Season',
  primaryColor: '#f97316', // Orange - Main brand color (buttons, accents)
  secondaryColor: '#ea580c', // Darker orange - Secondary brand color
  backgroundColor: '#0a0a0a', // Dark background
  accentColor: '#ff6b35', // Light orange - Accent/highlight color
  fontFamily: null // No custom font
}
```

## Access URL

- **Portal URL**: `http://localhost:3000/org/springfield-little-league`
- **Production URL**: `https://gamedaytickets.io/org/springfield-little-league`

## Branding Details

- **Logo Type**: Emoji (⚾)
- **Primary Color**: Orange (#f97316)
- **Color Scheme**: Orange-based with dark background
- **Font**: Default (DM Sans)

## Use Case

This is a simple example showing:
- Basic organization setup
- Emoji logo usage
- Standard color configuration
- No custom fonts

## Notes

- This organization uses emoji for the logo (simple approach)
- Orange color scheme matches baseball theme
- No custom fonts required
- Good template for basic organizations

