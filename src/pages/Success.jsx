import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useLocation } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';

const supabase = createClient(
  'https://xjvzehjpgbwiiuvsnflk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqdnplaGpwZ2J3aWl1dnNuZmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDk1NTksImV4cCI6MjA3NzE4NTU1OX0.Y1vVNyKDuHoklqOvGAcW9zbIVaXOdaHQpgbRi3PeSSs'
);

export default function Success() {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const eventId = params.get('eventId');

  useEffect(() => {
    const load = async () => {
      if (!eventId) return setLoading(false);
      const { data } = await supabase.from('tickets').select('*').eq('event_id', eventId).single();
      setTicket(data);
      setLoading(false);
    };
    load();
  }, [eventId]);

  if (loading) return <div className="p-8 text-center">Loading your ticket...</div>;

  return (
    <div className="p-8 text-center max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-green-600">TICKET PURCHASED!</h1>
      <p className="mt-4">Check your email for the QR code.</p>
      {ticket?.qr_code_url ? (
        <div className="mt-6">
          <img src={ticket.qr_code_url} alt="Your QR Code" className="mx-auto border rounded-lg shadow-lg w-48 h-48" />
          <p className="mt-4 text-sm text-gray-600">Scan at the gate</p>
        </div>
      ) : ticket ? (
        <div className="mt-6">
          <QRCodeCanvas value={`ticket:${ticket.stripe_intent_id}`} size={192} />
          <p className="mt-4 text-sm text-gray-600">Scan at the gate</p>
        </div>
      ) : (
        <p className="mt-4 text-red-600">No ticket found.</p>
      )}
    </div>
  );
}
