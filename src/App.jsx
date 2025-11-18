import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import Validate from './pages/Validate'
import Success from './pages/Success'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

const tickets = [
  { type: 'ga', label: 'General Admission', price: 15 }
]

function Home() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [quantities, setQuantities] = useState(() => tickets.reduce((acc, ticket) => ({ ...acc, [ticket.type]: 1 }), {}))
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePurchase = async (ticket) => {
    const quantity = quantities[ticket.type] || 1

    if (!email || !name) {
      setMessage('Please enter your name and email before purchasing.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      console.log('🛒 Calling /api/create-checkout with:', { email, name, quantity });
      
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketType: ticket.type,
          email,
          name,
          eventId: 1,
          quantity
        })
      })

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers.get('content-type'));

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Error response:', errorText);
        throw new Error(errorText || 'Purchase failed. Please try again.')
      }

      const data = await response.json()
      console.log('✅ Received session:', data);
      
      // Use direct URL redirect (simpler, recommended method)
      if (data.url) {
        console.log('🔄 Redirecting to Stripe Checkout URL...');
        window.location.href = data.url;
        return;
      }
      
      // Fallback: use old redirectToCheckout method
      if (data.sessionId) {
        console.log('🔄 Using fallback redirectToCheckout method...');
        const stripe = await stripePromise;
        const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
        if (error) {
          console.error('❌ Stripe redirect error:', error);
          throw error;
        }
        return;
      }
      
      throw new Error('No redirect URL or session ID received from server');
    } catch (error) {
      console.error('❌ Checkout error:', error)
      setMessage(error.message || 'Purchase failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuantityChange = (type, value) => {
    setQuantities((prev) => ({
      ...prev,
      [type]: Number(value)
    }))
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial', maxWidth: '600px', margin: '0 auto' }}>
      <h1>General Admission Tickets</h1>

      <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
        />
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
        />
      </div>

      {tickets.map((ticket) => {
        const quantity = quantities[ticket.type] || 1
        const total = ticket.price * quantity

        return (
          <div
            key={ticket.type}
            style={{
              border: '1px solid #ddd',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              background: '#fff',
              boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0 }}>{ticket.label}</h2>
                <p style={{ margin: 0, color: '#555' }}>${ticket.price.toFixed(2)} each</p>
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#555', marginRight: '0.5rem' }}>Quantity</label>
                <select
                  value={quantity}
                  onChange={(event) => handleQuantityChange(ticket.type, event.target.value)}
                  style={{ padding: '0.4rem 0.7rem', borderRadius: '6px', border: '1px solid #ccc' }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '1.1rem' }}>
                <strong>Total: ${total.toFixed(2)}</strong>
              </span>
              <button
                onClick={() => handlePurchase(ticket)}
                disabled={loading}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#0561FF',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                {loading ? 'Processing…' : `Pay $${total.toFixed(2)}`}
              </button>
            </div>
          </div>
        )
      })}

      {message && (
        <div style={{ marginTop: '1rem', color: '#c0392b' }}>
          {message}
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/success" element={<Success />} />
        <Route path="/validate" element={<Validate />} />
      </Routes>
    </BrowserRouter>
  )
}
