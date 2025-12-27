import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://xjvzehjpgbwiiuvsnflk.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqdnplaGpwZ2J3aWl1dnNuZmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDk1NTksImV4cCI6MjA3NzE4NTU1OX0.Y1vVNyKDuHoklqOvGAcW9zbIVaXOdaHQpgbRi3PeSSs'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Platform fee configuration
const PLATFORM_FEE_PERCENT = 0.015  // 1.5%
const PLATFORM_FEE_FLAT = 0.50      // $0.50 per ticket
const SERVICE_FEE_DISPLAY = 1.50    // $1.50 flat service fee (pass_through model)

// Fee model configuration by event ID (matches App.jsx)
const EVENT_FEE_MODELS = {
  1: { model: 'pass_through', serviceFee: SERVICE_FEE_DISPLAY },  // Gameday Empire - buyer pays fee
  2: { model: 'baked_in', serviceFee: 0 },    // Sportsplex Showdown - fee included
  3: { model: 'baked_in', serviceFee: 0 },    // Sportsplex Event - fee included
}

// Platform admin emails - only these users see all events and platform revenue
const PLATFORM_ADMIN_EMAILS = [
  'garetcrenshaw@gmail.com',
  // Add more admin emails here
]

// Event operator access - maps email (lowercase) to event IDs they can access
const EVENT_OPERATOR_ACCESS = {
  'gcrenshaw@aimsportsgroup.com': [1], // Gameday Empire Showdown (Event 1)
  // Add more operators: 'email@example.com': [1, 2], // Can access events 1 and 2
}

// Helper function to get operator access (case-insensitive)
const getOperatorEventAccess = (email) => {
  if (!email) return null
  const normalizedEmail = email.toLowerCase().trim()
  for (const [operatorEmail, eventIds] of Object.entries(EVENT_OPERATOR_ACCESS)) {
    if (operatorEmail.toLowerCase().trim() === normalizedEmail) {
      return eventIds
    }
  }
  return null
}

