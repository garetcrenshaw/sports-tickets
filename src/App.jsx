import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from './components/CheckoutForm';

const stripePromise = loadStripe('pk_test_51SNPmgRrKoC9NoMdrXNsUJhrA6GoeljPXPFGWWMcX5qjz5lw0PJ7NWNEDt2Pl9tEyVF4LWppwOYgdoC9nYutXRZQ00vYZ8Pc6v');

function Home() {
  const [email, setEmail] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  const startPayment = async () => {
    if (!email) return alert('Enter email');
    const res = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 2500, email, eventId: 'test' }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    setClientSecret(data.clientSecret);
  };

  if (clientSecret) {
    return (
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <CheckoutForm email={email} event={{ priceCents: 2500 }} onBack={() => setClientSecret('')} />
      </Elements>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-center mb-6">Sports Tickets</h1>
      <input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="mt-4 p-3 border rounded w-full"
      />
      <div className="mt-8 border p-6 rounded-lg">
        <h2 className="text-2xl font-semibold">Lakers vs Warriors</h2>
        <p className="text-xl mt-2">$25.00</p>
        <button
          onClick={startPayment}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg"
        >
          BUY TICKET
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
