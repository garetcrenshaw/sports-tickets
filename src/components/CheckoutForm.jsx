import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

export default function CheckoutForm({ email, event, onBack }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/success?eventId=${event.id}`,
      },
    });

    if (error) {
      setError(error.message);
    }
    setProcessing(false);
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <button onClick={onBack} className="mb-4 text-blue-600 hover:underline">&larr; Back</button>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 border rounded-lg bg-gray-50">
          <PaymentElement />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button
          disabled={processing || !stripe}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
        >
          {processing ? 'Processing...' : `Pay $${(event.priceCents / 100).toFixed(2)}`}
        </button>
      </form>
    </div>
  );
}
