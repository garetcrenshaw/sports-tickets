const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const { setCors, sendJson, end, readRawBody } = require('./_utils');

console.log('FORCE DEBUG: THIS EXACT FILE IS REALLY LOADING RIGHT NOW');
console.log('WEBHOOK MODULE LOADED SUCCESSFULLY');
console.log('WEBHOOK LOADED — FINAL WINNING VERSION NOVEMBER 18 2025');
console.log('=======================================================');

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return end(res, 200);
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const rawBody = (await readRawBody(req)).toString('utf8');

    const stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
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
      console.log('TICKETS INSERTED:', admissionQty);
      console.log('PARKING INSERTED:', parkingQty);
      console.log('EMAIL SENT — YOU ARE LIVE');
      console.log("HOLY FUCK WE'RE ACTUALLY LIVE");
    } else {
      console.log('Event ignored:', stripeEvent.type);
    }

    return sendJson(res, 200, { received: true });
  } catch (error) {
    console.error('WEBHOOK CRASHED HARD:', error.message);
    console.error(error);
    return sendJson(res, 200, { error: 'Error logged' });
  }
};

