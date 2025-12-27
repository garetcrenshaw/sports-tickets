import { Resend } from '@resend/resend'

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { name, email, phone, description, preferredContact } = req.body

    if (!name || !email || !phone || !description) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured')
      // Still return success - we don't want to block the user
      return res.status(200).json({ 
        success: true, 
        message: 'Inquiry received (email service not configured)',
        data: { name, email, phone, description, preferredContact }
      })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    // Send notification email to you
    const notificationResult = await resend.emails.send({
      from: 'GameDay Tickets <tickets@gamedaytickets.io>',
      to: 'garetcrenshaw@gmail.com',
      subject: `🎟️ New Business Inquiry from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #f97316; margin-bottom: 24px;">New Business Inquiry</h1>
          
          <div style="background: #f8f9fa; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #1f2937;">Contact Information</h2>
            <p style="margin: 8px 0;"><strong>Name:</strong> ${name}</p>
            <p style="margin: 8px 0;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <p style="margin: 8px 0;"><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></p>
            <p style="margin: 8px 0;"><strong>Preferred Contact:</strong> ${preferredContact}</p>
          </div>

          <div style="background: #fff3e0; padding: 24px; border-radius: 12px; border-left: 4px solid #f97316;">
            <h2 style="margin: 0 0 16px 0; color: #1f2937;">Event Details</h2>
            <p style="margin: 0; white-space: pre-wrap; color: #374151;">${description}</p>
          </div>

          <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280;">
            <p style="margin: 0;">Received via Gameday Tickets Contact Form</p>
            <p style="margin: 8px 0 0 0; font-size: 12px;">${new Date().toLocaleString()}</p>
          </div>
        </div>
      `
    })

    console.log('Notification email sent:', notificationResult)

    // Send confirmation to inquirer
    try {
      await resend.emails.send({
        from: 'GameDay Tickets <tickets@gamedaytickets.io>',
        to: email,
        subject: 'We received your inquiry - Gameday Tickets',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #f97316; margin-bottom: 24px;">Thanks for reaching out, ${name.split(' ')[0]}!</h1>
            
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              We've received your inquiry and our team will review it shortly. 
              We'll be in touch with you soon.
            </p>

            <div style="background: #f8f9fa; padding: 24px; border-radius: 12px; margin: 24px 0;">
              <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 16px;">Your Message:</h2>
              <p style="margin: 0; white-space: pre-wrap; color: #6b7280; font-style: italic;">"${description}"</p>
            </div>

            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              In the meantime, feel free to reply to this email if you have any additional details to share.
            </p>

            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280;">
              <p style="margin: 0; font-weight: 600;">Gameday Tickets</p>
              <p style="margin: 8px 0 0 0; font-size: 12px;">The simplest way to buy, send, and scan event tickets.</p>
            </div>
          </div>
        `
      })
    } catch (confirmError) {
      // Confirmation email failed but notification succeeded - that's okay
      console.log('Confirmation email to inquirer failed (expected on free tier):', confirmError.message)
    }

    return res.status(200).json({ success: true, message: 'Inquiry sent successfully' })

  } catch (error) {
    console.error('Contact inquiry error:', error)
    return res.status(500).json({ error: 'Failed to send inquiry', details: error.message })
  }
}
