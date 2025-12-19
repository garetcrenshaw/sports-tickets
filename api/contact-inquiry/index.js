import { Resend } from '@resend/resend';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, description, preferredContact } = req.body;

  // Validate required fields
  if (!name || !email || !phone || !description) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing required fields' 
    });
  }

  // Check for Resend API key
  if (!process.env.RESEND_API_KEY) {
    console.error('Missing RESEND_API_KEY environment variable');
    return res.status(500).json({ 
      success: false,
      error: 'Email service not configured' 
    });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    // Send email to garetcrenshaw@gmail.com
    const result = await resend.emails.send({
      from: 'tickets@gamedaytickets.io',
      to: 'garetcrenshaw@gmail.com',
      subject: `🎟️ New Gameday Tickets Inquiry from ${name}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: #0a0a0a;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 32px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">
              New Business Inquiry
            </h1>
            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
              Someone wants to host their event with Gameday Tickets
            </p>
          </div>
          
          <!-- Content -->
          <div style="padding: 32px; background: #1a1a1a; color: #ffffff;">
            <h2 style="margin: 0 0 24px; font-size: 20px; color: #f97316; border-bottom: 1px solid #333; padding-bottom: 12px;">
              Contact Information
            </h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; color: #888; width: 140px; vertical-align: top;">Full Name:</td>
                <td style="padding: 12px 0; color: #fff; font-weight: 500;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #888; vertical-align: top;">Email:</td>
                <td style="padding: 12px 0;">
                  <a href="mailto:${email}" style="color: #f97316; text-decoration: none;">${email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #888; vertical-align: top;">Phone:</td>
                <td style="padding: 12px 0;">
                  <a href="tel:${phone}" style="color: #f97316; text-decoration: none;">${phone}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #888; vertical-align: top;">Preferred Contact:</td>
                <td style="padding: 12px 0; color: #fff;">
                  <span style="background: ${preferredContact === 'email' ? '#3b82f6' : '#22c55e'}; padding: 4px 12px; border-radius: 20px; font-size: 14px;">
                    ${preferredContact === 'email' ? '📧 Email' : '📞 Phone'}
                  </span>
                </td>
              </tr>
            </table>
            
            <h2 style="margin: 32px 0 16px; font-size: 20px; color: #f97316; border-bottom: 1px solid #333; padding-bottom: 12px;">
              Event Details
            </h2>
            
            <div style="background: #0a0a0a; border: 1px solid #333; border-radius: 12px; padding: 20px;">
              <p style="margin: 0; color: #ccc; line-height: 1.7; white-space: pre-wrap;">${description}</p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="padding: 24px 32px; background: #0a0a0a; border-top: 1px solid #333; text-align: center;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              This inquiry was submitted on ${new Date().toLocaleString('en-US', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
            <p style="margin: 12px 0 0; color: #444; font-size: 12px;">
              Gameday Tickets • Business Inquiries
            </p>
          </div>
        </div>
      `
    });

    console.log('✅ Contact inquiry email sent:', result);
    
    return res.json({ 
      success: true, 
      message: 'Inquiry submitted successfully',
      emailId: result.id
    });
  } catch (err) {
    console.error('❌ Contact inquiry email error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to send inquiry',
      details: err.message
    });
  }
}


