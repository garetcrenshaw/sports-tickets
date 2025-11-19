// ──────────────────────────────────────────────────────────────
// STRIPE WEBHOOK — FINAL WINNING VERSION — NOVEMBER 18 2025
// ──────────────────────────────────────────────────────────────
console.log('FORCE DEBUG: THIS EXACT FILE IS REALLY LOADING RIGHT NOW');
console.log('WEBHOOK MODULE LOADED SUCCESSFULLY');
console.log('WEBHOOK LOADED — FINAL WINNING VERSION NOVEMBER 18 2025');
console.log('=======================================================');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  console.log('WEBHOOK HIT — ALIVE');

  if (event.httpMethod !== 'POST') {
    console.log('Ignoring non-POST request');
    return { statusCode: 200, body: 'Ignored' };
  }

  try {
    const sig = event.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Missing webhook secret');
    }

    const stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
    console.log('WEBHOOK VERIFIED →', stripeEvent.type);

    if (stripeEvent.type === 'checkout.session.completed') {
      console.log('checkout.session.completed — STARTING FINAL VERSION');

      const session = stripeEvent.data.object;
      const freshSession = await stripe.checkout.sessions.retrieve(session.id);

      const admissionQty = parseInt(freshSession.metadata?.admissionQuantity || '0', 10);
      const parkingQty = parseInt(freshSession.metadata?.parkingQuantity || '0', 10);
      const name = freshSession.metadata?.buyerName || session.customer_details?.name || 'Fan';
      const email = session.customer_email || freshSession.metadata?.buyerEmail || 'no-email@temp.com';

      console.log('WINNING QUANTITIES:', { admissionQty, parkingQty, name, email });

      for (let i = 0; i < admissionQty; i++) {
        await supabase.from('tickets').insert({ email, name, session_id: session.id, event_id: 1 });
      }
      console.log('TICKETS INSERTED:', admissionQty);

      for (let i = 0; i < parkingQty; i++) {
        await supabase.from('parking_passes').insert({ email, name, session_id: session.id, event_id: 1 });
      }
      console.log('PARKING INSERTED:', parkingQty);

      await resend.emails.send({
        from: 'Gameday <tickets@gameday.com>',
        to: email,
        subject: 'Your Tickets + Parking are Ready!',
        html: `<p>Hey ${name}!</p><p>You bought ${admissionQty} ticket(s) and ${parkingQty} parking pass(es).</p><p>QR codes coming in the next message!</p>`
      });
      console.log('EMAIL SENT — YOU ARE LIVE');
      console.log("HOLY FUCK WE'RE ACTUALLY LIVE");
    } else {
      console.log('Event ignored:', stripeEvent.type);
    }

    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('WEBHOOK CRASHED HARD:', err.message);
    console.error(err);
    return { statusCode: 200, body: 'Error logged' };
  }
};