// src/pages/Validate.jsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function Validate() {
  const [searchParams] = useSearchParams();
  const ticketId = searchParams.get('ticket');
  const [status, setStatus] = useState('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!ticketId) {
      setStatus('error');
      setMessage('No ticket ID');
      return;
    }

    fetch('/.netlify/functions/validate-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          setStatus('valid');
          setMessage(`Valid! ${data.ticket.email} - ${data.ticket.ticket_type}`);
        } else {
          setStatus('used');
          setMessage(`Already Used: ${data.ticket.email} - ${data.ticket.ticket_type}`);
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Server error');
      });
  }, [ticketId]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'Arial' }}>
      <h1>Ticket Validation</h1>
      {status === 'checking' && <p>Checking ticket...</p>}
      {status === 'valid' && (
        <div style={{ color: 'green' }}>
          <h2>VALID</h2>
          <p>{message}</p>
        </div>
      )}
      {status === 'used' && (
        <div style={{ color: 'red' }}>
          <h2>ALREADY USED</h2>
          <p>{message}</p>
        </div>
      )}
      {status === 'error' && (
        <div style={{ color: 'red' }}>
          <h2>ERROR</h2>
          <p>{message}</p>
        </div>
      )}
    </div>
  );
}