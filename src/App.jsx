import { useMemo, useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Validate from './pages/Validate'
import Success from './pages/Success'
import Cancel from './pages/Cancel'
import './App.css'

const EVENT = {
  id: 1,
  name: 'Gameday Empire Showcase',
  date: 'Saturday, December 28 • Tipoff 7:30 PM',
  venue: 'Downtown Arena',
  city: 'Los Angeles, CA',
  heroTagline: '$15 admission · $15 parking'
}

const GA_PRICE = 15
const PARKING_PRICE = 15

function LandingPage() {
  return (
    <div className="landing">
      <div className="landing__grid">
        <div className="landing__card">
          <div className="landing__badge">
            <span>🏟</span>
            GAMEDAY TICKETS
          </div>
          <h1 className="landing__title">
            Gameday Tickets + Parking
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.1rem', lineHeight: 1.6 }}>
            $15 admission · $15 parking
          </p>
          <div className="landing__cta">
            <Link to="/tickets" className="primary-btn">
              Buy Tickets Here →
            </Link>
            <Link to="/validate" className="ghost-btn">
              Staff Access
            </Link>
          </div>
          <div className="landing__cta-note">
            ⭐ Most fans choose Gameday All-Access to skip traffic + parking headaches.
          </div>
        </div>
        <div className="landing__card" style={{ padding: 0, overflow: 'hidden' }}>
          <img
            src="https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=1200&q=80"
            alt="Fans celebrating a win"
          />
        </div>
      </div>
    </div>
  )
}

function EventPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [admissionQuantity, setAdmissionQuantity] = useState(0)
  const [parkingQuantity, setParkingQuantity] = useState(0)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const admissionSubtotal = admissionQuantity * GA_PRICE
  const parkingSubtotal = parkingQuantity * PARKING_PRICE
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
          eventId: EVENT.id,
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
    <div className="event-page app-shell">
      <section className="event-hero">
        <div className="event-hero__badge">
          <span>🔥</span> Gameday All-Access
        </div>
        <h1 className="event-hero__title">{EVENT.name}</h1>
        <p style={{ fontSize: '1.2rem', margin: '0 auto', maxWidth: 600 }}>{EVENT.heroTagline}</p>
        <div className="event-hero__meta">
          <span>📅 {EVENT.date}</span>
          <span>📍 {EVENT.venue}, {EVENT.city}</span>
        </div>
      </section>

      <div className="event-shell">
      <div className="simple-shell">
        <div className="simple-card">
          <div className="simple-section">
            <div className="input-stack" style={{ marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <input
                type="email"
                placeholder="Email for tickets + parking"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="simple-option">
              <div>
                <h3 style={{ margin: '0 0 4px 0' }}>General Admission – $15 each</h3>
                <p style={{ margin: 0, color: '#475569' }}>Lower bowl seats. Everyone needs a ticket.</p>
              </div>
              <div className="quantity-control" style={{ marginTop: '12px' }}>
                <label>Tickets</label>
                <select
                  value={admissionQuantity}
                  onChange={(event) => setAdmissionQuantity(Number(event.target.value))}
                >
                  {admissionOptions.map((value) => (
                    <option key={`ga-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="simple-option">
              <div>
                <h3 style={{ margin: '0 0 4px 0' }}>Parking Pass – $15 each</h3>
                <p style={{ margin: 0, color: '#475569' }}>One pass covers one car in Lot VIP.</p>
              </div>
              <div className="quantity-control" style={{ marginTop: '12px' }}>
                <label>Parking</label>
                <select
                  value={parkingQuantity}
                  onChange={(event) => setParkingQuantity(Number(event.target.value))}
                >
                  {parkingOptions.map((value) => (
                    <option key={`parking-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {message && (
              <div className="error-banner">
                {message}
              </div>
            )}

            <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '16px' }}>
              Each person needs a ticket. One parking pass = one car.
            </p>
          </div>

          <div className="simple-summary-block">
            <div>
              <p style={{ margin: 0, textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                Order summary
              </p>
              <h3 style={{ marginTop: 8, marginBottom: 0 }}>
                Updated instantly
              </h3>
            </div>

            <div className="summary-row">
              <span>General Admission × {admissionQuantity}</span>
              <span>${admissionSubtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Parking Pass × {parkingQuantity}</span>
              <span>${parkingSubtotal.toFixed(2)}</span>
            </div>

            <div>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)' }}>Total due now</p>
              <div className="summary-total">
                ${orderTotal.toFixed(2)}
              </div>
            </div>

            <button
              className="primary-btn"
              onClick={handleCheckout}
              disabled={!canCheckout || loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Routing to Stripe…' : 'Complete Purchase →'}
            </button>

            <div className="test-banner" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <span>🧪</span>
              Use test card 4242 4242 4242 4242 · any future expiry · any CVC
            </div>
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
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/tickets" element={<EventPage />} />
        <Route path="/success" element={<Success />} />
        <Route path="/cancel" element={<Cancel />} />
        <Route path="/validate" element={<Validate />} />
      </Routes>
    </BrowserRouter>
  )
}
