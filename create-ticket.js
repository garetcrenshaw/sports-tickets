import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const handler = async (event) => {
  try {
    const { ticket_id, email, event_id, price } = JSON.parse(event.body)

    // Update ticket
    const { data: ticket } = await supabase
      .from('tickets')
      .update({ 
        status: 'paid',
        email,
        price
      })
      .eq('id', ticket_id)
      .select()
      .single()

    // Generate QR
    const validationUrl = `https://nsgamedaytickets.netlify.app/validate?ticket=${ticket.id}`
    const qrDataUrl = await QRCode.toDataURL(validationUrl)

    // Save QR
    await supabase
      .from('tickets')
      .update({ qr_code_url: qrDataUrl })
      .eq('id', ticket.id)

    // Send email
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
          <img src="${qrDataUrl}" alt="QR Code" width="200" />
          <p>Scan at entry. Valid once.</p>
        `
      })
    })

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, qr: qrDataUrl })
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }
}