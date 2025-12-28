// Minimal webhook test endpoint to diagnose module loading issues
export default async function handler(req, res) {
  console.log('🧪 TEST WEBHOOK CALLED');
  return res.status(200).json({ 
    status: 'ok',
    message: 'Webhook endpoint is accessible',
    timestamp: new Date().toISOString()
  });
}

