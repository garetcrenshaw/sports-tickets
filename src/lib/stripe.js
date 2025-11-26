import Stripe from 'stripe';

let stripeClient;

export function requireEnv(key) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return process.env[key];
}

export function getStripeClient() {
  if (!stripeClient) {
    const secret = requireEnv('STRIPE_SECRET_KEY');
    stripeClient = new Stripe(secret);
  }
  return stripeClient;
}
