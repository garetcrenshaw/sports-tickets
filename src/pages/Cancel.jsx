import { Link } from 'react-router-dom';

export default function Cancel() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      padding: '20px',
      fontFamily: "'Outfit', system-ui, sans-serif"
    }}>
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse at top left, rgba(249, 115, 22, 0.1) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(59, 130, 246, 0.08) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />
      
      <div style={{
        background: 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '48px 40px',
        maxWidth: '460px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'rgba(239, 68, 68, 0.15)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px'
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>

        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: '700',
          marginBottom: '12px',
          color: 'white'
        }}>
          Payment Cancelled
        </h1>

        <p style={{
          fontSize: '1rem',
          color: 'rgba(255, 255, 255, 0.6)',
          marginBottom: '32px',
          lineHeight: '1.6'
        }}>
          Your payment was cancelled. No charges were made to your card.
          You can try again whenever you're ready.
        </p>

        <Link
          to="/events"
          style={{
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            color: 'white',
            padding: '14px 32px',
            borderRadius: '100px',
            textDecoration: 'none',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 0 30px rgba(249, 115, 22, 0.3)',
            transition: 'all 0.3s ease'
          }}
        >
          Browse Events
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>
    </div>
  );
}
