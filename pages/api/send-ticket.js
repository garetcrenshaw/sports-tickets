const { Resend } = require('resend');
const { requireEnv } = require('../src/lib/stripe');
const { setCors, sendJson, end, readJson } = require('./_utils');

const resend = new Resend(requireEnv('RESEND_API_KEY'));

function buildPassSection({ title, items, accentColor, backgroundColor }) {
  if (!items || items.length === 0) {
    return '';
  }

  const cards = items
    .map((item, index) => `
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(15,23,42,0.12);">
        <p style="margin:0 0 8px;font-weight:600;">${item.label || `${title} ${index + 1}`}</p>
        <div style="text-align:center;margin:12px 0;">
          <img src="${item.qrCodeUrl}" width="220" alt="${item.ticketType || title} QR ${index + 1}" />
        </div>
        <p style="margin:0;color:rgba(15,23,42,0.75);">${item.ticketType || title}</p>
      </div>
    `)
    .join('');

  return `
    <div style="margin-top:24px;padding:18px;border-radius:16px;background:${backgroundColor};border:1px solid ${accentColor};">
      <h3 style="margin:0 0 8px 0;color:${accentColor};">${title}</h3>
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

  const ticketsHtml = buildPassSection({
    title: 'Gameday Tickets',
    items: tickets,
    accentColor: '#0f172a',
    backgroundColor: '#eef2ff',
  });

  const parkingHtml = buildPassSection({
    title: 'Gameday Parking',
    items: parkingPasses,
    accentColor: '#b45309',
    backgroundColor: '#fff7ed',
  });

  await resend.emails.send({
    from: 'GameDay Tickets <tickets@gamedaytickets.io>',
    to: email,
    subject: buildSubject(ticketsCount, parkingCount),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: auto; padding: 24px;">
        <h2 style="margin-top:0;">Hi ${name || 'Guest'}!</h2>
        <p style="margin:0 0 8px 0;">Your order for <strong>${eventName || 'General Admission'}</strong> is confirmed.</p>
        <p style="margin:0 0 16px 0;">Total charged: <strong>$${Number(totalAmount || 0).toFixed(2)}</strong></p>
        ${ticketsHtml}
        ${parkingHtml}
        <p style="margin-top:32px;color:rgba(15,23,42,0.65);">Doors open at 6:00 PM. Show the correct QR at the entrance or parking gate. Each code can only be scanned once.</p>
      </div>
    `,
  });
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return end(res, 200);
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const payload = await readJson(req);
    await sendTicketsEmail(payload || {});
    return sendJson(res, 200, { success: true });
  } catch (error) {
    console.error('EMAIL ERROR:', error);
    return sendJson(res, 500, { error: error.message });
  }
};

module.exports.sendTicketsEmail = sendTicketsEmail;

