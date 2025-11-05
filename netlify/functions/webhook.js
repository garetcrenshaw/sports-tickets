const { createClient } = require('@supabase/supabase-js');
const QRCode = require('qrcode');
const { Resend } = require('resend');

const supabase = createClient(
  'https://xjvzehjpgbwiiuvsnflk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqdnplaGpwZ2J3aWl1dnNuZmxrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTYwOTU1OSwiZXhwIjoyMDc3MTg1NTU5fQ.ex9XtLSqMnlKta9Vg-ZQE98klbN7W6DhKZcRZLNd6OU'
);

const resend = new Resend('re_PKr5A44H_LV76MnULHVUhiEK9R5GbwkPN');

// YOUR REAL EVENT ID
const REAL_EVENT_ID = '651486fd-2912-4572-9595-034c4d666d77';

exports.handler = async (event) => {
  console.log('WEBHOOK HIT:', event.body);

  const payload = JSON.parse(event.body);
  if (payload.type !== 'payment_intent.succeeded') {
    return { statusCode: 200, body: 'Ignored' };
  }

  const intent = payload.data.object;
  const email = intent.metadata?.email || 'test@example.com';
  const eventId = intent.metadata?.eventId || REAL_EVENT_ID;

  // Generate QR
  const qrBuffer = await QRCode.toBuffer(`ticket:${intent.id}`);
  const fileName = `${intent.id}.png`;

  // Upload
  const { error: uploadError } = await supabase.storage
    .from('qrs')
    .upload(fileName, qrBuffer, { contentType: 'image/png', upsert: true });

  if (uploadError) {
    console.error('UPLOAD ERROR:', uploadError);
    return { statusCode: 500, body: 'Upload failed' };
  }

  const { data: { publicUrl } } = supabase.storage.from('qrs').getPublicUrl(fileName);

  // Save to DB
  const { error: dberror } = await supabase.from('tickets').insert({
    event_id: eventId,
    email,
    stripe_intent_id: intent.id,
    qr_code_url: publicUrl,
    status: 'purchased'
  });

  if (dberror) {
    console.error('DB ERROR:', dberror.message);
    return { statusCode: 500, body: `DB failed: ${dberror.message}` };
  }

  // Send email
  await resend.emails.send({
    from: 'tickets@sports-tickets.netlify.app',
    to: email,
    subject: 'Your Ticket QR Code',
    html: `<p>Thanks! Here's your ticket:</p><img src="${publicUrl}" alt="QR Code" /><p>Show this at the gate.</p>`,
  });

  return { statusCode: 200, body: 'OK' };
};
