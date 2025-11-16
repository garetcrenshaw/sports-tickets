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

    const subject = `Your ${totalQuantity} General Admission Ticket${totalQuantity > 1 ? 's' : ''}`;

    await resend.emails.send({
      from: 'GameDay Tickets <tickets@gamedaytickets.io>',
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
          <h2>Hi ${name}!</h2>
          <p>You purchased <strong>${totalQuantity} General Admission ticket${totalQuantity > 1 ? 's' : ''}</strong></p>
          <p><strong>Total: $${(15 * totalQuantity).toFixed(2)}</strong></p>
          <hr>

          <h3>TICKET ${ticketNumber} OF ${totalQuantity}</h3>
          <div style="text-align: center; margin: 20px 0;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(validateUrl)}" width="200" alt="QR Code" />
          </div>
          <p><strong>General Admission</strong></p>
          <hr>

          <p>Doors open at 6:00 PM. See you there!</p>
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