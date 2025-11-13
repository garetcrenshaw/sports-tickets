// src/App.jsx
import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const tickets = [
  { type: 'ga', label: 'General Admission', price: 15 },
  { type: 'free', label: 'Free Admission', price: 0 },
  { type: 'parking', label: 'Parking Pass', price: 15 },
];

export default function App() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);

  const stripe = useStripe();
  const elements = useElements();

  // Fetch events from Supabase (Phase 4)
  React.useEffect(() => {
    fetch('/.netlify/functions/get-events')
      .then(res => res.json())
      .then(data => setEvents(data))
      .catch(() => setEvents([{ id: 1, name: 'Default Event', date: 'Soon' }]));
  }, []);

  const handlePurchase = async (ticketType) => {
    if (!email || !name) return setMessage('Fill in name & email');
    setLoading(true);
    setMessage('');

    const res = await fetch('/.netlify/functions/create-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketType, email, name, eventId: 1 }),
    });

    const data = await res.json();

    if (data.isFree) {
      setMessage('Free ticket confirmed! Check your email.');
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
        setMessage('Payment successful! Check your email.');
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
        style={{ width: '100%', padding: '0.5rem', marginBottom: '2rem' }}
      />

      {events.map(event => (
        <div key={event.id}>
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
              <strong>{t.label}</strong> — ${t.price.toFixed(2)}
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
            <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
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
                {loading ? 'Processing...' : 'Pay Now'}
              </button>
            </div>
          )}

          {message && (
            <p style={{ marginTop: '1rem', color: message.includes('success') || message.includes('confirmed') ? 'green' : 'red' }}>
              {message}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}