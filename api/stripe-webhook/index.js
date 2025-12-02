import Stripe from 'stripe';

import { buffer } from 'micro';



const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;



export const config = { api: { bodyParser: false } };



export default async function handler(req, res) {

  console.log('🚨 WEBHOOK HIT — STARTING');



  const buf = await buffer(req);

  const sig = req.headers['stripe-signature'];



  let event;

  try {

    event = stripe.webhooks.constructEvent(buf.toString(), sig, endpointSecret);

    console.log('✅ WEBHOOK VERIFIED:', event.type);

  } catch (err) {

    console.error('❌ SIGNATURE FAILED:', err.message);

    return res.status(400).send(`Webhook Error: ${err.message}`);

  }



  // RESPOND IMMEDIATELY

  res.status(200).json({ received: true });

  console.log('✅ 200 SENT — FULFILLMENT RUNNING');



  if (event.type === 'checkout.session.completed') {

    (async () => {

      try {

        const session = event.data.object;

        const email = session.customer_details?.email || 'garetcrenshaw@gmail.com';

        console.log('CUSTOMER EMAIL:', email);



        // SUPABASE

        console.log('CREATING SUPABASE CLIENT...');

        const { createClient } = await import('@supabase/supabase-js');

        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        console.log('SUPABASE CLIENT READY');



        console.log('INSERTING 3 TICKETS...');

        const { data: tickets, error } = await supabase

          .from('tickets')

          .insert([

            { session_id: session.id, buyer_email: email, type: 'admission' },

            { session_id: session.id, buyer_email: email, type: 'admission' },

            { session_id: session.id, buyer_email: email, type: 'parking' },

          ])

          .select();



        if (error) throw error;

        console.log('✅ 3 TICKETS INSERTED:', tickets.map(t => t.id));



        // QR CODES

        console.log('GENERATING QR CODES...');

        const QRCode = (await import('qrcode')).default;

        for (const ticket of tickets) {

          const url = `http://localhost:3000/validate?ticket=${ticket.id}&pass=gameday2024`;

          const dataUrl = await QRCode.toDataURL(url);

          console.log('QR READY FOR TICKET:', ticket.id);

        }



        // RESEND EMAIL

        console.log('SENDING EMAIL...');

        const { Resend } = await import('resend');

        const resend = new Resend(process.env.RESEND_API_KEY);



        const result = await resend.emails.send({

          from: 'test@garetcrenshaw.com',

          to: email,

          subject: 'YOUR TICKETS ARE READY',

          text: 'This email proves the webhook works. QR codes above.',

        });



        console.log('✅ EMAIL SENT — RESEND ID:', result.id || 'NO ID (still sent)');

      } catch (err) {

        console.error('❌ FULFILLMENT FAILED:', err.message);

        console.error('STACK:', err.stack);

      }

    })();

  }

}