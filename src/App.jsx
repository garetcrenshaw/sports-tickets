// src/App.jsx
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import Success from './pages/Success';

// ---------- CONFIG ----------
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
// --------------------------------

function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');

  // Load events
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });
      if (error) console.error(error);
      else setEvents(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  // BUY TICKET – creates Checkout Session via Stripe API
  const buyTicket = async (event) => {
  const email = prompt('Enter your email:');
  if (!email) return;

  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId: event.stripe_price_id, email }),
  });

  const { id: sessionId } = await response.json();

  const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  const { error } = await stripe.redirectToCheckout({ sessionId });

  if (error) {
    console.error('Stripe redirect error:', error);
    alert('Checkout failed: ' + error.message);
  }
};
    if (!email) {
      alert('Please enter your email');
      return;
    }

    const body = new URLSearchParams({
      'payment_method_types[]': 'card',
      'line_items[0][price]': event.stripe_price_id,
      'line_items[0][quantity]': '1',
      mode: 'payment',
      success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}&event_id=${event.id}&email=${email}`,
      cancel_url: window.location.origin,
    });

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const session = await res.json();

    if (session.id) {
      const stripe = await import('@stripe/stripe-js').then((mod) => mod.loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY));
      await stripe.redirectToCheckout({ sessionId: session.id });
    } else {
      console.error(session);
      alert('Checkout failed: ' + (session.error?.message ?? 'unknown'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl">Loading events...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl font-bold text-center mb-12 text-indigo-800">
          Sports Tickets Arena
        </h1>

        {/* Email input – shown once per session */}
        <div className="mb-8 text-center">
          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-4 py-2 border rounded-lg w-64"
          />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.length === 0 ? (
            <p className="text-center col-span-full text-gray-600">
              No events found. Add some in Supabase!
            </p>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition transform hover:-translate-y-1 p-6"
              >
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{event.title}</h2>
                <p className="text-gray-600 mb-1">{event.date}</p>
                <p className="text-3xl font-bold text-green-600 mb-6">
                  ${(event.priceCents / 100).toFixed(2)}
                </p>
                <button
                  onClick={() => buyTicket(event)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition"
                >
                  BUY TICKET
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/success" element={<Success />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;