import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import '../tickets.css'

/**
 * TICKET VIEWING PAGE
 * 
 * Accessed via SMS link: /tickets?order=SESSION_ID
 * Shows all tickets for an order in a swipeable card format
 * 
 * Features:
 * - Swipeable ticket cards (mobile-optimized)
 * - Event-specific branding (colors from org config)
 * - QR codes for each ticket
 * - Works offline once loaded
 */

export default function Tickets() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order')
  
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [eventInfo, setEventInfo] = useState(null)
  
  // Touch handling for swipe
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  useEffect(() => {
    if (!orderId) {
      setError('No order ID provided')
      setLoading(false)
      return
    }

    fetchTickets()
  }, [orderId])

  const fetchTickets = async () => {
    try {
      const response = await fetch(`/api/get-tickets?order=${orderId}`)
      
      if (!response.ok) {
        throw new Error('Could not find your tickets')
      }

      const data = await response.json()
      
      if (!data.tickets || data.tickets.length === 0) {
        throw new Error('No tickets found for this order')
      }

      setTickets(data.tickets)
      setEventInfo(data.event)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching tickets:', err)
      setError(err.message || 'Failed to load tickets')
      setLoading(false)
    }
  }

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current
    const threshold = 50 // Minimum swipe distance

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex < tickets.length - 1) {
        // Swiped left - next ticket
        setCurrentIndex(currentIndex + 1)
      } else if (diff < 0 && currentIndex > 0) {
        // Swiped right - previous ticket
        setCurrentIndex(currentIndex - 1)
      }
    }
  }

  const goToTicket = (index) => {
    setCurrentIndex(index)
  }

  // Loading state
  if (loading) {
    return (
      <div className="tickets-page tickets-page--loading">
        <div className="tickets-loader">
          <div className="tickets-loader__spinner" />
          <p>Loading your tickets...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="tickets-page tickets-page--error">
        <div className="tickets-error">
          <div className="tickets-error__icon">❌</div>
          <h2>Oops!</h2>
          <p>{error}</p>
          <p className="tickets-error__help">
            If you just made a purchase, your tickets may still be processing. 
            Try again in a minute or check your text messages for a new link.
          </p>
        </div>
      </div>
    )
  }

  const currentTicket = tickets[currentIndex]
  const isParking = currentTicket?.ticket_type?.toLowerCase().includes('parking')

  return (
    <div 
      className="tickets-page"
      style={{
        '--event-primary': eventInfo?.primaryColor || '#32cd32',
        '--event-secondary': eventInfo?.secondaryColor || '#228b22',
      }}
    >
      {/* Event Header */}
      <header className="tickets-header">
        {eventInfo?.logo && (
          <img 
            src={eventInfo.logo} 
            alt={eventInfo.name} 
            className="tickets-header__logo"
          />
        )}
        <h1 className="tickets-header__title">{eventInfo?.name || 'Event'}</h1>
        <p className="tickets-header__subtitle">{eventInfo?.date || ''}</p>
      </header>

      {/* Ticket Counter */}
      <div className="tickets-counter">
        <span className="tickets-counter__current">{currentIndex + 1}</span>
        <span className="tickets-counter__separator">/</span>
        <span className="tickets-counter__total">{tickets.length}</span>
        <span className="tickets-counter__label">tickets</span>
      </div>

      {/* Swipeable Ticket Card */}
      <div 
        className="tickets-card-container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className={`tickets-card ${isParking ? 'tickets-card--parking' : 'tickets-card--admission'}`}
        >
          {/* Ticket Type Badge */}
          <div className="tickets-card__badge">
            {isParking ? '🚗 PARKING' : '🎟️ ADMISSION'}
          </div>

          {/* QR Code */}
          <div className="tickets-card__qr-container">
            {currentTicket.qr_url ? (
              <img 
                src={currentTicket.qr_url} 
                alt="Ticket QR Code"
                className="tickets-card__qr"
              />
            ) : (
              <div className="tickets-card__qr-placeholder">
                <p>QR Code Loading...</p>
              </div>
            )}
          </div>

          {/* Ticket Details */}
          <div className="tickets-card__details">
            <p className="tickets-card__type">{currentTicket.ticket_type}</p>
            <p className="tickets-card__holder">{currentTicket.buyer_name}</p>
          </div>

          {/* Ticket ID (small) */}
          <p className="tickets-card__id">
            ID: {currentTicket.ticket_id?.slice(-12) || 'N/A'}
          </p>

          {/* Status indicator */}
          <div className={`tickets-card__status ${currentTicket.status === 'used' ? 'tickets-card__status--used' : ''}`}>
            {currentTicket.status === 'used' ? '✓ SCANNED' : 'VALID'}
          </div>
        </div>

        {/* Swipe Hint (only show if multiple tickets) */}
        {tickets.length > 1 && (
          <p className="tickets-swipe-hint">
            ← Swipe to see {currentIndex === 0 ? 'next' : currentIndex === tickets.length - 1 ? 'previous' : 'other'} ticket →
          </p>
        )}
      </div>

      {/* Dot Indicators */}
      {tickets.length > 1 && (
        <div className="tickets-dots">
          {tickets.map((_, index) => (
            <button
              key={index}
              className={`tickets-dot ${index === currentIndex ? 'tickets-dot--active' : ''}`}
              onClick={() => goToTicket(index)}
              aria-label={`Go to ticket ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <footer className="tickets-footer">
        <p>Powered by <strong>Gameday Tickets</strong></p>
        <p className="tickets-footer__instructions">
          Show this QR code at the gate for entry
        </p>
      </footer>
    </div>
  )
}

