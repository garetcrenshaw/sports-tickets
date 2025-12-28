// OVERRIDE FILE - Prevents Vercel from loading cached version
// This file exists solely to override any cached send-ticket.js
// DO NOT import anything - this file should not be used
export default function handler(req, res) {
  return res.status(410).json({ 
    error: 'Deprecated',
    message: 'This endpoint has been removed. Use the email queue processor instead.'
  });
}

