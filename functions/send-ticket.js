// functions/send-ticket.js
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  const { ticketId, email, name, eventName, ticketType, ticketNumber, totalQuantity } = JSON.parse(event.body);

  try {
    const validateUrl = `https://nsgamedaytickets.netlify.app/validate?ticket=${ticketId}`;

    const ticketInfo = totalQuantity > 1 && ticketNumber
      ? ` (Ticket ${ticketNumber} of ${totalQuantity})`
      : '';

    const subject = totalQuantity > 1
      ? `Your ${ticketType} tickets for ${eventName}${ticketInfo}`
      : `Your ${ticketType} for ${eventName}`;

    await resend.emails.send({
      from: 'GameDay Tickets <tickets@gamedaytickets.io>',
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #1a73e8;">Hey ${name}!</h2>
          ${totalQuantity > 1
            ? `<p>Your tickets are ready!${ticketInfo}</p>`
            : '<p>Your ticket is ready!</p>'
          }
          <p><strong>Event:</strong> ${eventName}</p>
          <p><strong>Type:</strong> ${ticketType}</p>
          ${totalQuantity > 1 ? `<p><strong>Quantity:</strong> ${totalQuantity} tickets</p>` : ''}
          <div style="text-align: center; margin: 30px 0;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(validateUrl)}" alt="QR Code" />
          </div>
          <p>Show this QR at the door.</p>
          <p><a href="${validateUrl}" style="color: #1a73e8; text-decoration: none;">Validate Ticket</a></p>
          ${totalQuantity > 1 ? '<p style="color: #666; font-size: 14px;">You will receive a separate email for each ticket.</p>' : ''}
        </div>
      `,
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('EMAIL ERROR:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};