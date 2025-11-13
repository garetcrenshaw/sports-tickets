// functions/send-ticket.js
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  const { ticketId, email, name, eventName, ticketType } = JSON.parse(event.body);

  try {
    const validateUrl = `https://nsgamedaytickets.netlify.app/validate?ticket=${ticketId}`;

    await resend.emails.send({
      from: 'GameDay Tickets <tickets@gamedaytickets.io>',
      to: email,
      subject: `Your ${ticketType} for ${eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #1a73e8;">Hey ${name}!</h2>
          <p>Your ticket is ready!</p>
          <p><strong>Event:</strong> ${eventName}</p>
          <p><strong>Type:</strong> ${ticketType}</p>
          <div style="text-align: center; margin: 30px 0;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(validateUrl)}" alt="QR Code" />
          </div>
          <p>Show this QR at the door.</p>
          <p><a href="${validateUrl}" style="color: #1a73e8; text-decoration: none;">Validate Ticket</a></p>
        </div>
      `,
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('EMAIL ERROR:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};