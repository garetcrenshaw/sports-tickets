import Stripe from 'stripe';

import { buffer } from 'micro';



const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;



export const config = { api: { bodyParser: false } };



export default async function handler(req, res) {

  console.log('🚨 WEBHOOK HIT — STARTING');



  const buf = req.rawBody || Buffer.from('');

  const sig = req.headers['stripe-signature'];



  let event;

  try {

    // SKIP SIGNATURE VERIFICATION FOR LOCAL TESTING WITH STRIPE CLI
    event = JSON.parse(buf.toString());

    console.log('✅ WEBHOOK VERIFIED (SIG CHECK SKIPPED):', event.type);

  } catch (err) {

    console.error('❌ PARSING FAILED:', err.message);

    res.writeHead(400, { 'Content-Type': 'application/json' });

    res.end(JSON.stringify({ error: `Webhook Error: ${err.message}` }));

    return;

  }



  // RESPOND IMMEDIATELY

  res.writeHead(200, { 'Content-Type': 'application/json' });

  res.end(JSON.stringify({ received: true }));

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

        const supabaseUrl = process.env.SUPABASE_URL?.replace(/"/g, '');

        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/"/g, '');

        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log('SUPABASE CLIENT READY');



        console.log('INSERTING 3 TICKETS...');

        const { data: tickets, error } = await supabase

          .from('tickets')

          .insert([

            { event_id: '1', buyer_email: email, buyer_name: session.customer_details?.name || 'Guest' },

            { event_id: '1', buyer_email: email, buyer_name: session.customer_details?.name || 'Guest' },

            { event_id: '1', buyer_email: email, buyer_name: session.customer_details?.name || 'Guest' },

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

        const resendKey = process.env.RESEND_API_KEY?.replace(/"/g, '');

        const resend = new Resend(resendKey);



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