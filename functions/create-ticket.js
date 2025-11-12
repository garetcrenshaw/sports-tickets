import QRCode from 'qrcode'

export const handler = async (event) => {
  try {
    const { email, event_id, price } = JSON.parse(event.body)

    const fakeTicketId = Date.now()
    const validationUrl = `https://nsgamedaytickets.netlify.app/validate?ticket=${fakeTicketId}`
    const qrDataUrl = await QRCode.toDataURL(validationUrl)

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
          <img src="${qrDataUrl}" width="200" />
          <p>Scan at entry. Valid once.</p>
        `
      })
    })

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, qr: qrDataUrl, ticket_id: fakeTicketId })
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }
}