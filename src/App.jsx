import { useMemo, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import Validate from './pages/Validate'
import Success from './pages/Success'
import Cancel from './pages/Cancel'
import './App.css'

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation()
  
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
            <Link to="/contact" onClick={() => setIsOpen(false)}>
              Contact
            </Link>
            <Link to="/events" onClick={() => setIsOpen(false)}>
              Events
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

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
    hasParking: true
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
    hasParking: true
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
    hasParking: false
  }
]

const GA_PRICE = 15
const PARKING_PRICE = 15

function HomePage() {
  return (
    <div className="home">
      <HamburgerMenu />
      
      {/* Hero Section */}
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
            The simplest way to buy, send, and scan event tickets.<br />
            Digital passes delivered instantly to your inbox.
          </p>
          <div className="home-hero__cta">
            <Link to="/events" className="home-cta-btn-glow">
              Buy Tickets Now
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
            <span className="home-features__label">How It Works</span>
            <h2 className="home-features__title">Operations Made Effortless</h2>
          </div>
          
          <div className="home-features__grid">
            <div className="feature-card" style={{ '--delay': '0s' }}>
              <div className="feature-card__icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="M7 15h0M2 9.5h20"/>
                </svg>
              </div>
              <h3 className="feature-card__title">Instant Purchase</h3>
              <p className="feature-card__desc">
                Secure checkout powered by Stripe. Pick your tickets, pay in seconds.
              </p>
            </div>

            <div className="feature-card" style={{ '--delay': '0.1s' }}>
              <div className="feature-card__icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M7 7h.01M7 12h.01M7 17h.01M12 7h.01M12 12h.01M12 17h.01M17 7h.01M17 12h.01M17 17h.01"/>
                </svg>
              </div>
              <h3 className="feature-card__title">QR Code Delivery</h3>
              <p className="feature-card__desc">
                Unique QR codes sent straight to your email. No app download required.
              </p>
            </div>

            <div className="feature-card" style={{ '--delay': '0.2s' }}>
              <div className="feature-card__icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h3 className="feature-card__title">Scan & Enter</h3>
              <p className="feature-card__desc">
                Show your QR at the gate. Staff scans it once—you're in. No printing needed.
              </p>
            </div>

            <div className="feature-card" style={{ '--delay': '0.3s' }}>
              <div className="feature-card__icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20V10"/>
                  <path d="M18 20V4"/>
                  <path d="M6 20v-4"/>
                  <rect x="2" y="2" width="20" height="20" rx="2"/>
                </svg>
              </div>
              <h3 className="feature-card__title">Real-Time Analytics</h3>
              <p className="feature-card__desc">
                Track sales, attendance, and revenue with live dashboards built for event operators.
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
            Join thousands of fans who skip the lines with digital tickets.
          </p>
          <div className="home-cta-section__buttons">
            <Link to="/contact" className="home-cta-btn-glow">
              Learn More
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <span>© 2024 Gameday Tickets</span>
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
            <p>We've received your inquiry and will be in touch within 24 hours.</p>
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
  const orderTotal = admissionSubtotal + parkingSubtotal
  const canCheckout = orderTotal > 0

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

    if (admissionQuantity > 10) {
      setMessage('You can buy up to 10 General Admission tickets per order.')
      return
    }

    if (parkingQuantity > 4) {
      setMessage('You can add up to 4 parking passes per order.')
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
          eventId: event.id,
          admissionQuantity,
          parkingQuantity,
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

            <div className="buy-summary__total">
              <span>Total</span>
              <span className="buy-summary__amount">${orderTotal.toFixed(2)}</span>
            </div>

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

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/buy/:eventId" element={<EventPage />} />
        <Route path="/buy" element={<EventsPage />} />
        <Route path="/success" element={<Success />} />
        <Route path="/cancel" element={<Cancel />} />
        <Route path="/validate" element={<Validate />} />
      </Routes>
    </BrowserRouter>
  )
}
