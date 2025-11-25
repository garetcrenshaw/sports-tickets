const { Resend } = require('resend');
const { requireEnv } = require('../../src/lib/stripe.js');

const resend = new Resend(requireEnv('RESEND_API_KEY'));

function buildTicketSection({ title, items, accentColor, backgroundColor }) {
  if (!items || items.length === 0) {
    return '';
  }

  const cards = items
    .map((item, index) => `
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(15,23,42,0.12);">
        <p style="margin:0 0 8px;font-weight:600;">${item.label || `${title} ${index + 1}`}</p>
        <div style="text-align:center;margin:12px 0;">
          <img src="${item.qrCodeUrl}" width="220" alt="${item.ticketType || title} QR ${index + 1}" style="border-radius:8px;border:2px solid ${accentColor};" />
        </div>
        <p style="margin:0;color:rgba(15,23,42,0.75);font-size:14px;">${item.ticketType || title} • Valid for one entry</p>
      </div>
    `)
    .join('');

  return `
    <div style="margin-top:24px;padding:18px;border-radius:16px;background:${backgroundColor};border:1px solid ${accentColor};">
      <h3 style="margin:0 0 8px 0;color:${accentColor};font-size:18px;">${title}</h3>
      ${cards}
    </div>
  `;
}

function buildSubject(ticketsCount, parkingCount) {
  const parts = [];
  if (ticketsCount > 0) {
    parts.push(`${ticketsCount} Ticket${ticketsCount > 1 ? 's' : ''}`);
  }
  if (parkingCount > 0) {
    parts.push(`${parkingCount} Parking Pass${parkingCount > 1 ? 'es' : ''}`);
  }
  return parts.length ? `Your ${parts.join(' + ')}` : 'Your Gameday Order';
}

async function sendTicketsEmail({
  email,
  name,
  eventName,
  totalAmount,
  tickets = [],
  parkingPasses = [],
}) {
  const ticketsCount = tickets.length;
  const parkingCount = parkingPasses.length;
  const totalItems = ticketsCount + parkingCount;

  if (!email || totalItems === 0) {
    throw new Error('Missing email or passes for sendTicketsEmail');
  }

  const ticketsHtml = buildTicketSection({
    title: '🎫 Gameday Admission Tickets',
    items: tickets,
    accentColor: '#0f172a',
    backgroundColor: '#eef2ff',
  });

  const parkingHtml = buildTicketSection({
    title: '🅿️ Gameday Parking Passes',
    items: parkingPasses,
    accentColor: '#b45309',
    backgroundColor: '#fff7ed',
  });

  const { data, error } = await resend.emails.send({
    from: 'GameDay Tickets <tickets@gamedaytickets.io>',
    to: email,
    subject: buildSubject(ticketsCount, parkingCount),
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 640px; margin: auto; padding: 24px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="margin: 0; color: #0f172a; font-size: 28px;">🎉 Welcome to Gameday!</h1>
          <p style="margin: 8px 0 0 0; color: #64748b; font-size: 16px;">Your tickets are ready</p>
        </div>

        <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
          <h2 style="margin: 0 0 8px 0; color: #0f172a;">Hi ${name || 'Fan'}!</h2>
          <p style="margin: 0 0 8px 0; color: #374151; line-height: 1.5;">Your order for <strong>${eventName || 'General Admission'}</strong> is confirmed.</p>
          <p style="margin: 0 0 16px 0; color: #374151; font-size: 18px;"><strong>Total charged: $${Number(totalAmount || 0).toFixed(2)}</strong></p>
        </div>

        ${ticketsHtml}
        ${parkingHtml}

        <div style="margin-top: 32px; padding: 20px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <h4 style="margin: 0 0 8px 0; color: #92400e;">⚠️ Important Information</h4>
          <ul style="margin: 0; padding-left: 16px; color: #92400e; line-height: 1.5;">
            <li>Doors open at 6:00 PM - arrive early!</li>
            <li>Show the QR code at the entrance or parking gate</li>
            <li>Each QR code can only be scanned once</li>
            <li>Keep this email safe - QR codes are your tickets</li>
          </ul>
        </div>

        <div style="margin-top: 24px; text-align: center; color: #64748b; font-size: 14px;">
          <p style="margin: 0;">Questions? Contact us at tickets@gamedaytickets.io</p>
          <p style="margin: 8px 0 0 0;">© 2024 GameDay Tickets. All rights reserved.</p>
        </div>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Email send failed: ${error.message}`);
  }

  return data;
}

module.exports = {
  sendTicketsEmail,
};
