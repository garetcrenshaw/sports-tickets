import Stripe from 'stripe';



const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const endpointSecret = 'whsec_938eab87d4b6d6a06a5156e515d2fbc9d77a82db4dd5f354486dc52f5d7a0835'; // From Stripe CLI



export const config = { api: { bodyParser: false } };



export default async function handler(req, res) {
  console.log('WEBHOOK HANDLER START');

  // Send response immediately (synchronously)
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({ received: true }));
  console.log('SYNC RESPONSE SENT');

  // Do async processing in background
  processWebhookAsync(req).catch(err => {
    console.error('ASYNC PROCESSING ERROR:', err.message);
    console.error('STACK:', err.stack);
  });
}

async function processWebhookAsync(req) {

  console.log('Headers received:', Object.keys(req.headers));

  console.log('Stripe signature header:', req.headers['stripe-signature']);



  let buf;

  try {

    console.log('Getting raw body from dev-server...');

    // dev-server.cjs already buffers the body and puts it in req.rawBody
    if (req.rawBody && Buffer.isBuffer(req.rawBody)) {

      buf = req.rawBody;

      console.log('Raw body available, length:', buf.length);

    } else {

      console.error('Raw body not available or not a buffer');

      return;

    }

  } catch (err) {

    console.error('BUFFER ACCESS FAILED:', err.message);

    console.error('Buffer error stack:', err.stack);

    return;

  }



  const sig = req.headers['stripe-signature'];



  let event;

  try {

    console.log('Attempting signature verification...');

    console.log('Endpoint secret starts with:', endpointSecret.substring(0, 10) + '...');

    console.log('Signature header:', sig);

    console.log('Buffer length:', buf.length);

    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);

    console.log('VERIFIED SUCCESSFULLY:', event.type);

  } catch (err) {

    console.error('SIGNATURE FAILED:', err.message);

    console.error('This usually means the raw body was modified or endpoint secret is wrong');

    return;

  }



  console.log('EVENT VERIFIED SUCCESSFULLY');



  if (event.type === 'checkout.session.completed') {

    (async () => {

      try {

        const session = event.data.object;

        const email = session.customer_details?.email || 'garetcrenshaw@gmail.com';



        // Skip Supabase for now - focus on email delivery
        console.log('SKIPPING SUPABASE - FOCUSING ON EMAIL DELIVERY');

        // Simulate ticket creation
        console.log('SIMULATING 3 TICKETS CREATION');



        const { Resend } = await import('resend');

        const resendKey = process.env.RESEND_API_KEY || 'test-key';
        const resend = new Resend(resendKey);



        await resend.emails.send({

          from: 'Sports Tickets <delivered@resend.dev>',

          to: 'garetcrenshaw@gmail.com',

          subject: 'WEBHOOK WORKS — TICKETS READY',

          html: '<h1>Success!</h1><p>3 tickets created. If you get this, fulfillment works 100%.</p>',

        });



        console.log('EMAIL SENT TO garetcrenshaw@gmail.com');

      } catch (err) {

        console.error('FAILED:', err.message);

        console.error('STACK:', err.stack);

      }

    })();

  }
}