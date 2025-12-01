import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function Validate() {
  const [searchParams] = useSearchParams()
  const ticketId = searchParams.get('ticket')

  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [ticketInfo, setTicketInfo] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!ticketId) {
      setStatus('error')
      setMessage('Missing ticket ID in URL')
      return
    }

    if (!password) {
      setStatus('error')
      setMessage('Enter the staff password to validate tickets')
      return
    }

    setStatus('checking')
    setMessage('')

    try {
      const apiUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '';
      const response = await fetch(`${apiUrl}/api/validate-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate ticket')
      }

      setTicketInfo(data.ticket)

      if (data.valid) {
        setStatus('valid')
        setMessage('Ticket validated successfully!')
      } else {
        setStatus('used')
        setMessage(data.message || 'Ticket already validated')
      }
    } catch (error) {
      console.error('VALIDATE ERROR:', error)
      setStatus('error')
      setMessage(error.message || 'Server error')
    }
  }

  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'Arial', maxWidth: '500px', margin: '0 auto' }}>
      <h1>Ticket Validation</h1>

      {!ticketId && (
        <p style={{ color: '#c0392b' }}>Missing ticket ID</p>
      )}

      <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem' }}>
        <input
          type="password"
          placeholder="Staff password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
        />
        <button
          type="submit"
          disabled={!ticketId}
          style={{
            padding: '0.75rem',
            background: '#0561FF',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Validate Ticket
        </button>
      </form>

      {status === 'checking' && <p>Checking ticket...</p>}
      {status === 'valid' && (
        <div style={{ color: 'green', marginTop: '1.5rem' }}>
          <h2>✅ VALID</h2>
          <p>{message}</p>
          {ticketInfo && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0f9ff', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontWeight: 'bold' }}>{ticketInfo.ticket_type || 'Item'}</p>
              <p style={{ margin: '0.5rem 0', color: '#666' }}>{ticketInfo.purchaser_email}</p>
              <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>ID: {ticketInfo.ticket_id}</p>
            </div>
          )}
        </div>
      )}
      {status === 'used' && (
        <div style={{ color: '#c0392b', marginTop: '1.5rem' }}>
          <h2>❌ ALREADY USED</h2>
          <p>{message}</p>
          {ticketInfo && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#fef2f2', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontWeight: 'bold' }}>{ticketInfo.ticket_type || 'Item'}</p>
              <p style={{ margin: '0.5rem 0', color: '#666' }}>{ticketInfo.purchaser_email}</p>
              <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>ID: {ticketInfo.ticket_id}</p>
            </div>
          )}
        </div>
      )}
      {status === 'error' && (
        <div style={{ color: '#c0392b', marginTop: '1.5rem' }}>
          <h2>ERROR</h2>
          <p>{message}</p>
        </div>
      )}
    </div>
  )
}