export default function EventDashboard() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [refundingTicket, setRefundingTicket] = useState(null)
  const [refundStatus, setRefundStatus] = useState({ message: '', type: '' })
  const [currentUser, setCurrentUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    checkAuthAndLoad()
  }, [eventId])

  const checkAuthAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      navigate('/login')
      return
    }

    // Set current user and check admin status
    setCurrentUser(session.user)
    const userEmail = session.user.email?.toLowerCase()
    const userIsAdmin = PLATFORM_ADMIN_EMAILS.some(email => email.toLowerCase() === userEmail)
    setIsAdmin(userIsAdmin)

    // Check if user has access to this event
    if (!userIsAdmin) {
      const operatorAccess = getOperatorEventAccess(userEmail)
      const eventIdNum = parseInt(eventId, 10)
      console.log('Event access check:', userEmail, 'Event:', eventIdNum, 'Access:', operatorAccess)
      if (!operatorAccess || !operatorAccess.includes(eventIdNum)) {
        // No access to this event - redirect back to dashboard
        console.log('Access denied - redirecting')
        navigate('/dashboard')
        return
      }
    }

    await loadEventData()
  }

  const loadEventData = async () => {
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (eventError) throw eventError
      setEvent(eventData)

      // Query tickets with both integer and string event_id (handles legacy data)
      const { data: ticketsInt } = await supabase
        .from('tickets')
        .select('*')
        .eq('event_id', parseInt(eventId))
        .order('created_at', { ascending: false })

      const { data: ticketsStr } = await supabase
        .from('tickets')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })

      // Combine and deduplicate by ticket_id
      const allTickets = [...(ticketsInt || []), ...(ticketsStr || [])]
      const uniqueTickets = allTickets.filter((ticket, index, self) =>
        index === self.findIndex(t => t.ticket_id === ticket.ticket_id)
      )
      
      setTickets(uniqueTickets)
    } catch (err) {
      console.error('Error loading event:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle refund
  const handleRefund = async (ticket) => {
    if (!ticket.stripe_session_id) {
      setRefundStatus({ message: 'No payment found for this ticket', type: 'error' })
      return
    }

    setRefundingTicket(ticket.ticket_id)
    setRefundStatus({ message: '', type: '' })

    try {
      const response = await fetch('/api/refund-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: ticket.ticket_id,
          stripe_session_id: ticket.stripe_session_id
        })
      })

      const data = await response.json()

      if (data.success) {
        setRefundStatus({ message: `Refund processed for ${ticket.buyer_name}`, type: 'success' })
        // Reload tickets to show updated status
        await loadEventData()
      } else {
        setRefundStatus({ message: data.error || 'Refund failed', type: 'error' })
      }
    } catch (err) {
      console.error('Refund error:', err)
      setRefundStatus({ message: 'Failed to process refund', type: 'error' })
    } finally {
      setRefundingTicket(null)
    }
  }

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'scanned' && ticket.status === 'used') ||
      (filter === 'unscanned' && ticket.status !== 'used') ||
      (filter === 'refunded' && ticket.status === 'refunded')
    
    const matchesSearch = 
      !searchQuery ||
      ticket.buyer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.buyer_email?.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesFilter && matchesSearch
  })

  // Stats calculations
  const totalTickets = tickets.filter(t => t.status !== 'refunded').length
  const scannedTickets = tickets.filter(t => t.status === 'used').length
  const refundedTickets = tickets.filter(t => t.status === 'refunded').length
  const admissionTickets = tickets.filter(t => !t.ticket_type?.toLowerCase().includes('parking') && t.status !== 'refunded').length
  const parkingTickets = tickets.filter(t => t.ticket_type?.toLowerCase().includes('parking') && t.status !== 'refunded').length
  const uniqueCustomers = new Set(tickets.filter(t => t.status !== 'refunded').map(t => t.buyer_email)).size
  
  // Get fee model for this event
  const feeConfig = EVENT_FEE_MODELS[parseInt(eventId)] || { model: 'baked_in', serviceFee: 0 }
  const isPassThrough = feeConfig.model === 'pass_through'
  
  // Calculate revenue (excluding refunds)
  const admissionPrice = event?.admission_price || 15
  const parkingPrice = event?.parking_price || 15
  const admissionRevenue = admissionTickets * admissionPrice
  const parkingRevenue = parkingTickets * parkingPrice
  const ticketRevenue = admissionRevenue + parkingRevenue  // Revenue from ticket prices only
  
  // Calculate YOUR platform revenue (what you make)
  // Fee formula: (ticket_price × 1.5%) + $0.50 per ticket
  // This is the same calculation for both fee models
  const platformFee = tickets
    .filter(t => t.status !== 'refunded')
    .reduce((sum, t) => {
      const isParking = t.ticket_type?.toLowerCase().includes('parking')
      const price = isParking ? parkingPrice : admissionPrice
      return sum + (price * PLATFORM_FEE_PERCENT) + PLATFORM_FEE_FLAT
    }, 0)
  
  let yourRevenue = platformFee
  let venueRevenue = 0
  
  if (isPassThrough) {
    // PASS_THROUGH: Buyer pays fee on top of ticket price
    // Venue gets full ticket price
    venueRevenue = ticketRevenue
  } else {
    // BAKED_IN: Fee comes out of the ticket price
    // Venue gets ticket price minus fee
    venueRevenue = ticketRevenue - yourRevenue
  }
  
  // Total collected from customers
  const grossRevenue = isPassThrough ? ticketRevenue + yourRevenue : ticketRevenue

  const formatDate = (dateStr) => {
    if (!dateStr) return 'TBD'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatTimestamp = (ts) => {
    if (!ts) return '-'
    return new Date(ts).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  // Export to Excel
  const exportToExcel = () => {
    const data = filteredTickets.map(t => ({
      'Name': t.buyer_name || '',
      'Email': t.buyer_email || '',
      'Ticket Type': t.ticket_type || '',
      'City': t.billing_city || '',
      'State': t.billing_state || '',
      'Zip': t.billing_zip || '',
      'Status': t.status === 'used' ? 'Scanned' : t.status === 'refunded' ? 'Refunded' : 'Not Scanned',
      'Scanned At': t.scanned_at ? new Date(t.scanned_at).toLocaleString() : '',
      'Scanned By': t.scanned_by || '',
      'Purchased': t.created_at ? new Date(t.created_at).toLocaleString() : ''
    }))

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)

    // Set column widths for better readability
    ws['!cols'] = [
      { wch: 20 }, // Name
      { wch: 30 }, // Email
      { wch: 20 }, // Ticket Type
      { wch: 15 }, // City
      { wch: 8 },  // State
      { wch: 10 }, // Zip
      { wch: 12 }, // Status
      { wch: 20 }, // Scanned At
      { wch: 15 }, // Scanned By
      { wch: 20 }, // Purchased
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Attendees')

    // Generate filename
    const filename = `${event?.event_slug || 'event'}-attendees-${new Date().toISOString().split('T')[0]}.xlsx`
    
    // Download
    XLSX.writeFile(wb, filename)
  }

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="dashboard-spinner" />
          <p>Loading event...</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-error">
          <p>Event not found</p>
          <Link to="/dashboard">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__overlay" />
      
      <header className="dashboard-header">
        <div className="dashboard-header__left">
          <Link to="/dashboard" className="dashboard-header__back">← Back</Link>
          <h1>{event.event_name}</h1>
        </div>
        <div className="dashboard-header__right">
          <button onClick={loadEventData} className="dashboard-header__link">
            Refresh
          </button>
          <button onClick={exportToExcel} className="dashboard-header__export">
            Export Excel
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        {/* Event Info */}
        <section className="event-info-bar">
          <div className="event-info-bar__item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>{formatDate(event.event_date)}</span>
          </div>
          <div className="event-info-bar__item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>{event.venue_name}</span>
          </div>
          <div className="event-info-bar__item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Scanner PIN: <strong>{event.scanner_pin}</strong></span>
          </div>
          {isAdmin && (
            <div className={`event-info-bar__badge ${isPassThrough ? 'event-info-bar__badge--pass' : 'event-info-bar__badge--baked'}`}>
              {isPassThrough ? 'Buyer Pays Fee' : 'Fee Included'}
            </div>
          )}
        </section>

        {/* Refund Status Message */}
        {refundStatus.message && (
          <div className={`refund-status refund-status--${refundStatus.type}`}>
            {refundStatus.message}
            <button onClick={() => setRefundStatus({ message: '', type: '' })}>×</button>
          </div>
        )}

        {/* Stats Grid - Different for Admin vs Event Operator */}
        {isAdmin ? (
          // ADMIN VIEW
          <section className="dashboard-overview">
            <div className="stat-card stat-card--revenue">
              <div className="stat-card__icon-box stat-card__icon-box--green">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              <div className="stat-card__content">
                <span className="stat-card__value">{formatCurrency(grossRevenue)}</span>
                <span className="stat-card__label">Total Collected</span>
              </div>
            </div>
            
            <div className="stat-card stat-card--fees">
              <div className="stat-card__icon-box stat-card__icon-box--orange">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                  <line x1="1" y1="10" x2="23" y2="10"></line>
                </svg>
              </div>
              <div className="stat-card__content">
                <span className="stat-card__value">{formatCurrency(yourRevenue)}</span>
                <span className="stat-card__label">Platform Revenue</span>
              </div>
            </div>
            
            <div className="stat-card stat-card--tickets">
              <div className="stat-card__icon-box stat-card__icon-box--blue">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path>
                </svg>
              </div>
              <div className="stat-card__content">
                <span className="stat-card__value">{scannedTickets} / {totalTickets}</span>
                <span className="stat-card__label">Checked In</span>
              </div>
            </div>
            
            <div className="stat-card stat-card--customers">
              <div className="stat-card__icon-box stat-card__icon-box--purple">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                </svg>
              </div>
              <div className="stat-card__content">
                <span className="stat-card__value">{uniqueCustomers}</span>
                <span className="stat-card__label">Unique Customers</span>
              </div>
            </div>
          </section>
        ) : (
          // EVENT OPERATOR VIEW - Focus on revenue, attendees, and breakdown
          <section className="dashboard-overview dashboard-overview--operator-event">
            {/* Total Revenue - Big and prominent at top */}
            <div className="stat-card stat-card--revenue stat-card--large">
              <div className="stat-card__icon-box stat-card__icon-box--green">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              <div className="stat-card__content">
                <span className="stat-card__value">{formatCurrency(venueRevenue)}</span>
                <span className="stat-card__label">Total Revenue</span>
              </div>
            </div>

            {/* Unique Buyers */}
            <div className="stat-card stat-card--customers">
              <div className="stat-card__icon-box stat-card__icon-box--purple">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div className="stat-card__content">
                <span className="stat-card__value">{uniqueCustomers}</span>
                <span className="stat-card__label">Unique Buyers</span>
              </div>
            </div>

            {/* Total Attendees Coming */}
            <div className="stat-card stat-card--attendees">
              <div className="stat-card__icon-box stat-card__icon-box--blue">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div className="stat-card__content">
                <span className="stat-card__value">{totalTickets}</span>
                <span className="stat-card__label">Total Attendees Coming</span>
              </div>
            </div>

            {/* Ticket Breakdown - Admission */}
            {admissionTickets > 0 && (
              <div className="stat-card stat-card--admission">
                <div className="stat-card__icon-box stat-card__icon-box--blue">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path>
                  </svg>
                </div>
                <div className="stat-card__content">
                  <span className="stat-card__value">{admissionTickets} Admission tickets</span>
                  <span className="stat-card__label">{formatCurrency(admissionRevenue)}</span>
                </div>
              </div>
            )}

            {/* Ticket Breakdown - Parking */}
            {parkingTickets > 0 && (
              <div className="stat-card stat-card--parking">
                <div className="stat-card__icon-box stat-card__icon-box--orange">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <path d="M9 17V7h4a3 3 0 0 1 0 6H9"></path>
                  </svg>
                </div>
                <div className="stat-card__content">
                  <span className="stat-card__value">{parkingTickets} Parking passes</span>
                  <span className="stat-card__label">{formatCurrency(parkingRevenue)}</span>
                </div>
              </div>
            )}

            {/* Checked In - At the bottom */}
            <div className="stat-card stat-card--checkin">
              <div className="stat-card__icon-box stat-card__icon-box--green">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div className="stat-card__content">
                <span className="stat-card__value">{scannedTickets} / {totalTickets}</span>
                <span className="stat-card__label">Checked In</span>
              </div>
            </div>
          </section>
        )}

        {/* Breakdown Section */}
        <section className="dashboard-breakdown">
          {isAdmin && (
            <div className="breakdown-card">
              <h3>Ticket Breakdown</h3>
              <div className="breakdown-row">
                <span>Admission Tickets</span>
                <span>{admissionTickets}</span>
              </div>
              <div className="breakdown-row">
                <span>Parking Passes</span>
                <span>{parkingTickets}</span>
              </div>
              {refundedTickets > 0 && (
                <div className="breakdown-row breakdown-row--refund">
                  <span>Refunded</span>
                  <span>{refundedTickets}</span>
                </div>
              )}
              <div className="breakdown-row breakdown-row--model">
                <span>Fee Model</span>
                <span>{isPassThrough ? 'Buyer Pays Fee' : 'Fee Included'}</span>
              </div>
            </div>
          )}
          <div className="breakdown-card">
            <h3>Financial Summary</h3>
            {isAdmin ? (
              // ADMIN VIEW - Shows full breakdown with platform revenue
              isPassThrough ? (
                <>
                  <div className="breakdown-row">
                    <span>Ticket Sales ({formatCurrency(admissionPrice)} × {admissionTickets} + {formatCurrency(parkingPrice)} × {parkingTickets})</span>
                    <span>{formatCurrency(ticketRevenue)}</span>
                  </div>
                  <div className="breakdown-row breakdown-row--your-fee">
                    <span>Service Fees Collected ({formatCurrency(feeConfig.serviceFee)} × {totalTickets})</span>
                    <span>+{formatCurrency(yourRevenue)}</span>
                  </div>
                  <div className="breakdown-row breakdown-row--total">
                    <span>Total Collected from Customers</span>
                    <span>{formatCurrency(grossRevenue)}</span>
                  </div>
                  <div className="breakdown-row breakdown-row--venue">
                    <span>Venue Payout</span>
                    <span>{formatCurrency(venueRevenue)}</span>
                  </div>
                  <div className="breakdown-row breakdown-row--your-total">
                    <span>PLATFORM REVENUE</span>
                    <span>{formatCurrency(yourRevenue)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="breakdown-row">
                    <span>Admission ({formatCurrency(admissionPrice)} × {admissionTickets})</span>
                    <span>{formatCurrency(admissionRevenue)}</span>
                  </div>
                  <div className="breakdown-row">
                    <span>Parking ({formatCurrency(parkingPrice)} × {parkingTickets})</span>
                    <span>{formatCurrency(parkingRevenue)}</span>
                  </div>
                  <div className="breakdown-row breakdown-row--total">
                    <span>Total Collected</span>
                    <span>{formatCurrency(ticketRevenue)}</span>
                  </div>
                  <div className="breakdown-row breakdown-row--your-fee">
                    <span>Platform Fee (1.5% + $0.50/ticket)</span>
                    <span>-{formatCurrency(yourRevenue)}</span>
                  </div>
                  <div className="breakdown-row breakdown-row--venue">
                    <span>Venue Payout</span>
                    <span>{formatCurrency(venueRevenue)}</span>
                  </div>
                  <div className="breakdown-row breakdown-row--your-total">
                    <span>PLATFORM REVENUE</span>
                    <span>{formatCurrency(yourRevenue)}</span>
                  </div>
                </>
              )
            ) : (
              // EVENT OPERATOR VIEW - Shows their financial breakdown
              <>
                <div className="breakdown-row">
                  <span>Gross Sales</span>
                  <span>{formatCurrency(ticketRevenue)}</span>
                </div>
                {isPassThrough ? (
                  // Pass-through: Fee is paid by buyer separately, show the amount
                  <div className="breakdown-row breakdown-row--fee-passthrough">
                    <span>Gameday Tickets Fee</span>
                    <span>{formatCurrency(yourRevenue)} <em>(paid by buyer)</em></span>
                  </div>
                ) : (
                  // Baked-in: Fee comes out of ticket price
                  <div className="breakdown-row breakdown-row--fee">
                    <span>Gameday Tickets Fee</span>
                    <span>-{formatCurrency(yourRevenue)}</span>
                  </div>
                )}
                <div className="breakdown-row breakdown-row--net-total">
                  <span>Net Revenue</span>
                  <span>{formatCurrency(venueRevenue)}</span>
                </div>
                {refundedTickets > 0 && (
                  <div className="breakdown-row breakdown-row--refund">
                    <span>Refunded Tickets</span>
                    <span>{refundedTickets}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Attendee List */}
        <section className="dashboard-attendees">
          <div className="dashboard-section-header">
            <h2>Attendee List</h2>
            <div className="attendees-controls">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="attendees-search"
              />
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                className="attendees-filter"
              >
                <option value="all">All ({tickets.length})</option>
                <option value="scanned">Scanned ({scannedTickets})</option>
                <option value="unscanned">Not Scanned ({totalTickets - scannedTickets})</option>
                {refundedTickets > 0 && <option value="refunded">Refunded ({refundedTickets})</option>}
              </select>
            </div>
          </div>

          <div className="attendees-table">
            <div className="attendees-table__header">
              <span>Guest</span>
              <span>Ticket Type</span>
              <span>Location</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            
            {filteredTickets.length === 0 ? (
              <div className="attendees-empty">
                <p>No tickets found</p>
              </div>
            ) : (
              filteredTickets.map(ticket => (
                <div key={ticket.ticket_id} className={`attendees-row ${ticket.status === 'refunded' ? 'attendees-row--refunded' : ''}`}>
                  <div className="attendees-row__guest">
                    <span className="attendees-row__name">{ticket.buyer_name || 'Guest'}</span>
                    <span className="attendees-row__email">{ticket.buyer_email}</span>
                  </div>
                  <div className="attendees-row__type">
                    {ticket.ticket_type || 'General'}
                  </div>
                  <div className="attendees-row__location">
                    {ticket.billing_zip ? (
                      <span>{ticket.billing_city ? `${ticket.billing_city}, ` : ''}{ticket.billing_state || ''} {ticket.billing_zip}</span>
                    ) : (
                      <span className="attendees-row__location--na">-</span>
                    )}
                  </div>
                  <div className={`attendees-row__status ${ticket.status === 'used' ? 'scanned' : ''} ${ticket.status === 'refunded' ? 'refunded' : ''}`}>
                    {ticket.status === 'used' ? 'Scanned' : ticket.status === 'refunded' ? 'Refunded' : 'Not Scanned'}
                    {ticket.scanned_at && ticket.status === 'used' && (
                      <span className="attendees-row__scanned-info">
                        {formatTimestamp(ticket.scanned_at)} by {ticket.scanned_by || 'Unknown'}
                      </span>
                    )}
                  </div>
                  <div className="attendees-row__actions">
                    {ticket.status !== 'refunded' && (
                      <button 
                        className="refund-btn"
                        onClick={() => handleRefund(ticket)}
                        disabled={refundingTicket === ticket.ticket_id}
                      >
                        {refundingTicket === ticket.ticket_id ? 'Processing...' : 'Refund'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
