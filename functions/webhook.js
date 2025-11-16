// functions/webhook.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

exports.handler = async (event) => {
  console.log('WEBHOOK EVENT TYPE:', event.headers['stripe-signature'] ? 'SIGNED' : 'UNSIGNED');

  try {
    // Verify webhook signature
    let stripeEvent;
    if (WEBHOOK_SECRET) {
      stripeEvent = stripe.webhooks.constructEvent(
        event.body,
        event.headers['stripe-signature'],
        WEBHOOK_SECRET
      );
    } else {
      // For testing without webhook secret
      stripeEvent = JSON.parse(event.body);
    }

    console.log('WEBHOOK VERIFIED:', stripeEvent.type);

    if (stripeEvent.type === 'payment_intent.succeeded') {
      const paymentIntent = stripeEvent.data.object;
      const { ticketType, eventId, email, quantity } = paymentIntent.metadata;

      console.log('PAYMENT SUCCEEDED:', {
        pi_id: paymentIntent.id,
        amount: paymentIntent.amount,
        email,
        ticketType,
        quantity: quantity || 1
      });

      // Update all tickets with this payment intent ID to 'confirmed'
      const { data: updatedTickets, error } = await supabase
        .from('tickets')
        .update({ status: 'confirmed' })
        .eq('stripe_pi_id', paymentIntent.id)
        .eq('status', 'pending')
        .select();

      if (error) {
        console.error('WEBHOOK UPDATE ERROR:', error);
        throw error;
      }

      console.log(`Updated ${updatedTickets?.length || 0} tickets to confirmed status`);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ received: true }),
    };

  } catch (err) {
    console.error('WEBHOOK ERROR:', err);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
