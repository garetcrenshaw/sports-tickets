import { Link } from 'react-router-dom';

export default function Cancel() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          opacity: 0.7
        }}>
          ❌
        </div>

        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          marginBottom: '16px',
          color: '#1f2937'
        }}>
          Payment Cancelled
        </h1>

        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          marginBottom: '32px',
          lineHeight: '1.6'
        }}>
          Your payment was cancelled. No charges were made to your card.
          You can try again whenever you're ready.
        </p>

        <Link
          to="/events"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '600',
            display: 'inline-block',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.target.style.transform = 'transform: none'}
        >
          Browse Events
        </Link>
      </div>
    </div>
  );
}
