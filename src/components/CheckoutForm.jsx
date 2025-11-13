
// src/components/CheckoutForm.jsx
import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

export default function CheckoutForm({ email, name, eventId, ticketType, stripePromise }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !name) return setMessage('Fill in name & email');

    setLoading(true);
    setMessage('');

    const res = await fetch('/.netlify/functions/create-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketType, email, name, eventId }),
    });

    const data = await res.json();

    if (data.isFree) {
      setMessage('Free ticket confirmed! Check your email.');
      setLoading(false);
      return;
    }

    if (data.clientSecret) {
      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
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
    <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
      {ticketType !== 'free' && (
        <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '1rem' }}>
          <CardElement />
        </div>
      )}
      <button
        type="submit"
        disabled={loading || !stripe}
        style={{
          padding: '0.75rem 1.5rem',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        {loading ? 'Processing...' : ticketType === 'free' ? 'Claim Ticket' : 'Pay Now'}
      </button>
      {message && <p style={{ marginTop: '1rem', color: message.includes('success') ? 'green' : 'red' }}>{message}</p>}
    </form>
  );
}