import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

export default function Success() {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (!sessionId) {
      setLoading(false);
      return;
    }

    fetch(`/api/ticket/session/${sessionId}`)
      .then(r => r.json())
      .then(data => {
        setTicket(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8 text-center">Loading your ticket...</div>;
  }

  if (!ticket) {
    return <div className="p-8 text-center text-red-600">No ticket found.</div>;
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-xl shadow-xl text-center max-w-md w-full">
        <h1 className="text-3xl font-bold text-green-600 mb-4">
          TICKET SECURED!
        </h1>
        <h2 className="text-xl font-semibold mb-2">{ticket.event.title}</h2>
        <p className="text-gray-600 mb-6">Scan at the gate</p>

        <div className="bg-gray-100 p-4 rounded-lg inline-block">
          <QRCodeCanvas value={`TICKET:${ticket.id}`} size={200} />
        </div>

        <p className="mt-6 text-sm text-gray-500">
          Email sent to: <strong>{ticket.email}</strong>
        </p>
      </div>
    </div>
  );
}