// functions/send-ticket.js
const { Resend } = require('resend');
const QRCode = require('qrcode');

const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  const { ticketId, email, name, eventName, ticketType } = JSON.parse(event.body);

  try {
    const qrData = `https://nsgamedaytickets.netlify.app/validate?ticket=${ticketId}`;
    const qrCode = await QRCode.toDataURL(qrData);

    await resend.emails.send({
      from: 'GameDay Tickets <tickets@gamedaytickets.io>',
      to: email,
      subject: `Your ${ticketType} Ticket for ${eventName}`,
      html: `
        <h2>Hey ${name}!</h2>
        <p>Your ticket is ready!</p>
        <p><strong>Event:</strong> ${eventName}</p>
        <p><strong>Type:</strong> ${ticketType}</p>
        <p><img src="${qrCode}" alt="QR Code" style="width: 200px; height: 200px;" /></p>
        <p>Show this QR at the door.</p>
        <p><a href="${qrData}">Validate Ticket</a></p>
      `,
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('EMAIL ERROR:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};