// src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Elements, useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import Validate from './pages/Validate';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const tickets = [
  { type: 'ga', label: 'General Admission', price: 15 },
  { type: 'free', label: 'Free Admission', price: 0 },
  { type: 'parking', label: 'Parking Pass', price: 15 },
];

function Home() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [quantities, setQuantities] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [paymentData, setPaymentData] = useState(null);

  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    fetch('/.netlify/functions/get-events')
      .then(res => res.json())
      .then(data => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([{ id: '1', name: 'General Admission Event' }]));
  }, []);

  const handlePurchase = async (ticketType, quantity) => {
    if (!email || !name) return setMessage('Fill in name & email');
    if (quantity < 1 || quantity > 10) return setMessage('Quantity must be between 1 and 10');
    setLoading(true);
    setMessage('');

    try {
      console.log('Calling create-ticket with:', { ticketType, email, name, eventId: 1, quantity });
      
      const res = await fetch('/.netlify/functions/create-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketType, email, name, eventId: 1, quantity }),
      });

      console.log('Response status:', res.status);
      console.log('Response headers:', res.headers.get('content-type'));

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Error response:', errorText);
        throw new Error(errorText || 'Purchase failed');
      }

      const data = await res.json();
      console.log('Response data:', data);

      if (data.isFree) {
        const ticketCount = data.quantity || 1;
        setMessage(`${ticketCount} free ticket${ticketCount > 1 ? 's' : ''} confirmed! Check your email${ticketCount > 1 ? 's' : ''}.`);
        setLoading(false);
      } else {
        // For paid tickets, store payment data and show payment form
        setPaymentData(data);
        setLoading(false);
      }
    } catch (error) {
      console.error('Purchase error:', error);
      const errorMessage = error.message || 'Purchase failed. Please try again.';
      setMessage(`Error: ${errorMessage}`);
      setLoading(false);
    }
  };

  const handlePaymentConfirm = async () => {
    if (!stripe || !elements || !paymentData) return;

    setLoading(true);
    setMessage('');

    try {
      const result = await stripe.confirmCardPayment(paymentData.clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: { name, email },
        },
      });

      if (result.error) {
        setMessage(result.error.message);
      } else {
        const ticketCount = paymentData.quantity || 1;
        setMessage(`Payment successful! Check your email${ticketCount > 1 ? 's' : ''} for ${ticketCount} ticket${ticketCount > 1 ? 's' : ''}.`);
        setPaymentData(null);
      }
    } catch (error) {
      setMessage('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
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

      {events.length === 0 ? (
        <p>Loading events...</p>
      ) : (
        events.map(event => (
          <div key={event.id} style={{ marginBottom: '3rem' }}>
            <h2>{event.name}</h2>

            {tickets.map((t) => {
              const qty = quantities[t.type] || 1;
              const total = t.price * qty;

              return (
                <div
                  key={t.type}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    background: 'white',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong>{t.label} — ${t.price.toFixed(2)} each</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.9em' }}>Qty:</span>
                      <select
                        value={qty}
                        onChange={(e) => setQuantities(prev => ({ ...prev, [t.type]: parseInt(e.target.value) }))}
                        style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #ddd' }}
                      >
                        {[1,2,3,4,5,6,7,8,9,10].map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span><strong>Total: ${total.toFixed(2)}</strong></span>
                    <button
                      onClick={() => handlePurchase(t.type, qty)}
                      disabled={loading}
                      style={{
                        padding: '0.5rem 1rem',
                        background: t.price === 0 ? '#28a745' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      {t.price === 0 ? 'Claim Free' : `Pay $${total.toFixed(2)}`}
                    </button>
                  </div>
                </div>
              );
            })}


            {message && (
              <p style={{ marginTop: '1rem', color: message.includes('success') || message.includes('confirmed') ? 'green' : 'red' }}>
                {message}
              </p>
            )}
          </div>
        ))
      )}

      {paymentData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3>Complete Payment</h3>
            <p>Total: ${paymentData.totalAmount.toFixed(2)} for {paymentData.quantity} ticket{paymentData.quantity > 1 ? 's' : ''}</p>

            <div style={{ margin: '1rem 0' }}>
              <CardElement options={{ style: { base: { fontSize: '16px' } } }} />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setPaymentData(null)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handlePaymentConfirm}
                disabled={loading || !stripe}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {loading ? 'Processing...' : 'Pay Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Elements stripe={stripePromise}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/validate" element={<Validate />} />
        </Routes>
      </BrowserRouter>
    </Elements>
  );
}