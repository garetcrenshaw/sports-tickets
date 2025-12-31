// Organization Configuration
// Easily editable organization data for parent portals
// Each organization gets full white-label branding control

export const ORGANIZATIONS = {
  'springfield-little-league': {
    id: 'springfield-little-league',
    name: 'Springfield Little League',
    logo: '⚾',
    season: 'Spring 2025 Season',
    primaryColor: '#f97316',
    secondaryColor: '#ea580c',
    backgroundColor: '#0a0a0a',
    accentColor: '#ff6b35'
  },
  'downtown-youth-basketball': {
    id: 'downtown-youth-basketball',
    name: 'Downtown Youth Basketball',
    logo: '🏀',
    season: '2024-25 Season',
    primaryColor: '#3b82f6',
    secondaryColor: '#2563eb',
    backgroundColor: '#0a0a0a',
    accentColor: '#60a5fa'
  },
  'gameday-empire': {
    id: 'gameday-empire',
    name: 'Gameday Empire',
    logo: '🏆',
    season: 'Current Events',
    primaryColor: '#f97316',
    secondaryColor: '#ea580c',
    backgroundColor: '#0a0a0a',
    accentColor: '#ff6b35'
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

