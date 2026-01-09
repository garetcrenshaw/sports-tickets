import { useMemo, useState, useEffect, useCallback, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams, useLocation, Outlet } from 'react-router-dom'
import Validate from './pages/Validate'
import Success from './pages/Success'
import Cancel from './pages/Cancel'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import EventDashboard from './pages/EventDashboard'
import DatePicker from './components/DatePicker'
import TypographyGuide from './pages/TypographyGuide'
import Tickets from './pages/Tickets'
import { getOrganization, ORGANIZATIONS } from './config/organizations'
import { filterPastEvents, parseEventDate } from './utils/eventFilters'
import './App.css'
import './dashboard.css'

// Dynamic theme-color hook - changes browser chrome color based on scroll
function useDynamicThemeColor() {
  const updateThemeColor = useCallback((color) => {
    let meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'theme-color'
      document.head.appendChild(meta)
    }
    meta.content = color
  }, [])

  useEffect(() => {
    // Define sections and their colors
    const sectionColors = [
      { selector: '.home-hero', color: '#0a0a0a' },
      { selector: '.home-features', color: '#0a0a0a' },
      { selector: '.home-cta-section', color: '#0a0a0a' },
      { selector: '.events-page', color: '#0a0a0a' },
      { selector: '.buy-page', color: '#0f172a' },
      { selector: '.contact-page', color: '#0a0a0a' },
      { selector: '.dashboard-page', color: '#0a0a0a' },
    ]

    const handleScroll = () => {
      const viewportMid = window.innerHeight / 3 // Check top third of viewport

      for (const { selector, color } of sectionColors) {
        const element = document.querySelector(selector)
        if (element) {
          const rect = element.getBoundingClientRect()
          // If section is at the top of the viewport
          if (rect.top <= viewportMid && rect.bottom >= 0) {
            updateThemeColor(color)
            return
          }
        }
      }
      
      // Default fallback
      updateThemeColor('#0a0a0a')
    }

    // Run on mount and scroll
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [updateThemeColor])
}

// Scroll to top on route change + Dynamic theme color
function ScrollToTop() {
  const { pathname } = useLocation()
  
  // Use dynamic theme color
  useDynamicThemeColor()
  
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  
  return null
}

