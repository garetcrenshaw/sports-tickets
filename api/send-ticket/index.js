// Minimal valid endpoint - no imports, no env vars, no module-load errors
// This exists to replace the old send-ticket.js file that Vercel has cached

export default function handler(req, res) {
  return res.status(410).json({ 
    error: 'Deprecated',
    message: 'This endpoint has been removed.'
  });
}


