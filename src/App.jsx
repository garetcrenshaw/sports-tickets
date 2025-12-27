import { useMemo, useState, useEffect, useCallback, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams, useLocation, Outlet } from 'react-router-dom'
import Validate from './pages/Validate'
import Success from './pages/Success'
import Cancel from './pages/Cancel'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import EventDashboard from './pages/EventDashboard'
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
          </div>
        </>
      )}
    </div>
  )
}

// Platform fee configuration
const PLATFORM_FEE_PERCENT = 0.015  // 1.5%
const PLATFORM_FEE_FLAT = 0.50      // $0.50 per ticket
const SERVICE_FEE_DISPLAY = 1.50    // $1.50 flat fee shown to buyer (simplified)

// Events data - Real events only
const EVENTS_DATA = [
  {
    id: 1,
    name: 'Gameday Empire Showcase',
    date: 'Saturday, December 28',
    time: '7:30 PM',
    venue: 'Downtown Arena',
    city: 'Los Angeles, CA',
    category: 'Basketball',
    price: 15,
    parkingPrice: 15,
    hasAdmission: true,
    hasParking: true,
    // Fee model: 'pass_through' = buyer pays fee separately, 'baked_in' = fee included in price
    feeModel: 'pass_through',
    serviceFee: SERVICE_FEE_DISPLAY  // $1.50 per ticket shown to buyer
  },
  {
    id: 2,
    name: 'Sportsplex Showdown',
    date: 'Sunday, January 5',
    time: '6:00 PM',
    venue: 'Sportsplex Center',
    city: 'Los Angeles, CA',
    category: 'Sports',
    price: 0,
    parkingPrice: 15,
    hasAdmission: false,
    hasParking: true,
    // Fee model: baked_in = venue's price includes platform fee
    feeModel: 'baked_in',
    serviceFee: 0  // No visible fee to buyer
  },
  {
    id: 3,
    name: 'Sportsplex Event',
    date: 'Saturday, January 11',
    time: '4:00 PM',
    venue: 'Sportsplex Center',
    city: 'Los Angeles, CA',
    category: 'Sports',
    price: 15,
    parkingPrice: 0,
    hasAdmission: true,
    hasParking: false,
    feeModel: 'baked_in',
    serviceFee: 0
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
          <div className="home-hero__cta">
            <Link to="/events" className="home-cta-btn-glow">
              Get Tickets
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
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

// Generate months for the next year
function getMonthOptions() {
  const months = ['all']
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' })
    months.push(monthName)
  }
  return months
}

// Events Browser Page
function EventsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const navigate = useNavigate()

  const categories = ['all', ...new Set(EVENTS_DATA.map(e => e.category))]
  const months = getMonthOptions()

  const filteredEvents = EVENTS_DATA.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          event.venue.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter
    // Check if event date contains the selected month
    const matchesMonth = monthFilter === 'all' || event.date.toLowerCase().includes(monthFilter.split(' ')[0].toLowerCase())
    return matchesSearch && matchesCategory && matchesMonth
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
            Browse Events
          </div>
          <h1 className="events-title">Find Your Event</h1>
          <p className="events-subtitle">Search by name, filter by date or category</p>
        </div>

        {/* Search and Filters */}
        <div className="events-filters">
          <div className="events-search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search by event name or venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="events-filter-row">
            <div className="events-filter-group">
              <label>Category</label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Events' : cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="events-filter-group">
              <label>Month</label>
              <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
                {months.map(month => (
                  <option key={month} value={month}>
                    {month === 'all' ? 'All Months' : month}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Events Grid */}
        <div className="events-grid">
          {filteredEvents.length === 0 ? (
            <div className="events-empty">
              <p>No events found matching your criteria.</p>
              <button onClick={() => { setSearchQuery(''); setCategoryFilter('all'); setMonthFilter('all'); }}>
                Clear Filters
              </button>
            </div>
          ) : (
            filteredEvents.map(event => (
              <div key={event.id} className="event-card" onClick={() => navigate(`/buy/${event.id}`)}>
                <div className="event-card__category event-card__category--orange">{event.category}</div>
                <h3 className="event-card__name">{event.name}</h3>
                <div className="event-card__details">
                  <span className="event-card__date">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    {event.date}
                  </span>
                </div>
                <div className="event-card__venue">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  {event.venue}, {event.city}
                </div>
                <div className="event-card__footer">
                  <span className="event-card__cta">Get Tickets →</span>
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
  const [email, setEmail] = useState('')
  const [admissionQuantity, setAdmissionQuantity] = useState(0)
  const [parkingQuantity, setParkingQuantity] = useState(0)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const admissionSubtotal = admissionQuantity * event.price
  const parkingSubtotal = parkingQuantity * event.parkingPrice
  const subtotal = admissionSubtotal + parkingSubtotal
  
  // Calculate service fee (only for pass_through model)
  const totalTickets = admissionQuantity + parkingQuantity
  const serviceFee = event.feeModel === 'pass_through' ? totalTickets * (event.serviceFee || SERVICE_FEE_DISPLAY) : 0
  const orderTotal = subtotal + serviceFee
  const canCheckout = subtotal > 0

  const admissionOptions = useMemo(() => Array.from({ length: 11 }, (_, i) => i), [])
  const parkingOptions = useMemo(() => Array.from({ length: 5 }, (_, i) => i), [])

  const handleCheckout = async () => {
    if (!name || !email) {
      setMessage('Add your name and email so we know where to send your passes.')
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
          email,
          eventId: event.id,
          admissionQuantity,
          parkingQuantity,
          feeModel: event.feeModel,
          serviceFeePerTicket: event.serviceFee || 0,
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
                type="email"
                placeholder={event.hasAdmission && event.hasParking ? "Email for tickets + parking" : event.hasAdmission ? "Email for tickets" : "Email for parking"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {event.hasAdmission && (
              <div className="buy-option buy-option--light">
                <h3>General Admission – ${event.price} each</h3>
                <div className="buy-option__control">
                <label>Tickets</label>
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
                <h3>Parking Pass – ${event.parkingPrice} each</h3>
                <div className="buy-option__control">
                <label>Parking</label>
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

            {event.hasAdmission && (
              <div className="buy-summary__row">
              <span>General Admission × {admissionQuantity}</span>
              <span>${admissionSubtotal.toFixed(2)}</span>
            </div>
            )}
            {event.hasParking && (
              <div className="buy-summary__row">
              <span>Parking Pass × {parkingQuantity}</span>
              <span>${parkingSubtotal.toFixed(2)}</span>
              </div>
            )}
            
            {/* Show service fee for pass_through model */}
            {event.feeModel === 'pass_through' && serviceFee > 0 && (
              <div className="buy-summary__row buy-summary__row--fee">
                <span>Service Fee × {totalTickets}</span>
                <span>${serviceFee.toFixed(2)}</span>
              </div>
            )}

            <div className="buy-summary__total">
              <span>Total</span>
              <span className="buy-summary__amount">${orderTotal.toFixed(2)}</span>
            </div>
            
            {/* Show fee notice for baked_in model */}
            {event.feeModel === 'baked_in' && subtotal > 0 && (
              <div className="buy-summary__note">
                No additional fees
              </div>
            )}

            <button
              className="buy-submit-glow"
              onClick={handleCheckout}
              disabled={!canCheckout || loading}
            >
              {loading ? 'Routing to Stripe…' : 'Complete Purchase'}
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

// Mock organization data - in production this comes from API
const ORGANIZATIONS = {
  'springfield-little-league': {
    id: 'springfield-little-league',
    name: 'Springfield Little League',
    logo: '⚾',
    season: 'Spring 2025 Season',
    primaryColor: '#f97316',
    secondaryColor: '#ea580c'
  },
  'downtown-youth-basketball': {
    id: 'downtown-youth-basketball',
    name: 'Downtown Youth Basketball',
    logo: '🏀',
    season: '2024-25 Season',
    primaryColor: '#3b82f6',
    secondaryColor: '#2563eb'
  },
  'gameday-empire': {
    id: 'gameday-empire',
    name: 'Gameday Empire',
    logo: '🏆',
    season: 'Current Events',
    primaryColor: '#f97316',
    secondaryColor: '#ea580c'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTAL LAYOUT - Wraps all portal pages with org branding
// ─────────────────────────────────────────────────────────────────────────────

function PortalLayout() {
  const { orgSlug } = useParams()
  const navigate = useNavigate()
  
  // Get org data or generate from slug
  const org = ORGANIZATIONS[orgSlug] || {
    id: orgSlug,
    name: orgSlug?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Events',
    logo: '🎟️',
    season: 'Upcoming Events',
    primaryColor: '#f97316',
    secondaryColor: '#ea580c'
  }

  return (
    <OrgContext.Provider value={org}>
      <div className="portal" style={{ '--portal-primary': org.primaryColor, '--portal-secondary': org.secondaryColor }}>
        {/* Organization Header - Consistent across all portal pages */}
        <header className="portal-header">
          <div className="portal-header__brand" onClick={() => navigate(`/org/${orgSlug}`)}>
            <span className="portal-header__logo">{org.logo}</span>
            <div className="portal-header__info">
              <h1 className="portal-header__name">{org.name}</h1>
              <p className="portal-header__season">{org.season}</p>
            </div>
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
      </div>
    </OrgContext.Provider>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTAL EVENTS PAGE - Event listing for the organization
// ─────────────────────────────────────────────────────────────────────────────

function PortalEvents() {
  const org = useOrg()
  const { orgSlug } = useParams()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  // Filter events (in production, filter by org)
  const filteredEvents = EVENTS_DATA.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          event.venue.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
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
                <span className="portal-event__time">{event.time}</span>
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
  const [admissionQuantity, setAdmissionQuantity] = useState(0)
  const [parkingQuantity, setParkingQuantity] = useState(0)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const admissionSubtotal = admissionQuantity * event.price
  const parkingSubtotal = parkingQuantity * event.parkingPrice
  const subtotal = admissionSubtotal + parkingSubtotal
  const totalTickets = admissionQuantity + parkingQuantity
  const serviceFee = event.feeModel === 'pass_through' ? totalTickets * (event.serviceFee || SERVICE_FEE_DISPLAY) : 0
  const orderTotal = subtotal + serviceFee
  const canCheckout = subtotal > 0

  const handleCheckout = async () => {
    if (!name || !email) {
      setMessage('Please enter your name and email.')
      return
    }
    if (admissionQuantity === 0 && parkingQuantity === 0) {
      setMessage('Select at least one ticket or parking pass.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${API_URL}/api/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          eventName: event.name,
          admissionQuantity,
          parkingQuantity,
          admissionPrice: event.price,
          parkingPrice: event.parkingPrice,
          customerName: name,
          customerEmail: email,
          feeModel: event.feeModel,
          serviceFee: event.serviceFee || SERVICE_FEE_DISPLAY,
          // Pass portal context for redirect back
          portalSlug: orgSlug
        })
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setMessage('Error creating checkout session.')
      }
    } catch (err) {
      setMessage('Error connecting to payment server.')
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
            {event.date} at {event.time}
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

      {/* Ticket Selection */}
      <div className="portal-buy__form">
        <h3 className="portal-buy__section-title">Select Tickets</h3>
        
        {event.hasAdmission && (
          <div className="portal-buy__item">
            <div className="portal-buy__item-info">
              <span className="portal-buy__item-name">General Admission</span>
              <span className="portal-buy__item-price">${event.price.toFixed(2)}</span>
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
              <span className="portal-buy__item-name">Parking Pass</span>
              <span className="portal-buy__item-price">${event.parkingPrice.toFixed(2)}</span>
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

        <h3 className="portal-buy__section-title">Your Information</h3>
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="portal-buy__input"
        />
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="portal-buy__input"
        />
        <p className="portal-buy__email-note">Your tickets will be sent here</p>

        {/* Order Summary */}
        <div className="portal-buy__summary">
          <div className="portal-buy__summary-row">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {serviceFee > 0 && (
            <div className="portal-buy__summary-row portal-buy__summary-row--fee">
              <span>Service Fee</span>
              <span>${serviceFee.toFixed(2)}</span>
            </div>
          )}
          <div className="portal-buy__summary-row portal-buy__summary-row--total">
            <span>Total</span>
            <span>${orderTotal.toFixed(2)}</span>
          </div>
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
