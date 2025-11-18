import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

export default function Success() {
  const [searchParams] = useSearchParams();
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    const id = searchParams.get('session_id');
    if (id) {
      setSessionId(id);
      console.log('✅ Payment successful! Session ID:', id);
    }
  }, [searchParams]);

  return (
    <div style={{ 
      maxWidth: '600px', 
      margin: '80px auto', 
      padding: '40px',
      textAlign: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Success Icon */}
      <div style={{ 
        fontSize: '80px', 
        marginBottom: '20px',
        animation: 'bounce 0.6s ease-in-out'
      }}>
        ✅
      </div>

      {/* Success Message */}
      <h1 style={{ 
        fontSize: '32px', 
        marginBottom: '16px',
        color: '#22c55e',
        fontWeight: 'bold'
      }}>
        Payment Successful!
      </h1>

      <p style={{ 
        fontSize: '18px', 
        marginBottom: '32px',
        color: '#666',
        lineHeight: '1.6'
      }}>
        🎉 Your ticket purchase is complete!<br />
        <strong>Your tickets are being processed and will be emailed to you in a few seconds.</strong>
      </p>

      <div style={{
        background: '#f0f9ff',
        border: '2px solid #3b82f6',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px',
        fontSize: '14px',
        color: '#1e40af'
      }}>
        ⏱️ <strong>Processing:</strong> You'll receive an email with your QR code ticket{sessionId ? 's' : ''} shortly. Check your inbox (and spam folder just in case)!
      </div>

      {/* Session Info */}
      {sessionId && (
        <div style={{
          background: '#f3f4f6',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '32px',
          fontSize: '14px',
          color: '#666'
        }}>
          <strong>Transaction ID:</strong><br />
          <code style={{ 
            fontSize: '12px',
            wordBreak: 'break-all'
          }}>
            {sessionId}
          </code>
        </div>
      )}

      {/* What's Next */}
      <div style={{
        background: '#eff6ff',
        border: '2px solid #3b82f6',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '32px',
        textAlign: 'left'
      }}>
        <h2 style={{ 
          fontSize: '20px', 
          marginBottom: '16px',
          color: '#1e40af'
        }}>
          📧 What's Next?
        </h2>
        <ul style={{ 
          margin: 0, 
          paddingLeft: '20px',
          lineHeight: '1.8',
          color: '#1e40af'
        }}>
          <li>You'll receive an email with your QR code tickets</li>
          <li>Show the QR code at the entrance</li>
          <li>Each ticket is unique and can only be scanned once</li>
          <li>Doors open at 6:00 PM</li>
        </ul>
      </div>

      {/* Test Card Notice (for development) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          background: '#fef3c7',
          border: '2px solid #f59e0b',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          fontSize: '14px',
          color: '#92400e'
        }}>
          <strong>🧪 Test Mode:</strong> This was a test payment.<br />
          Card used: 4242 4242 4242 4242
        </div>
      )}

      {/* Back Button */}
      <Link 
        to="/" 
        style={{
          display: 'inline-block',
          background: '#3b82f6',
          color: 'white',
          padding: '14px 32px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontSize: '16px',
          fontWeight: '600',
          transition: 'background 0.2s'
        }}
        onMouseOver={(e) => e.target.style.background = '#2563eb'}
        onMouseOut={(e) => e.target.style.background = '#3b82f6'}
      >
        ← Back to Home
      </Link>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}
