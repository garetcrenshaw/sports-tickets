// src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Validate from './pages/Validate';

const tickets = [
  { type: 'ga', label: 'General Admission', price: 15 },
  { type: 'free', label: 'Free Admission', price: 0 },
  { type: 'parking', label: 'Parking Pass', price: 15 },
];

function Home() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);

  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    fetch('/.netlify/functions/get-events')
      .then(res => res.json())
      .then(data => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([{ id: '1', name: 'GameDay Events' }]));
  }, []);

  const handlePurchase = async (ticketType) => {
    if (!email || !name) return setMessage('Fill in name & email');
    if (quantity < 1 || quantity > 10) return setMessage('Quantity must be between 1 and 10');
    setLoading(true);
    setMessage('');

    const res = await fetch('/.netlify/functions/create-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketType, email, name, eventId: 1, quantity }),
    });

    const data = await res.json();

    if (data.isFree) {
      const ticketCount = data.quantity || 1;
      setMessage(`${ticketCount} free ticket${ticketCount > 1 ? 's' : ''} confirmed! Check your email${ticketCount > 1 ? 's' : ''}.`);
      setLoading(false);
      return;
    }

    if (data.clientSecret) {
      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: { name, email },
        },
      });

      if (result.error) {
        setMessage(result.error.message);
      } else {
        const ticketCount = data.quantity || 1;
        setMessage(`Payment successful! Check your email${ticketCount > 1 ? 's' : ''} for ${ticketCount} ticket${ticketCount > 1 ? 's' : ''}.`);
      }
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Sports Tickets</h1>

      <input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
      />
      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
      />

      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          Quantity (1-10):
        </label>
        <select
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value))}
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
        >
          {[...Array(10)].map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
      </div>

      {events.length === 0 ? (
        <p>Loading events...</p>
      ) : (
        events.map(event => (
          <div key={event.id} style={{ marginBottom: '3rem' }}>
            <h2>{event.name}</h2>

            {tickets.map((t) => (
              <div
                key={t.type}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem',
                  background: selectedTicket?.type === t.type ? '#f0f8ff' : 'white',
                }}
              >
                <strong>{t.label}</strong> — ${(t.price * quantity).toFixed(2)} {quantity > 1 && `(${t.price.toFixed(2)} each × ${quantity})`}
                <br />
                <button
                  onClick={() => {
                    setSelectedTicket(t);
                    if (t.type === 'free') handlePurchase(t.type);
                  }}
                  disabled={loading}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: t.price === 0 ? '#28a745' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  {t.price === 0 ? 'Claim Free' : 'Buy Now'}
                </button>
              </div>
            ))}

            {selectedTicket && selectedTicket.type !== 'free' && (
              <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
                <CardElement options={{ style: { base: { fontSize: '16px' } } }} />
                <button
                  onClick={() => handlePurchase(selectedTicket.type)}
                  disabled={loading || !stripe}
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem 1.5rem',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  {loading ? 'Processing...' : `Pay $${(selectedTicket.price * quantity).toFixed(2)}`}
                </button>
              </div>
            )}

            {message && (
              <p style={{ marginTop: '1rem', color: message.includes('success') || message.includes('confirmed') ? 'green' : 'red' }}>
                {message}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/validate" element={<Validate />} />
      </Routes>
    </BrowserRouter>
  );
}