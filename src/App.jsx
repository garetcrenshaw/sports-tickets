// src/App.jsx
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from './components/CheckoutForm';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const event = {
  id: 1,
  name: 'Lakers vs Warriors',
  date: 'Nov 15, 2025',
};

const tickets = [
  { type: 'ga', label: 'General Admission', price: 15 },
  { type: 'free', label: 'Free Admission', price: 0 },
  { type: 'parking', label: 'Parking Pass', price: 15 },
];

export default function App() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);

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
            onClick={() => setSelectedTicket(t)}
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

   {selectedTicket && (
  <Elements stripe={stripePromise}>
    <CheckoutForm
      email={email}
      name={name}
      eventId={event.id}
      ticketType={selectedTicket.type}
    />
  </Elements>
)}