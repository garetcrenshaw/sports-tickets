import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://xjvzehjpgbwiiuvsnflk.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqdnplaGpwZ2J3aWl1dnNuZmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDk1NTksImV4cCI6MjA3NzE4NTU1OX0.Y1vVNyKDuHoklqOvGAcW9zbIVaXOdaHQpgbRi3PeSSs'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Platform fee configuration (1.5% + $0.50 per ticket)
const PLATFORM_FEE_PERCENT = 0.015
const PLATFORM_FEE_FLAT = 0.50

// Platform admin emails - only these users see all events and platform revenue
const PLATFORM_ADMIN_EMAILS = [
  'garetcrenshaw@gmail.com',
  // Add more admin emails here
]

// Event operator access - maps email (lowercase) to event IDs they can access
// If an email is not listed here AND not an admin, they see nothing
const EVENT_OPERATOR_ACCESS = {
  'gcrenshaw@aimsportsgroup.com': [1], // Gameday Empire Showdown (Event 1)
  // Add more operators: 'email@example.com': [1, 2], // Can access events 1 and 2
}

// Helper function to get operator access (case-insensitive)
const getOperatorEventAccess = (email) => {
  if (!email) return null
  const normalizedEmail = email.toLowerCase().trim()
  // Check each key in EVENT_OPERATOR_ACCESS
  for (const [operatorEmail, eventIds] of Object.entries(EVENT_OPERATOR_ACCESS)) {
    if (operatorEmail.toLowerCase().trim() === normalizedEmail) {
      return eventIds
    }
  }
  return null
}

// Helper to get fiscal year (July 1 - June 30)
const getFiscalYear = (date) => {
  const d = new Date(date)
  const month = d.getMonth() // 0-11
  const year = d.getFullYear()
  // If July (6) or later, fiscal year is current year -> next year (e.g., "FY 2025")
  // If before July, fiscal year is previous year -> current year (e.g., "FY 2024")
  return month >= 6 ? `FY ${year + 1}` : `FY ${year}`
}

// Get current fiscal year (July 1 - June 30)
const getCurrentFiscalYear = () => {
  const now = new Date()
  const month = now.getMonth() // 0-11
  const year = now.getFullYear()
  // If July (6) or later, we're in FY (year+1), otherwise FY (year)
  return month >= 6 ? year + 1 : year
}

