// src/components/CheckoutForm.jsx
import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

export default function CheckoutForm({ email, name, eventId, ticketType }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !name) return setMessage('Fill in name & email');
    if (ticketType === 'free') return; // Handled in App.jsx

    setLoading(true);
    setMessage('');

    // Call Netlify function
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
    } else {
      setMessage('Error: No client secret');
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
      {ticketType !== 'free' && (
        <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '1rem' }}>
          <CardElement options={{ style: { base: { fontSize: '16px' } } }} />
        </div>
      )}
      <button
        type="submit"
        disabled={loading || !stripe || (ticketType !== 'free' && !elements)}
        style={{
          padding: '0.75rem 1.5rem',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        {loading ? 'Processing...' : ticketType === 'free' ? 'Claim Free Ticket' : 'Pay Now'}
      </button>
      {message && (
        <p style={{ marginTop: '1rem', color: message.includes('success') || message.includes('confirmed') ? 'green' : 'red' }}>
          {message}
        </p>
      )}
    </form>
  );
}