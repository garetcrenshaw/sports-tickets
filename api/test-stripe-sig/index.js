import Stripe from 'stripe';
import { buffer } from 'micro';

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  console.log('=== STRIPE SIGNATURE TEST ===');
  
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ 
      success: false,
      error: 'Missing STRIPE_WEBHOOK_SECRET environment variable' 
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method Not Allowed - use POST' 
    });
  }

  try {
    // Get raw buffer using micro
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];
    
    console.log('Raw body buffer length:', buf.length);
    console.log('Content-Length header:', req.headers['content-length']);
    console.log('Stripe signature present:', !!sig);
    console.log('Buffer vs Content-Length match:', buf.length === parseInt(req.headers['content-length']));

    if (!sig) {
      return res.status(400).json({ 
        success: false,
        error: 'No Stripe signature header provided',
        hint: 'Trigger with: stripe trigger checkout.session.completed'
      });
    }

    if (!buf || buf.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No request body received' 
      });
    }

    // Attempt to verify the signature
    const stripeEvent = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log('✅ Event verified successfully!');
    console.log('Event type:', stripeEvent.type);
    console.log('Event ID:', stripeEvent.id);

    return res.json({ 
      success: true, 
      message: 'Stripe signature verification passed!',
      eventType: stripeEvent.type,
      eventId: stripeEvent.id,
      bufferLength: buf.length,
      contentLength: req.headers['content-length']
    });
  } catch (err) {
    console.error('❌ Signature verification failed:', err.message);
    
    return res.status(400).json({ 
      success: false, 
      error: err.message,
      hint: 'Check that STRIPE_WEBHOOK_SECRET matches the secret from stripe listen or dashboard'
    });
  }
}

