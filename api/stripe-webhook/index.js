import Stripe from 'stripe';

import { buffer } from 'micro';

import QRCode from 'qrcode';



const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;



// REAL PRODUCTION DOMAIN — NEVER CHANGES

const PRODUCTION_URL = 'https://gamedaytickets.io';



export const config = { api: { bodyParser: false } };



export default async function handler(req, res) {

  console.log('WEBHOOK — gamedaytickets.io mode');



  const buf = await buffer(req);

  const sig = req.headers['stripe-signature'];



  let event;

  try {

    event = stripe.webhooks.constructEvent(buf.toString(), sig, endpointSecret);

    console.log('VERIFIED:', event.type);

  } catch (err) {

    console.error('SIGNATURE FAILED:', err.message);

    return res.status(400).send(`Error: ${err.message}`);

  }



  res.status(200).json({ received: true });



  if (event.type === 'checkout.session.completed') {

    (async () => {

      try {

        const session = event.data.object;

        const email = session.customer_details?.email || 'garetcrenshaw@gmail.com';



        // Supabase insert

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



        // QR codes with gamedaytickets.io

        const qrUrls = [];

        for (const ticket of tickets) {

          const validateUrl = `${PRODUCTION_URL}/validate?ticket=${ticket.id}&pass=${process.env.VALIDATE_PASSWORD || 'gameday2024'}`;

          const qrDataUrl = await QRCode.toDataURL(validateUrl);

          await supabase.storage

            .from('qr-codes')

            .upload(`public/${ticket.id}.png`, Buffer.from(qrDataUrl.split(',')[1], 'base64'), {

              contentType: 'image/png',

              upsert: true,

            });

          qrUrls.push(`${process.env.SUPABASE_URL.replace('.co', '.co/storage/v1/object/public')}/qr-codes/public/${ticket.id}.png`);

        }



        // EMAIL — from gamedaytickets.io (will work once domain verified)

        const { Resend } = await import('resend');

        const resend = new Resend(process.env.RESEND_API_KEY);



        await resend.emails.send({

          from: 'GameDay Tickets <tickets@gamedaytickets.io>',

          to: email,

          bcc: 'garetcrenshaw@gmail.com',

          subject: 'Your GameDay Tickets + Parking Pass',

          html: `

            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#fff;border:1px solid #ddd;">

              <h1 style="color:#1a5fb4;text-align:center;">GameDay Tickets</h1>

              <p style="text-align:center;">Your tickets are ready!</p>

              <div style="text-align:center;margin:20px 0;">

                <img src="${qrUrls[0]}" width="260" /><br><strong>Ticket 1</strong>

              </div>

              <div style="text-align:center;margin:20px 0;">

                <img src="${qrUrls[1]}" width="260" /><br><strong>Ticket 2</strong>

              </div>

              <div style="text-align:center;margin:20px 0;">

                <img src="${qrUrls[2]}" width="260" /><br><strong>Parking Pass</strong>

              </div>

              <p style="text-align:center;color:#666;">Present at entry. See you at the game! 🚀</p>

            </div>

          `,

        });



        console.log('EMAIL + QR SENT — gamedaytickets.io');

      } catch (err) {

        console.error('FULFILLMENT ERROR:', err.message);

      }

    })();

  }

}