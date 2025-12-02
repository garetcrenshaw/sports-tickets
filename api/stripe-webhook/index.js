import Stripe from 'stripe';
import { buffer } from 'micro';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf.toString(), sig, endpointSecret);
    console.log('✅ WEBHOOK VERIFIED:', event.type);
  } catch (err) {
    console.error('❌ WEBHOOK SIGNATURE FAILED:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    console.log('🎯 checkout.session.completed received');

    const session = event.data.object;
    console.log('Session ID:', session.id);
    console.log('Customer email:', session.customer_details?.email);

    // Import Supabase dynamically so local dev works
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Insert 3 tickets
    const { data, error } = await supabase
      .from('tickets')
      .insert([
        { session_id: session.id, purchaser_email: session.customer_details.email, type: 'admission' },
        { session_id: session.id, purchaser_email: session.customer_details.email, type: 'admission' },
        { session_id: session.id, purchaser_email: session.customer_details.email, type: 'parking' }
      ]);

    if (error) {
      console.error('❌ SUPABASE INSERT FAILED:', error);
      return res.status(500).json({ error: 'DB failed', details: error });
    }

    console.log('✅ 3 tickets inserted into Supabase');

    // Generate QR codes
    const QRCode = (await import('qrcode')).default;
    for (const ticket of data) {
      const url = `https://${process.env.NEXT_PUBLIC_URL || 'localhost:3000'}/validate?ticket=${ticket.id}`;
      const qr = await QRCode.toDataURL(url);
      console.log(`QR generated for ticket ${ticket.id}: ${url}`);
    }

    // Send email
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'tickets@sports-tickets.vercel.app',
      to: session.customer_details.email || 'test@example.com',
      subject: 'Your Tickets Are Here!',
      text: 'This would have QR codes if HTML worked in text',
      html: '<h1>Your tickets are attached!</h1><p>Check your email in a real purchase.</p>'
    });

    console.log('✅ EMAIL SENT via Resend');
  }

  res.status(200).json({ received: true });
}
