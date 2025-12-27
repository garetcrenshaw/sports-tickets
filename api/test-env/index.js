// Quick test endpoint to verify environment variables are loaded
export default function handler(req, res) {
  const envVars = {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'SET (first 10 chars: ' + process.env.STRIPE_SECRET_KEY.substring(0, 10) + '...)' : 'MISSING',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? 'SET (first 10 chars: ' + process.env.STRIPE_WEBHOOK_SECRET.substring(0, 10) + '...)' : 'MISSING',
    SUPABASE_URL: process.env.SUPABASE_URL || 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET (first 20 chars: ' + process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + '...)' : 'MISSING',
    RESEND_API_KEY: process.env.RESEND_API_KEY ? 'SET (first 10 chars: ' + process.env.RESEND_API_KEY.substring(0, 10) + '...)' : 'MISSING',
    CRON_SECRET: process.env.CRON_SECRET ? 'SET' : 'MISSING',
  };

  return res.status(200).json({
    message: 'Environment Variables Check',
    vars: envVars,
    timestamp: new Date().toISOString()
  });
}

