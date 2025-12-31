# How to Add a New Business to the Parent Portal

Adding a new business is super easy! Just follow these steps:

## Quick Steps

1. **Open** `src/config/organizations.js`
2. **Add** a new entry to the `ORGANIZATIONS` object
3. **Set** the business details (name, logo, colors, etc.)
4. **Access** the portal at `/org/your-business-slug`

## Example

```javascript
'your-business-slug': {
  id: 'your-business-slug',
  name: 'Your Business Name',
  logo: '🎟️', // Emoji for now, or image URL: 'https://example.com/logo.png'
  season: '2025 Season',
  primaryColor: '#f97316',    // Main brand color (buttons, accents)
  secondaryColor: '#ea580c',  // Secondary brand color
  backgroundColor: '#0a0a0a', // Background color
  accentColor: '#ff6b35',     // Accent/highlight color
  fontFamily: null            // Optional: 'Custom Font Name'
}
```

## Customization Options

### Logo
- **Emoji**: Use any emoji (⚾, 🏀, 🎟️, etc.)
- **Image URL**: Use `'https://example.com/logo.png'` (future support)

### Colors
All colors use hex format (`#f97316`):
- **primaryColor**: Used for buttons, buy buttons, and main accents
- **secondaryColor**: Used for hover states and secondary elements
- **backgroundColor**: Background color for the portal
- **accentColor**: Highlight and accent colors

### Custom Fonts
1. Add the font to `index.html` (Google Fonts, etc.)
2. Set `fontFamily: 'Font Name'` in the organization config
3. The font will be applied to the organization name and headers

## What Gets Customized Automatically

- ✅ Header logo and name
- ✅ All button colors
- ✅ Bottom scrolling banner
- ✅ Brand colors throughout the portal
- ✅ Organization name and season text

## Testing

After adding a business, visit:
```
http://localhost:3000/org/your-business-slug
```

That's it! The entire portal will be branded with your business's colors and information.

