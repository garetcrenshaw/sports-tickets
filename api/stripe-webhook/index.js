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

    console.error('❌ WEBHOOK SIGNATURE FAILED:', err.message);

    return res.status(400).send(`Webhook Error: ${err.message}`);

  }



  // Respond immediately

  res.status(200).json({ received: true });

  console.log('✅ 200 sent — now running background');



  if (event.type === 'checkout.session.completed') {

    (async () => {

      try {

        const session = event.data.object;

        console.log('🎯 FULFILLMENT START — session:', session.id);

        console.log('Email:', session.customer_details?.email || 'MISSING');



        // 1. SUPABASE

        console.log('Creating Supabase client...');

        const { createClient } = await import('@supabase/supabase-js');

        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        console.log('Supabase client created');



        console.log('Inserting tickets...');

        const { data, error } = await supabase

          .from('tickets')

          .insert([

            { session_id: session.id, email: session.customer_details?.email || 'test@example.com', type: 'admission' },

            { session_id: session.id, email: session.customer_details?.email || 'test@example.com', type: 'admission' },

            { session_id: session.id, email: session.customer_details?.email || 'test@example.com', type: 'parking' },

          ])

          .select();



        if (error) throw error;

        console.log('✅ 3 TICKETS INSERTED:', data);



        // 2. RESEND EMAIL

        console.log('Sending email via Resend...');

        const { Resend } = await import('resend');

        const resend = new Resend(process.env.RESEND_API_KEY);



        const emailResult = await resend.emails.send({

          from: 'tickets@sports-tickets.vercel.app',

          to: session.customer_details?.email || 'garetcrenshaw@gmail.com',

          subject: 'TEST EMAIL — Webhook is working!',

          text: 'If you get this, the webhook is 100% working.',

          html: '<h1>WEBHOOK WORKS!</h1><p>Your tickets are being processed.</p>',

        });



        console.log('✅ EMAIL SENT — Resend ID:', emailResult.id);

      } catch (err) {

        console.error('❌ BACKGROUND FULFILLMENT FAILED:', err);

        console.error('Stack:', err.stack);

      }

    })();

  }

}
