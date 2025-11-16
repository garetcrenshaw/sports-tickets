import { useSearchParams } from 'react-router-dom'

export default function Success() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')

  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'Arial', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ color: '#28a745' }}>✅ Payment Successful!</h1>
      <p>Thank you for your purchase!</p>
      <p>Your tickets will be emailed to you shortly.</p>
      {sessionId && (
        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '2rem' }}>
          Session ID: {sessionId}
        </p>
      )}
      <div style={{ marginTop: '2rem' }}>
        <a
          href="/"
          style={{
            padding: '0.75rem 1.5rem',
            background: '#0561FF',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '8px',
            display: 'inline-block'
          }}
        >
          Back to Home
        </a>
      </div>
    </div>
  )
}
