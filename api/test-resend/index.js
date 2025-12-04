import { Resend } from 'resend';

export default async function handler(req, res) {
  console.log('=== RESEND EMAIL TEST ===');
  
  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ 
      success: false,
      error: 'Missing RESEND_API_KEY environment variable' 
    });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    console.log('Sending test email to garetcrenshaw@gmail.com...');
    
    const result = await resend.emails.send({
      from: 'tickets@gamedaytickets.io',
      to: 'garetcrenshaw@gmail.com',
      subject: 'Test Email from Sports Tickets App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #22c55e;">✅ Resend Integration Test</h2>
          <p>If you're reading this, your Resend integration is working correctly!</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <hr style="margin: 20px 0; border: 1px solid #e5e7eb;" />
          <p style="color: #666; font-size: 14px;">
            This is an automated test email from your sports-tickets application.
          </p>
        </div>
      `
    });

    console.log('✅ Email sent successfully:', result);
    
    return res.json({ 
      success: true, 
      message: 'Email sent successfully',
      emailId: result.id,
      to: 'garetcrenshaw@gmail.com'
    });
  } catch (err) {
    console.error('❌ Email send error:', err);
    return res.status(500).json({ 
      success: false, 
      error: err.message,
      details: err.response?.data || err
    });
  }
}

