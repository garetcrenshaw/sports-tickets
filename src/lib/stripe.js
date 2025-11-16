const Stripe = require('stripe');

let stripeClient;

function requireEnv(key) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return process.env[key];
}

function getStripeClient() {
  if (!stripeClient) {
    const secret = requireEnv('STRIPE_SECRET_KEY');
    stripeClient = new Stripe(secret);
  }
  return stripeClient;
}

module.exports = {
  getStripeClient,
  requireEnv,
};