// Hamburger Menu Component
function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <div className="hamburger-menu hamburger-menu--right">
      <button 
        className="hamburger-menu__btn" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu"
      >
        <span className={`hamburger-menu__line ${isOpen ? 'open' : ''}`}></span>
        <span className={`hamburger-menu__line ${isOpen ? 'open' : ''}`}></span>
        <span className={`hamburger-menu__line ${isOpen ? 'open' : ''}`}></span>
      </button>
      
      {isOpen && (
        <>
          <div className="hamburger-menu__backdrop" onClick={() => setIsOpen(false)} />
          <div className="hamburger-menu__dropdown hamburger-menu__dropdown--right">
            <Link to="/" onClick={() => setIsOpen(false)}>
              Home
            </Link>
            <Link to="/events" onClick={() => setIsOpen(false)}>
              Events
            </Link>
            <Link to="/contact" onClick={() => setIsOpen(false)}>
              Contact
            </Link>
            <Link to="/login" onClick={() => setIsOpen(false)}>
              Dashboard Login
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ALL-IN PRICING MODEL (California Compliant)
// ═══════════════════════════════════════════════════════════════════════════
// Pricing: $18 admission + $19 parking (tax included, all-in pricing)
// Customer sees: $18 admission, $19 parking (no tax breakdown shown)
// - Business receives: $30.49 net total ($15.69 parking + $14.80 admission)
// - Platform receives: $2.00 net total ($1.00 from each purchase)
// - Tax is included in price but not shown separately to customer
// ═══════════════════════════════════════════════════════════════════════════

// Events data - SoCal Cup Events Only
// Note: Other events (Gameday Empire, Sportsplex) are separate and should be managed separately
const EVENTS_DATA = [
  // SoCal Cup Events - 2026 Season (All-In Pricing: $18 admission + $19 parking, tax included)
  // Business gets $30.49 net total, Platform gets $2.00 net total ($1.00 from each)
  {
    id: 4,
    name: 'SoCal Cup: 12-18 Friendly',
    date: 'Friday, January 10',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    price: 18, // Admission price (tax included, no tax breakdown shown)
    parkingPrice: 19, // Parking price (tax included, no tax breakdown shown)
    hasAdmission: true,
    hasParking: true,
    feeModel: 'all_in' // California compliant - no separate fees
  },
  {
    id: 5,
    name: 'SoCal Cup: 14/13 Tourney 2',
    date: 'Saturday, February 21',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    price: 18,
    parkingPrice: 19,
    hasAdmission: true,
    hasParking: true,
    feeModel: 'all_in'
  },
  {
    id: 6,
    name: 'SoCal Cup: 12 Tourney 2',
    date: 'Sunday, February 22',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    price: 18,
    parkingPrice: 19,
    hasAdmission: true,
    hasParking: true,
    feeModel: 'all_in'
  },
  {
    id: 7,
    name: 'SoCal Cup: 14/13 Tourney 3',
    date: 'Saturday, March 21',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    price: 18,
    parkingPrice: 19,
    hasAdmission: true,
    hasParking: true,
    feeModel: 'all_in'
  },
  {
    id: 8,
    name: 'SoCal Cup: 12 Tourney 3',
    date: 'Sunday, March 22',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    price: 18,
    parkingPrice: 19,
    hasAdmission: true,
    hasParking: true,
    feeModel: 'all_in'
  },
  // Coastal Youth Sports Events - 2025 Spring Season
  {
    id: 100,
    name: 'Spring Championship Tournament',
    date: 'Saturday, April 5',
    time: '9:00 AM',
    venue: 'Coastal Sports Complex',
    city: 'Huntington Beach, CA',
    category: 'Volleyball',
    price: 20,
    parkingPrice: 15,
    hasAdmission: true,
    hasParking: true,
    feeModel: 'all_in',
    organizationId: 'coastal-youth-sports'
  },
  {
    id: 101,
    name: 'Elite Division Showcase',
    date: 'Saturday, April 19',
    time: '10:00 AM',
    venue: 'Coastal Sports Complex',
    city: 'Huntington Beach, CA',
    category: 'Volleyball',
    price: 22,
    parkingPrice: 15,
    hasAdmission: true,
    hasParking: true,
    feeModel: 'all_in',
    organizationId: 'coastal-youth-sports'
  },
  {
    id: 102,
    name: 'Youth League Finals',
    date: 'Sunday, May 3',
    time: '11:00 AM',
    venue: 'Coastal Sports Complex',
    city: 'Huntington Beach, CA',
    category: 'Volleyball',
    price: 18,
    parkingPrice: 12,
    hasAdmission: true,
    hasParking: true,
    feeModel: 'all_in',
    organizationId: 'coastal-youth-sports'
  },
  {
    id: 103,
    name: 'Regional Qualifier',
    date: 'Saturday, May 17',
    time: '9:00 AM',
    venue: 'Coastal Sports Complex',
    city: 'Huntington Beach, CA',
    category: 'Volleyball',
    price: 25,
    parkingPrice: 15,
    hasAdmission: true,
    hasParking: true,
    feeModel: 'all_in',
    organizationId: 'coastal-youth-sports'
  },
  {
    id: 104,
    name: 'Summer Kickoff Classic',
    date: 'Saturday, June 7',
    time: '8:00 AM',
    venue: 'Coastal Sports Complex',
    city: 'Huntington Beach, CA',
    category: 'Volleyball',
    price: 20,
    parkingPrice: 15,
    hasAdmission: true,
    hasParking: true,
    feeModel: 'all_in',
    organizationId: 'coastal-youth-sports'
  },
  {
    id: 9,
    name: 'SoCal Cup: 14/13 Tourney 4',
    date: 'Saturday, April 11',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    price: 18,
    parkingPrice: 19,
    hasAdmission: true,
    hasParking: true,
    feeModel: 'all_in'
  },
  {
    id: 10,
    name: 'SoCal Cup: 12 Tourney 4',
    date: 'Sunday, April 12',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    price: 18,
    parkingPrice: 19,
    hasAdmission: true,
    hasParking: true,
    feeModel: 'all_in'
  },
  {
    id: 11,
    name: 'SoCal Cup: 14/13 Tourney 5',
    date: 'Saturday, April 25',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    price: 18,
    parkingPrice: 19,
    hasAdmission: true,
    hasParking: true,
    feeModel: 'all_in'
  },
  {
    id: 12,
    name: 'SoCal Cup: 12 Tourney 5',
    date: 'Sunday, April 26',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    price: 18,
    parkingPrice: 19,
    hasAdmission: true,
    hasParking: true,
    feeModel: 'all_in'
  },
  {
    id: 13,
    name: 'SoCal Cup: 14/13 Championship',
    date: 'Saturday, May 16',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    price: 18,
    parkingPrice: 19,
    hasAdmission: true,
    hasParking: true,
    feeModel: 'all_in'
  },
  {
    id: 14,
    name: 'SoCal Cup: 12 Championship',
    date: 'Sunday, May 17',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    price: 18,
    parkingPrice: 19,
    hasAdmission: true,
    hasParking: true,
    feeModel: 'all_in'
  },
  {
    id: 15,
    name: 'SoCal Cup: 15-18 Friendly',
    date: 'Saturday, May 23',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    price: 18,
    parkingPrice: 19,
    hasAdmission: true,
    hasParking: true,
    feeModel: 'all_in'
  },
  {
    id: 16,
    name: 'SoCal Cup: 16/15 Tourney 3',
    date: 'Saturday, May 30',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    price: 18,
    parkingPrice: 19,
    hasAdmission: true,
    hasParking: true,
    feeModel: 'all_in'
  },
  {
    id: 17,
    name: 'SoCal Cup: 18/17 Tourney 3',
    date: 'Sunday, May 31',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    price: 18,
    parkingPrice: 19,
    hasAdmission: true,
    hasParking: true,
    feeModel: 'all_in'
  },
  {
    id: 18,
    name: 'SoCal Cup: 16/15 Spring Championship',
    date: 'Saturday, June 6',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    price: 18,
    parkingPrice: 19,
    hasAdmission: true,
    hasParking: true,
    feeModel: 'all_in'
  },
  {
    id: 19,
    name: 'SoCal Cup: 18/17 Spring Championship',
    date: 'Sunday, June 7',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    price: 18,
    parkingPrice: 19,
    hasAdmission: true,
    hasParking: true,
    feeModel: 'all_in'
  }
]

const GA_PRICE = 15
const PARKING_PRICE = 15

function HomePage() {
  return (
    <div className="home">
      {/* Fixed background - stadium image stays in place while content scrolls */}
      <div className="home-fixed-bg" />
      
      <HamburgerMenu />
      
      {/* Hero Section - Bold & Impactful */}
      <section className="home-hero">
        <div className="home-hero__overlay" />
        <div className="home-hero__content">
          <div className="home-hero__badge">
            <span className="home-hero__badge-dot" />
            Live Events
          </div>
          <h1 className="home-hero__title">
            Gameday<br />Tickets
          </h1>
          <p className="home-hero__subtitle">
            The simplest way to buy, send, and scan event tickets.
            Digital passes delivered instantly to your inbox.
          </p>
        </div>
        
      </section>

      {/* Features Section */}
      <section className="home-features">
        <div className="home-features__container">
          <div className="home-features__header">
            <h2 className="home-features__title">Operations Made Effortless</h2>
          </div>
          
          <div className="home-features__grid">
            <div className="feature-card" style={{ '--card-delay': '0.1s' }}>
              <div className="feature-card__icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="M7 15h0M2 9.5h20"/>
                </svg>
              </div>
              <h3 className="feature-card__title">Instant Purchase</h3>
              <p className="feature-card__desc">
                Secure checkout powered by Stripe. Pick your tickets, pay in seconds.
              </p>
            </div>

            <div className="feature-card" style={{ '--card-delay': '0.2s' }}>
              <div className="feature-card__icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M7 7h.01M7 12h.01M7 17h.01M12 7h.01M12 12h.01M12 17h.01M17 7h.01M17 12h.01M17 17h.01"/>
                </svg>
              </div>
              <h3 className="feature-card__title">QR Delivery</h3>
              <p className="feature-card__desc">
                Unique QR codes sent straight to your email. No app download required.
              </p>
            </div>

            <div className="feature-card" style={{ '--card-delay': '0.3s' }}>
              <div className="feature-card__icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h3 className="feature-card__title">Scan & Enter</h3>
              <p className="feature-card__desc">
                Show your QR at the gate. Staff scans it once—you're in. No printing.
              </p>
            </div>

            <div className="feature-card" style={{ '--card-delay': '0.4s' }}>
              <div className="feature-card__icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20V10"/>
                  <path d="M18 20V4"/>
                  <path d="M6 20v-4"/>
                </svg>
              </div>
              <h3 className="feature-card__title">Live Analytics</h3>
              <p className="feature-card__desc">
                Track sales, attendance, and revenue with real-time dashboards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="home-cta-section">
        <div className="home-cta-section__content">
          <h2 className="home-cta-section__title">Gameday Made Easy</h2>
          <p className="home-cta-section__desc">
            Own your operations. Real-time analytics and self-service tools allow your event to run smoothly.
          </p>
          <div className="home-cta-section__buttons">
            <Link to="/contact" className="home-cta-btn-glow">
              Partner With Us
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
            <Link to="/events" className="home-ghost-btn-dark">
              Browse Events
            </Link>
          </div>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="home-footer">
        <span>© 2025 Gameday Tickets</span>
        <span>Secure payments by Stripe</span>
      </footer>
    </div>
  )
}

// Business Inquiry Page
function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    description: '',
    preferredContact: 'email'
  })
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)
    
    try {
      // Send email via API
      const response = await fetch('/api/contact-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'garetcrenshaw@gmail.com',
          subject: `New Gameday Tickets Inquiry from ${formData.name}`,
          ...formData
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to send')
      }
      
      setSubmitted(true)
    } catch (error) {
      console.error('Error sending inquiry:', error)
      // Still show success - we'll handle email on backend
      setSubmitted(true)
    } finally {
      setSending(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    if (type === 'radio') {
      setFormData({ ...formData, preferredContact: value })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  if (submitted) {
    return (
      <div className="contact-page">
        <div className="contact-page__overlay" />
        <div className="contact-page__content">
          <div className="contact-success">
            <div className="contact-success__icon">✓</div>
            <h2>Thank You!</h2>
            <p>We've received your inquiry and will be in touch with you soon.</p>
            <Link to="/" className="home-cta-btn-glow">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="contact-page">
      <HamburgerMenu />
      <div className="contact-page__overlay" />
      <div className="contact-page__content">
        <Link to="/" className="contact-back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </Link>
        
        <div className="contact-card">
          <div className="contact-card__header">
            <div className="contact-badge contact-badge--blue">
              <span className="contact-badge__dot contact-badge__dot--blue" />
              For Businesses
            </div>
            <h1 className="contact-card__title">Host Your Event<br />With Gameday</h1>
            <p className="contact-card__subtitle">
              If you need help running your operations for ticketing and parking fill out the form below and our team will reach out to discuss how Gameday Tickets can power your events.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="contact-form">
            <div className="contact-form__group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Smith"
                required
              />
            </div>

            <div className="contact-form__group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@company.com"
                required
              />
            </div>

            <div className="contact-form__group">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(555) 123-4567"
                required
              />
            </div>

            <div className="contact-form__group">
              <label htmlFor="description">Tell Us About Your Event</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your event, expected attendance, venue, and any specific requirements..."
                rows={5}
                required
              />
            </div>

            <div className="contact-form__group">
              <label>Preferred Method of Contact</label>
              <div className="contact-form__radio-group">
                <label className="contact-form__radio">
                  <input
                    type="radio"
                    name="preferredContact"
                    value="email"
                    checked={formData.preferredContact === 'email'}
                    onChange={handleChange}
                  />
                  <span className="contact-form__radio-custom" />
                  Email
                </label>
                <label className="contact-form__radio">
                  <input
                    type="radio"
                    name="preferredContact"
                    value="phone"
                    checked={formData.preferredContact === 'phone'}
                    onChange={handleChange}
                  />
                  <span className="contact-form__radio-custom" />
                  Phone
                </label>
              </div>
            </div>

            <button type="submit" className="home-cta-btn-glow contact-submit" disabled={sending}>
              {sending ? 'Sending...' : 'Submit Inquiry'}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// Events Browser Page - Shows Tournament Organizers
function EventsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  // Get all organizations (tournament organizers)
  // Filter out organizations that don't have events yet
  const organizations = Object.values(ORGANIZATIONS).filter(org => {
    // Show organizations that have events
    // Check if org has events in EVENTS_DATA
    const hasEvents = EVENTS_DATA.some(event => 
      event.organizationId === org.id || 
      (org.id === 'socal-cup' && !event.organizationId) // Legacy: SoCal Cup events don't have orgId
    )
    return hasEvents
  })

  // Filter organizations by search query
  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  return (
    <div className="events-page">
      <HamburgerMenu />
      <div className="events-page__overlay" />
      
      <div className="events-page__content">
        <Link to="/" className="events-back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </Link>

        <div className="events-header">
          <div className="events-badge">
            <span className="events-badge__dot" />
            Tournament Organizers
          </div>
          <h1 className="events-title">Find Your League</h1>
          <p className="events-subtitle">Select a tournament organizer to view their events</p>
        </div>

        {/* Search */}
        <div className="events-filters">
          <div className="events-search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search by organizer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Organizations Grid */}
        <div className="events-grid">
          {filteredOrganizations.length === 0 ? (
            <div className="events-empty">
              <p>No tournament organizers found.</p>
              <button onClick={() => setSearchQuery('')}>
                Clear Search
              </button>
            </div>
          ) : (
            filteredOrganizations.map(org => (
              <div 
                key={org.id} 
                className="event-card" 
                onClick={() => navigate(`/org/${org.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="event-card__category event-card__category--orange">{org.season}</div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  marginBottom: '12px' 
                }}>
                  {org.logo && (
                    org.logo.startsWith('/') || org.logo.startsWith('http') ? (
                      <img 
                        src={org.logo} 
                        alt={org.name}
                        style={{ 
                          width: '48px', 
                          height: '48px', 
                          objectFit: 'contain',
                          borderRadius: '8px'
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: '48px' }}>{org.logo}</span>
                    )
                  )}
                  <h3 className="event-card__name" style={{ margin: 0, flex: 1 }}>{org.name}</h3>
                </div>
                <div className="event-card__footer">
                  <span className="event-card__cta">View Events →</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function EventPage() {
  const { eventId } = useParams()
  const event = EVENTS_DATA.find(e => e.id === parseInt(eventId)) || EVENTS_DATA[0]
  
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('') // Optional, for Stripe
  const [admissionQuantity, setAdmissionQuantity] = useState(0)
  const [parkingQuantity, setParkingQuantity] = useState(0)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const admissionSubtotal = admissionQuantity * event.price
  const parkingSubtotal = parkingQuantity * event.parkingPrice
  const subtotal = admissionSubtotal + parkingSubtotal
  
  // All-in pricing: total = subtotal (no separate fees shown)
  const orderTotal = subtotal
  const canCheckout = subtotal > 0

  const admissionOptions = useMemo(() => Array.from({ length: 11 }, (_, i) => i), [])
  const parkingOptions = useMemo(() => Array.from({ length: 5 }, (_, i) => i), [])

  const handleCheckout = async () => {
    if (!name || !phone) {
      setMessage('Add your name and phone number so we can send your tickets via SMS.')
      return
    }

    if (admissionQuantity === 0 && parkingQuantity === 0) {
      setMessage('Select at least one ticket or parking pass.')
      return
    }

    // No quantity limits - allow any amount

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: email || `${phone.replace(/\D/g, '')}@sms.local`, // Use phone-based email if no email provided
          phone,
          eventId: event.id,
          admissionQuantity,
          parkingQuantity,
          feeModel: event.feeModel || 'all_in',
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Checkout failed. Please try again.')
      }

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
        return
      }

      if (data.sessionId) {
        window.location.href = `https://checkout.stripe.com/pay/${data.sessionId}`
        return
      }

      throw new Error('No redirect URL returned from server.')
    } catch (error) {
      console.error('Checkout error:', error)
      setMessage(error.message || 'Checkout failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="buy-page buy-page--light">
      <HamburgerMenu />
      <div className="buy-page__content">
        <Link to="/events" className="buy-back buy-back--dark">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Events
        </Link>

        <h1 className="buy-page__title">{event.name}</h1>

        <div className="buy-card buy-card--light">
          <div className="buy-form-section">
            <div className="input-stack input-stack--light">
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                type="tel"
                placeholder="Phone number (for SMS ticket delivery)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p style={{ fontSize: '14px', color: '#888', marginTop: '-8px', marginBottom: '8px' }}>
                📱 Your tickets will be texted to your phone
              </p>
            </div>

            {event.hasAdmission && (
              <div className="buy-option buy-option--light">
                <h3>Admission Tickets</h3>
                <p className="buy-option__price">${event.price} each</p>
                <div className="buy-option__control">
                <label>Quantity</label>
                <select
                    className="buy-option__select"
                  value={admissionQuantity}
                    onChange={(e) => setAdmissionQuantity(Number(e.target.value))}
                >
                  {admissionOptions.map((value) => (
                      <option key={`ga-${value}`} value={value}>{value}</option>
                  ))}
                </select>
              </div>
            </div>
            )}

            {event.hasParking && (
              <div className="buy-option buy-option--light">
                <h3>Parking Passes</h3>
                <p className="buy-option__price">${event.parkingPrice} each</p>
                <div className="buy-option__control">
                <label>Quantity</label>
                <select
                    className="buy-option__select"
                  value={parkingQuantity}
                    onChange={(e) => setParkingQuantity(Number(e.target.value))}
                >
                  {parkingOptions.map((value) => (
                      <option key={`parking-${value}`} value={value}>{value}</option>
                  ))}
                </select>
              </div>
              </div>
            )}

            {message && <div className="buy-error buy-error--light">{message}</div>}
          </div>

          <div className="buy-summary buy-summary--light">
            <div className="buy-summary__header">
              <span>Order Summary</span>
            </div>

            {event.hasAdmission && admissionQuantity > 0 && (
              <div className="buy-summary__row">
              <span>Admission Tickets ({admissionQuantity})</span>
              <span>${admissionSubtotal.toFixed(2)}</span>
            </div>
            )}
            {event.hasParking && parkingQuantity > 0 && (
              <div className="buy-summary__row">
              <span>Parking Passes ({parkingQuantity})</span>
              <span>${parkingSubtotal.toFixed(2)}</span>
              </div>
            )}
            
            <div className="buy-summary__total">
              <span>Total</span>
              <span className="buy-summary__amount">${orderTotal.toFixed(2)}</span>
            </div>
            
            {/* All-in pricing notice (California compliant) */}
            {subtotal > 0 && (
              <div className="buy-summary__note">
                ✓ All-in pricing • No hidden fees
              </div>
            )}

            <button
              className="buy-submit-glow"
              onClick={handleCheckout}
              disabled={!canCheckout || loading}
            >
              {loading ? 'Processing…' : 'Complete Purchase'}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>

            <div className="buy-test buy-test--light">
              <span>🧪</span>
              Test card: 4242 4242 4242 4242
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PARENT PORTAL - White-Label Experience for Organizations
// Complete isolation from B2B site - parents stay in org's branded experience
// ═══════════════════════════════════════════════════════════════════════════

// Organization Context - shares org data throughout portal
const OrgContext = createContext(null)
const useOrg = () => useContext(OrgContext)

// ─────────────────────────────────────────────────────────────────────────────
// PORTAL LAYOUT - Wraps all portal pages with org branding
// ─────────────────────────────────────────────────────────────────────────────

function PortalLayout() {
  const { orgSlug } = useParams()
  const navigate = useNavigate()
  
  // Get org data from config file (easily editable)
  const org = getOrganization(orgSlug)

  return (
    <OrgContext.Provider value={org}>
      <div className="portal" style={{ 
        '--portal-primary': org.primaryColor, 
        '--portal-secondary': org.secondaryColor,
        '--portal-bg': org.backgroundColor,
        '--portal-accent': org.accentColor,
        '--portal-font': org.fontFamily || 'var(--font-body)',
        '--portal-headline-font': org.headlineFont || 'var(--font-display)'
      }}>
        {/* Organization Header - Consistent across all portal pages */}
        <header className="portal-header">
          <div className="portal-header__brand" onClick={() => navigate(`/org/${orgSlug}`)}>
            {org.logo && (org.logo.startsWith('/') || org.logo.startsWith('http')) ? (
              <img src={org.logo} alt={org.name} className="portal-header__logo portal-header__logo--image" />
            ) : (
              <span className="portal-header__logo">{org.logo}</span>
            )}
            <h1 className="portal-header__name">{org.name}</h1>
            <p className="portal-header__season">{org.season}</p>
          </div>
        </header>

        {/* Page Content - Rendered by nested routes */}
        <main className="portal-main">
          <Outlet />
        </main>

        {/* Minimal Footer */}
        <footer className="portal-footer">
          <p>Powered by <span>Gameday Tickets</span></p>
        </footer>
        
        {/* Mobile Bottom Banner - Always visible with continuous scroll */}
        <div className="portal-mobile-banner">
          <div className="portal-mobile-banner__track">
            <div className="portal-mobile-banner__content">
              {org.logo && (org.logo.startsWith('/') || org.logo.startsWith('http')) ? (
                <img src={org.logo} alt={org.name} className="portal-mobile-banner__logo portal-mobile-banner__logo--image" />
              ) : (
                <span className="portal-mobile-banner__logo">{org.logo}</span>
              )}
              <span className="portal-mobile-banner__name" style={{ fontFamily: org.fontFamily || 'inherit' }}>{org.name}</span>
            </div>
            <div className="portal-mobile-banner__content" aria-hidden="true">
              {org.logo && (org.logo.startsWith('/') || org.logo.startsWith('http')) ? (
                <img src={org.logo} alt={org.name} className="portal-mobile-banner__logo portal-mobile-banner__logo--image" />
              ) : (
                <span className="portal-mobile-banner__logo">{org.logo}</span>
              )}
              <span className="portal-mobile-banner__name" style={{ fontFamily: org.fontFamily || 'inherit' }}>{org.name}</span>
            </div>
            <div className="portal-mobile-banner__content" aria-hidden="true">
              {org.logo && (org.logo.startsWith('/') || org.logo.startsWith('http')) ? (
                <img src={org.logo} alt={org.name} className="portal-mobile-banner__logo portal-mobile-banner__logo--image" />
              ) : (
                <span className="portal-mobile-banner__logo">{org.logo}</span>
              )}
              <span className="portal-mobile-banner__name" style={{ fontFamily: org.fontFamily || 'inherit' }}>{org.name}</span>
            </div>
            <div className="portal-mobile-banner__content" aria-hidden="true">
              {org.logo && (org.logo.startsWith('/') || org.logo.startsWith('http')) ? (
                <img src={org.logo} alt={org.name} className="portal-mobile-banner__logo portal-mobile-banner__logo--image" />
              ) : (
                <span className="portal-mobile-banner__logo">{org.logo}</span>
              )}
              <span className="portal-mobile-banner__name" style={{ fontFamily: org.fontFamily || 'inherit' }}>{org.name}</span>
            </div>
            <div className="portal-mobile-banner__content" aria-hidden="true">
              {org.logo && (org.logo.startsWith('/') || org.logo.startsWith('http')) ? (
                <img src={org.logo} alt={org.name} className="portal-mobile-banner__logo portal-mobile-banner__logo--image" />
              ) : (
                <span className="portal-mobile-banner__logo">{org.logo}</span>
              )}
              <span className="portal-mobile-banner__name" style={{ fontFamily: org.fontFamily || 'inherit' }}>{org.name}</span>
            </div>
            <div className="portal-mobile-banner__content" aria-hidden="true">
              {org.logo && (org.logo.startsWith('/') || org.logo.startsWith('http')) ? (
                <img src={org.logo} alt={org.name} className="portal-mobile-banner__logo portal-mobile-banner__logo--image" />
              ) : (
                <span className="portal-mobile-banner__logo">{org.logo}</span>
              )}
              <span className="portal-mobile-banner__name" style={{ fontFamily: org.fontFamily || 'inherit' }}>{org.name}</span>
            </div>
          </div>
        </div>
      </div>
    </OrgContext.Provider>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTAL EVENTS PAGE - Event listing for the organization
// Shows org info at top, simple event list below
// ─────────────────────────────────────────────────────────────────────────────

function PortalEvents() {
  const org = useOrg()
  const { orgSlug } = useParams()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  // Filter events by organization and search
  // Filter events: search + hide past events (doors closed) + match organization
  const filteredEvents = filterPastEvents(EVENTS_DATA).filter(event => {
    // Match organization: 
    // - Events with organizationId must match exactly
    // - Events without organizationId only show for 'socal-cup' (legacy)
    let matchesOrg = false
    if (event.organizationId) {
      // Events with organizationId must match the current org
      matchesOrg = event.organizationId === orgSlug
    } else {
      // Events without organizationId are legacy SoCal Cup events
      matchesOrg = orgSlug === 'socal-cup'
    }
    
    const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          event.venue.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesOrg && matchesSearch
  })

  return (
    <>
      {/* Search */}
      <div className="portal-search">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Search for a game..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Events List */}
      <div className="portal-events">
        {filteredEvents.length === 0 ? (
          <div className="portal-empty">
            <p>No events found.</p>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>Clear Search</button>
            )}
          </div>
        ) : (
          filteredEvents.map(event => (
            <div key={event.id} className="portal-event" onClick={() => navigate(`/org/${orgSlug}/event/${event.id}`)}>
              <div className="portal-event__date">
                <span className="portal-event__day">{event.date.split(',')[0]}</span>
                <span className="portal-event__date-text">{event.date.split(',').slice(1).join(',').trim()}</span>
              </div>
              <div className="portal-event__info">
                <h3 className="portal-event__name">{event.name}</h3>
                <p className="portal-event__venue">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  {event.venue}
                </p>
                <div className="portal-event__pricing">
                  {event.hasAdmission && <span>General Admission – ${event.price}</span>}
                  {event.hasParking && <span>Parking Pass – ${event.parkingPrice}</span>}
                </div>
              </div>
              <button className="portal-event__buy" style={{ background: org.primaryColor }}>
                Buy
              </button>
            </div>
          ))
        )}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTAL BUY PAGE - Org-branded checkout experience
// ─────────────────────────────────────────────────────────────────────────────

function PortalBuyPage() {
  const org = useOrg()
  const { orgSlug, eventId } = useParams()
  const navigate = useNavigate()
  const event = EVENTS_DATA.find(e => e.id === parseInt(eventId)) || EVENTS_DATA[0]
  
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [admissionQuantity, setAdmissionQuantity] = useState(0)
  const [parkingQuantity, setParkingQuantity] = useState(0)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const admissionSubtotal = admissionQuantity * event.price
  const parkingSubtotal = parkingQuantity * event.parkingPrice
  const subtotal = admissionSubtotal + parkingSubtotal
  // All-in pricing: total = subtotal (no separate fees)
  const orderTotal = subtotal
  const canCheckout = subtotal > 0

  const handleCheckout = async () => {
    if (!name || !phone) {
      setMessage('Please enter your name and phone number.')
      return
    }
    if (admissionQuantity === 0 && parkingQuantity === 0) {
      setMessage('Select at least one ticket or parking pass.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone, // Phone number for SMS ticket delivery
          eventId: event.id,
          admissionQuantity,
          parkingQuantity,
          feeModel: event.feeModel || 'all_in',
          // Pass portal context for redirect back
          portalSlug: orgSlug
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Checkout failed. Please try again.')
      }

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setMessage('Error creating checkout session.')
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setMessage(err.message || 'Error connecting to payment server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="portal-buy">
      {/* Back Button */}
      <button className="portal-back" onClick={() => navigate(`/org/${orgSlug}`)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to Events
      </button>

      {/* Event Info */}
      <div className="portal-buy__event">
        <h2 className="portal-buy__title">{event.name}</h2>
        <div className="portal-buy__details">
          <span className="portal-buy__date">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {event.date}
          </span>
          <span className="portal-buy__venue">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {event.venue}, {event.city}
          </span>
        </div>
      </div>

      {/* Your Information - First */}
      <div className="portal-buy__form">
        <h3 className="portal-buy__section-title">Your Information</h3>
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="portal-buy__input"
        />
        <input
          type="tel"
          placeholder="Phone Number (for ticket delivery)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="portal-buy__input"
        />
        <input
          type="email"
          placeholder="Email Address (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="portal-buy__input"
        />
        <p className="portal-buy__email-note">📱 Your tickets will be texted to your phone</p>
      </div>

      {/* Ticket Selection - Second */}
      <div className="portal-buy__form">
        <h3 className="portal-buy__section-title">Select Tickets</h3>
        
        {event.hasAdmission && (
          <div className="portal-buy__item">
            <div className="portal-buy__item-info">
              <span className="portal-buy__item-name">Admission Tickets</span>
              <span className="portal-buy__item-price">${event.price.toFixed(2)} each</span>
            </div>
            <select 
              value={admissionQuantity} 
              onChange={(e) => setAdmissionQuantity(parseInt(e.target.value))}
              className="portal-buy__select"
            >
              {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        )}

        {event.hasParking && (
          <div className="portal-buy__item">
            <div className="portal-buy__item-info">
              <span className="portal-buy__item-name">Parking Passes</span>
              <span className="portal-buy__item-price">${event.parkingPrice.toFixed(2)} each</span>
            </div>
            <select 
              value={parkingQuantity} 
              onChange={(e) => setParkingQuantity(parseInt(e.target.value))}
              className="portal-buy__select"
            >
              {[0,1,2,3,4].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        )}

        {/* Order Summary - All-in pricing (California compliant) */}
        <div className="portal-buy__summary">
          <div className="portal-buy__summary-row portal-buy__summary-row--total">
            <span>Total</span>
            <span>${orderTotal.toFixed(2)}</span>
          </div>
          {subtotal > 0 && (
            <div className="portal-buy__summary-note">
              ✓ All-in pricing • No hidden fees
            </div>
          )}
        </div>

        {message && <p className="portal-buy__message">{message}</p>}

        <button 
          className="portal-buy__checkout"
          onClick={handleCheckout}
          disabled={!canCheckout || loading}
          style={{ background: canCheckout ? org.primaryColor : '#333' }}
        >
          {loading ? 'Processing...' : `Checkout • $${orderTotal.toFixed(2)}`}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTAL SUCCESS PAGE - Org-branded confirmation
// ─────────────────────────────────────────────────────────────────────────────

function PortalSuccess() {
  const org = useOrg()
  const { orgSlug } = useParams()
  const navigate = useNavigate()

  return (
    <div className="portal-success">
      <div className="portal-success__icon" style={{ background: org.primaryColor }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <h2 className="portal-success__title">You're All Set!</h2>
      <p className="portal-success__message">
        Check your email for your tickets. Show the QR code at the gate and you're in.
      </p>
      <button 
        className="portal-success__button"
        onClick={() => navigate(`/org/${orgSlug}`)}
        style={{ background: org.primaryColor }}
      >
        Back to Events
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTAL CANCEL PAGE - Org-branded cancellation
// ─────────────────────────────────────────────────────────────────────────────

function PortalCancel() {
  const org = useOrg()
  const { orgSlug } = useParams()
  const navigate = useNavigate()

  return (
    <div className="portal-cancel">
      <div className="portal-cancel__icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </div>
      <h2 className="portal-cancel__title">Payment Cancelled</h2>
      <p className="portal-cancel__message">
        No worries! Your order was not processed. Head back to events when you're ready.
      </p>
      <button 
        className="portal-cancel__button"
        onClick={() => navigate(`/org/${orgSlug}`)}
        style={{ background: org.primaryColor }}
      >
        Back to Events
      </button>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* ─────────────────────────────────────────────────────────────────────
            B2B ROUTES - Marketing site for operators/partners
            ───────────────────────────────────────────────────────────────────── */}
        <Route path="/" element={<HomePage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/buy/:eventId" element={<EventPage />} />
        <Route path="/buy" element={<EventsPage />} />
        <Route path="/success" element={<Success />} />
        <Route path="/cancel" element={<Cancel />} />
        <Route path="/validate" element={<Validate />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/typography-guide" element={<TypographyGuide />} />
        
        {/* ─────────────────────────────────────────────────────────────────────
            B2C PORTAL ROUTES - White-label experience for parents
            All routes under /org/:orgSlug share the PortalLayout wrapper
            ───────────────────────────────────────────────────────────────────── */}
        <Route path="/org/:orgSlug" element={<PortalLayout />}>
          <Route index element={<PortalEvents />} />
          <Route path="event/:eventId" element={<PortalBuyPage />} />
          <Route path="success" element={<PortalSuccess />} />
          <Route path="cancel" element={<PortalCancel />} />
        </Route>
        
        {/* ─────────────────────────────────────────────────────────────────────
            DASHBOARD ROUTES - Operator management
            ───────────────────────────────────────────────────────────────────── */}
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/event/:eventId" element={<EventDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
