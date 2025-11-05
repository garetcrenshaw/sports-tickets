const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const QRCode = require('qrcode');
const { Resend } = require('resend');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51SNPmgRrKoC9NoMdHtrwLaiY1dH1coDH5FAzq5nn8527rtrHHMOMvsM0CcGLZZaagYb8gjM6k7Ug8hPIA6bdGfmK00gdaF2qzn');

const supabase = createClient(
  'https://xjvzehjpgbwiiuvsnflk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqdnplaGpwZ2J3aWl1dnNuZmxrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTYwOTU1OSwiZXhwIjoyMDc3MTg1NTU5fQ.ex9XtLSqMnlKta9Vg-ZQE98klbN7W6DhKZcRZLNd6OU'
);

const resend = new Resend('re_PKr5A44H_LV76MnULHVUhiEK9R5GbwkPN');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };

  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || 'whsec_938eab87d4b6d6a06a5156e515d2fbc9d77a82db4dd5f354486dc52f5d7a0835'
    );
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'payment_intent.succeeded') {
    const intent = stripeEvent.data.object;
    const { eventId, email } = intent.metadata;

    const qrData = `ticket:${intent.id}`;
    const qrBuffer = await QRCode.toBuffer(qrData);
    const fileName = `${intent.id}.png`;

    const { error: uploadError } = await supabase.storage
      .from('qrs')
      .upload(fileName, qrBuffer, { contentType: 'image/png', upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { statusCode: 500, body: 'Upload failed' };
    }

    const { data: { publicUrl } } = supabase.storage.from('qrs').getPublicUrl(fileName);

    await supabase.from('tickets').insert({
      event_id: eventId,
      email,
      stripe_intent_id: intent.id,
      qr_code_url: publicUrl,
    });

    await resend.emails.send({
      from: 'tickets@sports-tickets.netlify.app',
      to: email,
      subject: 'Your Ticket QR Code',
      html: `<p>Thanks! Here's your ticket:</p><img src="${publicUrl}" alt="QR Code" /><p>Show this at the gate.</p>`,
    });
  }

  return { statusCode: 200, body: 'OK' };
};
