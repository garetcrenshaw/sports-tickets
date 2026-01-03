import twilio from 'twilio';

/**
 * POST /api/send-sms
 * 
 * Sends SMS with ticket link via Twilio
 * Called by webhook after successful payment
 * 
 * Request body:
 * {
 *   to: "+15551234567",
 *   buyerName: "John Doe",
 *   ticketCount: 3,
 *   eventName: "SoCal Cup: 12-18 Friendly",
 *   orderId: "cs_xxx"
 * }
 */

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify Twilio is configured
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.error('SEND-SMS: Twilio not configured');
    return res.status(500).json({ error: 'SMS service not configured' });
  }

  const { to, buyerName, ticketCount, eventName, orderId } = req.body;

  if (!to || !orderId) {
    return res.status(400).json({ error: 'Phone number and order ID required' });
  }

  // Build the ticket viewing URL
  const baseUrl = process.env.SITE_URL || 'https://gamedaytickets.io';
  const ticketUrl = `${baseUrl}/tickets?order=${orderId}`;

  // Format the message
  const firstName = buyerName?.split(' ')[0] || 'there';
  const ticketText = ticketCount === 1 ? '1 ticket' : `${ticketCount} tickets`;
  
  const message = `🎟️ Hey ${firstName}! Your ${ticketText} for ${eventName || 'your event'} are ready.\n\nView tickets: ${ticketUrl}\n\nShow the QR code at entry. See you there!`;

  console.log('SEND-SMS: Sending to:', to);
  console.log('SEND-SMS: Message:', message);

  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });

    console.log('SEND-SMS: Success! SID:', result.sid);

    return res.status(200).json({
      success: true,
      sid: result.sid
    });

  } catch (error) {
    console.error('SEND-SMS: Twilio error:', error.message);
    
    return res.status(500).json({
      error: 'Failed to send SMS',
      details: error.message
    });
  }
}

