const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const QRCode = require('qrcode');
const { Resend } = require('resend');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };

  // SKIP SIGNATURE FOR MVP — ADD LATER
  const payload = JSON.parse(event.body);
  if (payload.type !== 'payment_intent.succeeded') {
    return { statusCode: 200, body: 'Ignored' };
  }

  const intent = payload.data.object;
  const { email = 'test@example.com', eventId = 'test' } = intent.metadata || {};

  const qrData = `ticket:${intent.id || 'test'}`;
  const qrBuffer = await QRCode.toBuffer(qrData);
  const fileName = `${intent.id || 'test'}.png`;

  const { error: uploadError } = await supabase.storage
    .from('qrs')
    .upload(fileName, qrBuffer, { contentType: 'image/png', upsert: true });

  if (uploadError) {
    console.error('UPLOAD ERROR:', uploadError);
    return { statusCode: 500, body: 'Upload failed' };
  }

  const { data: { publicUrl } } = supabase.storage.from('qrs').getPublicUrl(fileName);

  const { error: dbError } = await supabase.from('tickets').insert({
    event_id: eventId,
    email,
    stripe_intent_id: intent.id || 'test',
    qr_code_url: publicUrl,
  });

  if (dbError) {
    console.error('DB ERROR:', dbError);
    return { statusCode: 500, body: 'DB failed' };
  }

  await resend.emails.send({
    from: 'tickets@sports-tickets.netlify.app',
    to: email,
    subject: 'Your Ticket QR Code',
    html: `<p>Thanks! Here's your ticket:</p><img src="${publicUrl}" alt="QR Code" /><p>Show this at the gate.</p>`,
  });

  return { statusCode: 200, body: 'OK' };
};
