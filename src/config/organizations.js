// Organization Configuration
// Easily editable organization data for parent portals
// Each organization gets full white-label branding control
//
// TO ADD A NEW BUSINESS:
// 1. Add a new entry below with a unique slug (e.g., 'business-name')
// 2. Set logo: Use emoji for now, or image URL for future logo support
// 3. Set colors: primaryColor (main brand), secondaryColor, accentColor
// 4. Set fontFamily: Optional - custom font name (will need to be loaded in index.html)
// 5. Access at: /org/business-name

export const ORGANIZATIONS = {
  'springfield-little-league': {
    id: 'springfield-little-league',
    name: 'Springfield Little League',
    logo: '⚾', // Can be emoji or image URL (e.g., 'https://example.com/logo.png')
    season: 'Spring 2025 Season',
    primaryColor: '#f97316', // Main brand color (buttons, accents)
    secondaryColor: '#ea580c', // Secondary brand color
    backgroundColor: '#0a0a0a', // Background color
    accentColor: '#ff6b35', // Accent/highlight color
    fontFamily: null // Optional: 'Custom Font Name' (must be loaded in index.html)
  },
  'downtown-youth-basketball': {
    id: 'downtown-youth-basketball',
    name: 'Downtown Youth Basketball',
    logo: '🏀',
    season: '2024-25 Season',
    primaryColor: '#3b82f6',
    secondaryColor: '#2563eb',
    backgroundColor: '#0a0a0a',
    accentColor: '#60a5fa',
    fontFamily: null
  },
  'gameday-empire': {
    id: 'gameday-empire',
    name: 'Gameday Empire',
    logo: '🏆',
    season: 'Current Events',
    primaryColor: '#f97316',
    secondaryColor: '#ea580c',
    backgroundColor: '#0a0a0a',
    accentColor: '#ff6b35',
    fontFamily: null
  }
}

// Helper to get organization or generate default
export const getOrganization = (orgSlug) => {
  return ORGANIZATIONS[orgSlug] || {
    id: orgSlug,
    name: orgSlug?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Events',
    logo: '🎟️',
    season: 'Upcoming Events',
    primaryColor: '#f97316',
    secondaryColor: '#ea580c',
    backgroundColor: '#0a0a0a',
    accentColor: '#ff6b35'
  }
}