// Generate fiscal year options (current, previous, and all-time)
const getFiscalYearOptions = () => {
  const currentFY = getCurrentFiscalYear()
  return [
    { value: `FY${currentFY}`, label: `FY ${currentFY}`, startDate: new Date(currentFY - 1, 6, 1), endDate: new Date(currentFY, 5, 30, 23, 59, 59) },
    { value: `FY${currentFY - 1}`, label: `FY ${currentFY - 1}`, startDate: new Date(currentFY - 2, 6, 1), endDate: new Date(currentFY - 1, 5, 30, 23, 59, 59) },
    { value: 'all', label: 'All Time', startDate: null, endDate: null }
  ]
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [events, setEvents] = useState([])
  const [stats, setStats] = useState({})
  const [fiscalYearStats, setFiscalYearStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    // Load from localStorage or default to current FY
    const saved = localStorage.getItem('dashboard_period')
    const currentFY = getCurrentFiscalYear()
    return saved || `FY${currentFY}`
  })
  const navigate = useNavigate()
  
  const fiscalYearOptions = getFiscalYearOptions()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      navigate('/login')
      return
    }

    setUser(session.user)
    
    // Check if user is platform admin
    const userEmail = session.user.email?.toLowerCase()
    const userIsAdmin = PLATFORM_ADMIN_EMAILS.some(email => email.toLowerCase() === userEmail)
    setIsAdmin(userIsAdmin)
    
    await loadDashboardData(userEmail, userIsAdmin)
  }

  const loadDashboardData = async (userEmail, userIsAdmin) => {
    try {
      // Fetch events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('event_status', 'active')
        .order('event_date', { ascending: true })

      if (eventsError) throw eventsError
      
      // Filter events based on user access
      let accessibleEvents = eventsData || []
      
      console.log('User email:', userEmail, 'Is admin:', userIsAdmin)
      
      if (!userIsAdmin) {
        // Check if user is an event operator
        const operatorAccess = getOperatorEventAccess(userEmail)
        console.log('Operator access for', userEmail, ':', operatorAccess)
        
        if (operatorAccess && operatorAccess.length > 0) {
          // Filter to only their events (handle both string and number IDs)
          accessibleEvents = accessibleEvents.filter(e => {
            const eventId = parseInt(e.id, 10)
            return operatorAccess.includes(eventId)
          })
          console.log('Filtered events:', accessibleEvents.map(e => e.id))
        } else {
          // Not an admin and not an operator - no access
          console.log('No access for email:', userEmail, '- showing empty')
          accessibleEvents = []
        }
      }
      
      setEvents(accessibleEvents)

      // Fetch aggregated stats for each event
      console.log('Events loaded:', accessibleEvents)
      
      const statsPromises = (accessibleEvents).map(async (event) => {
        const eventIdStr = String(event.id)
        console.log(`Fetching tickets for event ${event.id} (${event.event_name}), querying event_id = "${eventIdStr}"`)
        
        const { data: tickets, error } = await supabase
          .from('tickets')
          .select('*')
          .eq('event_id', eventIdStr)
        
        console.log(`Event ${event.id} tickets result:`, { tickets, error })

        if (error) {
          console.error('Error fetching tickets for event', event.id, error)
          return { eventId: event.id, tickets: [], event }
        }

        return { eventId: event.id, tickets: tickets || [], event }
      })

      const statsResults = await Promise.all(statsPromises)
      
      const statsMap = {}
      statsResults.forEach(({ eventId, tickets, event }) => {
        const totalTickets = tickets.length
        const scannedTickets = tickets.filter(t => t.status === 'used').length
        
        // Calculate revenue based on event prices
        const revenue = tickets.reduce((sum, t) => {
          const isParking = t.ticket_type?.toLowerCase().includes('parking')
          const price = isParking ? (event?.parking_price || 15) : (event?.admission_price || 15)
          return sum + price
        }, 0)
        
        // Calculate platform fees
        const platformFees = tickets.reduce((sum, t) => {
          const isParking = t.ticket_type?.toLowerCase().includes('parking')
          const price = isParking ? (event?.parking_price || 15) : (event?.admission_price || 15)
          return sum + (price * PLATFORM_FEE_PERCENT) + PLATFORM_FEE_FLAT
        }, 0)

        const uniqueEmails = new Set(tickets.map(t => t.buyer_email)).size
        // Unique users who have been scanned (unique emails with at least one scanned ticket)
        const uniqueScanned = new Set(
          tickets.filter(t => t.status === 'used').map(t => t.buyer_email)
        ).size

        statsMap[eventId] = {
          totalTickets,
          scannedTickets,
          uniqueScanned,
          revenue,
          platformFees,
          netRevenue: revenue - platformFees,
          uniqueEmails,
          attendanceRate: totalTickets > 0 ? Math.round((scannedTickets / totalTickets) * 100) : 0,
          tickets // Store raw tickets for fiscal year calculation
        }
      })

      setStats(statsMap)

      // Calculate fiscal year stats (admin only)
      if (userIsAdmin) {
        const allTickets = statsResults.flatMap(r => r.tickets || [])
        const fyStats = {}
        
        allTickets.forEach(ticket => {
          if (!ticket.created_at) return
          const fy = getFiscalYear(ticket.created_at)
          
          if (!fyStats[fy]) {
            fyStats[fy] = {
              tickets: 0,
              revenue: 0,
              platformFees: 0,
              uniqueBuyers: new Set()
            }
          }
          
          fyStats[fy].tickets++
          fyStats[fy].uniqueBuyers.add(ticket.buyer_email)
          
          // Find the event for this ticket to get correct prices
          const eventData = statsResults.find(r => String(r.eventId) === String(ticket.event_id))?.event
          const isParking = ticket.ticket_type?.toLowerCase().includes('parking')
          const price = isParking 
            ? (eventData?.parking_price || 15) 
            : (eventData?.admission_price || 15)
          
          fyStats[fy].revenue += price
          fyStats[fy].platformFees += (price * PLATFORM_FEE_PERCENT) + PLATFORM_FEE_FLAT
        })
        
        // Convert Sets to counts
        Object.keys(fyStats).forEach(fy => {
          fyStats[fy].uniqueBuyers = fyStats[fy].uniqueBuyers.size
        })
        
        setFiscalYearStats(fyStats)
      }
    } catch (err) {
      console.error('Error loading dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('dashboard_user')
    navigate('/login')
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'TBD'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
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

  // Handle period change
  const handlePeriodChange = (e) => {
    const newPeriod = e.target.value
    setSelectedPeriod(newPeriod)
    localStorage.setItem('dashboard_period', newPeriod)
  }

  // Get the selected period's date range
  const getSelectedPeriodRange = () => {
    const option = fiscalYearOptions.find(opt => opt.value === selectedPeriod)
    return option || fiscalYearOptions[2] // Default to 'all' if not found
  }

  // Filter tickets by selected period
  const filterTicketsByPeriod = (tickets) => {
    const { startDate, endDate } = getSelectedPeriodRange()
    if (!startDate || !endDate) return tickets // 'All Time' - no filtering
    
    return tickets.filter(ticket => {
      if (!ticket.created_at) return false
      const ticketDate = new Date(ticket.created_at)
      return ticketDate >= startDate && ticketDate <= endDate
    })
  }

  // Calculate totals with period filtering
  const calculateFilteredTotals = () => {
    let filteredRevenue = 0
    let filteredFees = 0
    let filteredNetRevenue = 0
    let filteredTickets = 0
    let filteredUniqueScanned = 0
    const uniqueBuyerEmails = new Set()

    Object.entries(stats).forEach(([eventId, eventStats]) => {
      if (!eventStats.tickets) return
      
      const filteredEventTickets = filterTicketsByPeriod(eventStats.tickets)
      const event = events.find(e => String(e.id) === String(eventId))
      
      filteredEventTickets.forEach(ticket => {
        const isParking = ticket.ticket_type?.toLowerCase().includes('parking')
        const price = isParking ? (event?.parking_price || 15) : (event?.admission_price || 15)
        
        filteredRevenue += price
        filteredFees += (price * PLATFORM_FEE_PERCENT) + PLATFORM_FEE_FLAT
        
        if (ticket.buyer_email) {
          uniqueBuyerEmails.add(ticket.buyer_email)
        }
        
        if (ticket.status === 'used') {
          filteredUniqueScanned++
        }
      })
      
      filteredTickets += filteredEventTickets.length
    })

    filteredNetRevenue = filteredRevenue - filteredFees

    return {
      totalRevenue: filteredRevenue,
      totalFees: filteredFees,
      totalNetRevenue: filteredNetRevenue,
      totalTickets: filteredTickets,
      totalUniqueScanned: filteredUniqueScanned,
      totalUniqueBuyers: uniqueBuyerEmails.size
    }
  }

  const filteredTotals = calculateFilteredTotals()
  const { totalRevenue, totalFees, totalNetRevenue, totalTickets, totalUniqueScanned, totalUniqueBuyers } = filteredTotals

  // Get period label for display
  const selectedPeriodLabel = fiscalYearOptions.find(opt => opt.value === selectedPeriod)?.label || 'All Time'

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="dashboard-spinner" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__overlay" />
      
      <header className="dashboard-header">
        <div className="dashboard-header__left">
          <h1>Dashboard</h1>
          <span className="dashboard-header__user">{user?.email}</span>
        </div>
        <div className="dashboard-header__right">
          <select 
            value={selectedPeriod} 
            onChange={handlePeriodChange}
            className="dashboard-header__period-select"
          >
            {fiscalYearOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Link to="/" className="dashboard-header__link">View Site</Link>
          <button onClick={handleLogout} className="dashboard-header__logout">
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        {/* Period Indicator Banner */}
        <div className="period-indicator">
          <span className="period-indicator__label">Showing data for:</span>
          <span className="period-indicator__value">{selectedPeriodLabel}</span>
          {selectedPeriod !== 'all' && (
            <span className="period-indicator__range">
              {(() => {
                const option = fiscalYearOptions.find(opt => opt.value === selectedPeriod)
                if (!option?.startDate) return ''
                const start = option.startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                const end = option.endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                return `(${start} - ${end})`
              })()}
            </span>
          )}
        </div>

        {/* Overview Stats - Different views for Admin vs Event Operator */}
        {isAdmin ? (
          // ADMIN VIEW - Platform-wide stats
          <section className="dashboard-overview">
            <div className="stat-card stat-card--revenue">
              <div className="stat-card__icon-box stat-card__icon-box--green">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              <div className="stat-card__content">
                <span className="stat-card__value">{formatCurrency(totalFees)}</span>
                <span className="stat-card__label">Platform Revenue</span>
              </div>
            </div>
            
            <div className="stat-card stat-card--fees">
              <div className="stat-card__icon-box stat-card__icon-box--blue">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path>
                </svg>
              </div>
              <div className="stat-card__content">
                <span className="stat-card__value">{totalTickets}</span>
                <span className="stat-card__label">Tickets Sold</span>
              </div>
            </div>
            
            <div className="stat-card stat-card--tickets">
              <div className="stat-card__icon-box stat-card__icon-box--orange">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                  <line x1="1" y1="10" x2="23" y2="10"></line>
                </svg>
              </div>
              <div className="stat-card__content">
                <span className="stat-card__value">{formatCurrency(totalNetRevenue)}</span>
                <span className="stat-card__label">Venue Payouts</span>
              </div>
            </div>
            
            <div className="stat-card stat-card--scanned">
              <div className="stat-card__icon-box stat-card__icon-box--purple">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div className="stat-card__content">
                <span className="stat-card__value">{totalUniqueScanned}</span>
                <span className="stat-card__label">Unique Scanned</span>
              </div>
            </div>
          </section>
        ) : (
          // EVENT OPERATOR VIEW - Revenue, attendees, and unique buyers
          <section className="dashboard-overview dashboard-overview--operator-main">
            <div className="stat-card stat-card--revenue stat-card--primary">
              <div className="stat-card__icon-box stat-card__icon-box--green">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              <div className="stat-card__content">
                <span className="stat-card__value">{formatCurrency(totalNetRevenue)}</span>
                <span className="stat-card__label">Total Revenue</span>
              </div>
            </div>
            <div className="stat-card stat-card--tickets">
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
                <span className="stat-card__label">Total Attendees</span>
              </div>
            </div>
            <div className="stat-card stat-card--customers">
              <div className="stat-card__icon-box stat-card__icon-box--purple">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div className="stat-card__content">
                <span className="stat-card__value">{totalUniqueBuyers}</span>
                <span className="stat-card__label">Unique Buyers</span>
              </div>
            </div>
          </section>
        )}

        {/* Fiscal Year Breakdown - Admin Only */}
        {isAdmin && Object.keys(fiscalYearStats).length > 0 && (
          <section className="fiscal-year-section">
            <div className="dashboard-section-header">
              <h2>Fiscal Year Breakdown</h2>
            </div>
            <div className="fiscal-year-cards">
              {Object.entries(fiscalYearStats)
                .sort((a, b) => b[0].localeCompare(a[0])) // Sort newest first
                .map(([fy, data]) => (
                  <div key={fy} className="fiscal-year-card">
                    <div className="fiscal-year-card__header">
                      <span className="fiscal-year-card__title">{fy}</span>
                      <span className="fiscal-year-card__subtitle">Jul 1 - Jun 30</span>
                    </div>
                    <div className="fiscal-year-card__stats">
                      <div className="fiscal-year-stat">
                        <span className="fiscal-year-stat__value">{formatCurrency(data.platformFees)}</span>
                        <span className="fiscal-year-stat__label">Platform Revenue</span>
                      </div>
                      <div className="fiscal-year-stat">
                        <span className="fiscal-year-stat__value">{data.tickets}</span>
                        <span className="fiscal-year-stat__label">Tickets Sold</span>
                      </div>
                      <div className="fiscal-year-stat">
                        <span className="fiscal-year-stat__value">{formatCurrency(data.revenue - data.platformFees)}</span>
                        <span className="fiscal-year-stat__label">Venue Payouts</span>
                      </div>
                      <div className="fiscal-year-stat">
                        <span className="fiscal-year-stat__value">{data.uniqueBuyers}</span>
                        <span className="fiscal-year-stat__label">Unique Buyers</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Events List */}
        <section className="dashboard-events">
          <div className="dashboard-section-header">
            <h2>Your Events</h2>
            <button onClick={loadDashboardData} className="dashboard-refresh">
              Refresh
            </button>
          </div>

          <div className="events-table">
            {events.length === 0 ? (
              <div className="events-empty">
                <p>No active events found.</p>
              </div>
            ) : (
              events.map(event => {
                const eventStats = stats[event.id] || {}
                return (
                  <Link 
                    to={`/dashboard/event/${event.id}`} 
                    key={event.id} 
                    className="event-row"
                  >
                    <div className="event-row__main">
                      <div className="event-row__name">{event.event_name}</div>
                      <div className="event-row__meta">
                        <span>{formatDate(event.event_date)}</span>
                        <span>•</span>
                        <span>{event.venue_name || 'Venue TBD'}</span>
                      </div>
                    </div>
                    
                    <div className="event-row__stats">
                      <div className="event-row__stat">
                        <span className="event-row__stat-value event-row__stat-value--fees">
                          {formatCurrency(isAdmin ? eventStats.platformFees || 0 : eventStats.netRevenue || 0)}
                        </span>
                        <span className="event-row__stat-label">{isAdmin ? 'Platform' : 'Revenue'}</span>
                      </div>
                      {isAdmin && (
                        <div className="event-row__stat">
                          <span className="event-row__stat-value">{formatCurrency(eventStats.netRevenue || 0)}</span>
                          <span className="event-row__stat-label">Venue</span>
                        </div>
                      )}
                      <div className="event-row__stat">
                        <span className="event-row__stat-value">{eventStats.totalTickets || 0}</span>
                        <span className="event-row__stat-label">Sold</span>
                      </div>
                      <div className="event-row__stat">
                        <span className="event-row__stat-value">{eventStats.uniqueScanned || 0}</span>
                        <span className="event-row__stat-label">Scanned</span>
                      </div>
                    </div>

                    <div className="event-row__arrow">→</div>
                  </Link>
                )
              })
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
