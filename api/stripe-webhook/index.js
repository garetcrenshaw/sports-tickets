import Stripe from 'stripe';

import { buffer } from 'micro';

import QRCode from 'qrcode';



const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;



export const config = { api: { bodyParser: false } };



export default async function handler(req, res) {

  console.log('WEBHOOK RECEIVED');



  const buf = await buffer(req);

  const sig = req.headers['stripe-signature'];



  let event;

  try {

    event = stripe.webhooks.constructEvent(buf.toString(), sig, endpointSecret);

    console.log('WEBHOOK VERIFIED:', event.type);

  } catch (err) {

    console.error('SIGNATURE FAILED:', err.message);

    return res.status(400).send(`Webhook Error: ${err.message}`);

  }



  // Respond immediately

  res.status(200).json({ received: true });



  if (event.type === 'checkout.session.completed') {

    (async () => {

      try {

        const session = event.data.object;

        const email = session.customer_details?.email || 'garetcrenshaw@gmail.com';



        // 1. Supabase

        const { createClient } = await import('@supabase/supabase-js');

        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);



        const { data: tickets } = await supabase

          .from('tickets')

          .insert([

            { session_id: session.id, buyer_email: email, buyer_name: session.customer_details?.name || 'Guest', type: 'admission' },

            { session_id: session.id, buyer_email: email, buyer_name: session.customer_details?.name || 'Guest', type: 'admission' },

            { session_id: session.id, buyer_email: email, buyer_name: session.customer_details?.name || 'Guest', type: 'parking' },

          ])

          .select();



        console.log('3 TICKETS INSERTED');



        // 2. Generate QR codes

        const qrUrls = [];

        for (const ticket of tickets) {

          const validateUrl = `https://sports-tickets.vercel.app/validate?ticket=${ticket.id}&pass=${process.env.VALIDATE_PASSWORD || 'gameday2024'}`;

          const qrDataUrl = await QRCode.toDataURL(validateUrl);

          const { error } = await supabase.storage

            .from('qr-codes')

            .upload(`public/${ticket.id}.png`, Buffer.from(qrDataUrl.split(',')[1], 'base64'), {

              contentType: 'image/png',

              upsert: true,

            });



          const publicUrl = `${process.env.SUPABASE_URL.replace('.co', '.co/storage/v1/object/public')}/qr-codes/public/${ticket.id}.png`;

          qrUrls.push(publicUrl);

        }



        // 3. Send beautiful email to garetcrenshaw@gmail.com

        const { Resend } = await import('resend');

        const resend = new Resend(process.env.RESEND_API_KEY);



        await resend.emails.send({

          from: 'GameDay Tickets <tickets@sports-tickets.vercel.app>',

          to: email,

          bcc: 'garetcrenshaw@gmail.com', // ← ALWAYS GET A COPY

          subject: 'Your GameDay Tickets + Parking Pass',

          html: `

            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #ddd;">

              <h1 style="color:#1a5fb4;">GameDay Tickets</h1>

              <p>Here are your tickets for the big game!</p>

              <div style="text-align:center;margin:30px 0;">

                <img src="${qrUrls[0]}" width="280" style="margin:10px;" /><br/>

                <strong>Admission Ticket #1</strong>

              </div>

              <div style="text-align:center;margin:30px 0;">

                <img src="${qrUrls[1]}" width="280" style="margin:10px;" /><br/>

                <strong>Admission Ticket #2</strong>

              </div>

              <div style="text-align:center;margin:30px 0;">

                <img src="${qrUrls[2]}" width="280" style="margin:10px;" /><br/>

                <strong>Parking Pass</strong>

              </div>

              <p style="text-align:center;color:#666;">See you at the game! 🚀</p>

            </div>

          `,

        });



        console.log('BEAUTIFUL EMAIL + QR CODES SENT TO', email);

      } catch (err) {

        console.error('FULFILLMENT ERROR:', err);

      }

    })();

  }

}