import QRCode from 'qrcode'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const handler = async (event) => {
  try {
    const { email, event_id, price } = JSON.parse(event.body)

    const fakeTicketId = Date.now()
    const validationUrl = `https://nsgamedaytickets.netlify.app/validate?ticket=${fakeTicketId}`

    // Generate QR as buffer
    const qrBuffer = await QRCode.toBuffer(validationUrl)

    // Upload to Supabase Storage
    const fileName = `qr/${fakeTicketId}.png`
    const { data, error } = await supabase.storage
      .from('tickets')
      .upload(fileName, qrBuffer, {
        contentType: 'image/png',
        upsert: true
      })

    if (error && error.statusCode !== '23505') throw error // ignore duplicate

    const { data: { publicUrl } } = supabase.storage
      .from('tickets')
      .getPublicUrl(fileName)

    // Send email with public URL
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'tickets@gamedaytickets.io',
        to: email,
        subject: 'Your GameDay Ticket',
        html: `
          <h2>Ticket Confirmed!</h2>
          <p>Event ID: ${event_id}</p>
          <p>Price: $${price}</p>
          <p><strong>Ticket ID:</strong> ${fakeTicketId}</p>
          <img src="${publicUrl}" width="200" alt="QR Code" />
          <p><a href="${validationUrl}">Validate Ticket</a></p>
        `
      })
    })

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, qr_url: publicUrl, ticket_id: fakeTicketId })
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }
}