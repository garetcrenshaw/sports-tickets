const { Resend } = require('resend');
const { requireEnv } = require('../../src/lib/stripe');

const resend = new Resend(requireEnv('RESEND_API_KEY'));

function buildTicketsHtml(tickets) {
  return tickets
    .map((ticket, index) => `
      <hr />
      <h3>Ticket ${index + 1} of ${tickets.length}</h3>
      <div style="text-align:center;margin:20px 0;">
        <img src="${ticket.qrCodeUrl}" width="200" alt="Ticket ${index + 1} QR" />
      </div>
      <p><strong>General Admission Ticket</strong></p>
    `)
    .join('');
}

async function sendTicketsEmail({ email, name, eventName, totalAmount, tickets }) {
  if (!email || !tickets || tickets.length === 0) {
    throw new Error('Missing email or tickets for sendTicketsEmail');
  }

  const subject = tickets.length === 1
    ? `Your General Admission Ticket`
    : `Your ${tickets.length} General Admission Tickets`;

  const ticketsHtml = buildTicketsHtml(tickets);

  await resend.emails.send({
    from: 'GameDay Tickets <tickets@gamedaytickets.io>',
    to: email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h2>Hi ${name || 'Guest'}!</h2>
        <p>You purchased <strong>${tickets.length} General Admission ticket${tickets.length > 1 ? 's' : ''}</strong></p>
        <p><strong>Total: $${Number(totalAmount || 0).toFixed(2)}</strong></p>
        <p><strong>Event:</strong> ${eventName}</p>
        ${ticketsHtml}
        <hr />
        <p>Doors open at 6:00 PM. See you there!</p>
      </div>
    `,
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    await sendTicketsEmail(payload);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('EMAIL ERROR:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

exports.sendTicketsEmail = sendTicketsEmail;
