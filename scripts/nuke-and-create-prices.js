import Stripe from 'stripe';
import 'dotenv/config';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function nukeAndRebuild() {
  console.log("🎯 CREATING PERFECT $15 PRICES FOR PRODUCTION\n");
  console.log("Note: Keeping existing products/prices intact - creating fresh ones\n");

  // Create $15 Ticket
  const ticketPrice = await stripe.prices.create({
    unit_amount: 1500,
    currency: 'usd',
    product_data: { name: 'General Admission Ticket' },
  });

  // Create $15 Parking
  const parkingPrice = await stripe.prices.create({
    unit_amount: 1500,
    currency: 'usd',
    product_data: { name: 'Parking Pass' },
  });

  console.log("🎟️  NEW $15 PRICES CREATED\n");
  console.log("COPY-PASTE THESE INTO VERCEL ENVIRONMENT VARIABLES:\n");

  console.log(`GA_PRICE_ID=${ticketPrice.id}`);
  console.log(`PARKING_PRICE_ID=${parkingPrice.id}`);

  console.log("\nThen run: npm run deploy");
  console.log("\nWe are live in 60 seconds. 🔒🚀");
}

nukeAndRebuild().catch(console.error);
