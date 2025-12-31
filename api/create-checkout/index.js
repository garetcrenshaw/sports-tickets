import Stripe from 'stripe';
import { initSentryServer, captureException } from '../lib/sentry.js';

// Initialize Sentry for error tracking
initSentryServer();

/**
 * STREAMLINED CHECKOUT CONFIGURATION
 * 
 * This checkout is optimized for digital tickets to reduce friction:
 * - No phone number required (digital tickets don't need it)
 * - Billing address only collected if payment method requires it
 * - Clear, concise product descriptions
 * - Auto-detects locale for better UX
 * - Supports Apple Pay, Google Pay, and Link for express checkout
 * - Marketing consent is optional (opt-in)
 * 
 * To further customize appearance (colors, logo, etc.):
 * Go to Stripe Dashboard → Settings → Branding
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  console.log('CREATE-CHECKOUT: Request received', req.method);

  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { 
      name, 
      email, 
      eventId, 
      admissionQuantity, 
      parkingQuantity,
      feeModel,
      serviceFeePerTicket,
      portalSlug 
    } = req.body || {};

    console.log('CREATE-CHECKOUT: Processing order', { 
      name, email, eventId, admissionQuantity, parkingQuantity, feeModel, serviceFeePerTicket 
    });

    // Map eventId to the correct Stripe Price IDs
    const eventPricing = {
      1: {
        admission: process.env.GA_PRICE_ID,
        parking: process.env.PARKING_PRICE_ID,
      },
      2: {
        admission: null, // Sportsplex Showdown has no admission
        parking: process.env.SPORTSPLEX_SHOWDOWN_PARKING_PRICE_ID,
      },
      3: {
        admission: process.env.SPORTSPLEX_EVENT_ADMISSION_PRICE_ID,
        parking: null, // Sportsplex Event has no parking
      },
    };

    const pricing = eventPricing[eventId] || eventPricing[1]; // Default to Event 1

    const lineItems = [];

    // Add admission tickets (only if this event has admission and quantity > 0)
    if (admissionQuantity > 0 && pricing.admission) {
      lineItems.push({
        price: pricing.admission,
        quantity: admissionQuantity,
        // Note: Product name/description comes from Stripe Price configuration
        // Update in Stripe Dashboard for better checkout display
      });
    }

    // Add parking passes (only if this event has parking and quantity > 0)
    if (parkingQuantity > 0 && pricing.parking) {
      lineItems.push({
        price: pricing.parking,
        quantity: parkingQuantity,
        // Note: Product name/description comes from Stripe Price configuration
        // Update in Stripe Dashboard for better checkout display
      });
    }

      // Add service fee for pass_through model
      const totalTickets = (admissionQuantity || 0) + (parkingQuantity || 0);
      if (feeModel === 'pass_through' && serviceFeePerTicket > 0 && totalTickets > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Service Fee',
              description: 'Processing and platform fee',
            },
            unit_amount: Math.round(serviceFeePerTicket * 100), // Convert to cents
          },
          quantity: totalTickets,
        });
      }

    // Validate that at least one item is being purchased
    if (lineItems.length === 0) {
      res.status(400).json({ error: 'At least one admission ticket or parking pass must be selected' });
      return;
    }

    // URL configuration - Use environment variable for flexibility
    const baseUrl = process.env.SITE_URL || 'https://gamedaytickets.io';
    
    // Handle portal-specific redirects
    let successUrl, cancelUrl;
    if (portalSlug) {
      // Portal redirects - back to org's branded pages
      successUrl = `${baseUrl}/org/${portalSlug}/success?session_id={CHECKOUT_SESSION_ID}`;
      cancelUrl = `${baseUrl}/org/${portalSlug}/cancel`;
    } else {
      // Regular redirects - main site
      successUrl = `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
      cancelUrl = `${baseUrl}/cancel`;
    }

    console.log('CREATE-CHECKOUT: Success URL:', successUrl);
    console.log('CREATE-CHECKOUT: Cancel URL:', cancelUrl);
    if (portalSlug) {
      console.log('CREATE-CHECKOUT: Portal mode for:', portalSlug);
    }

    const session = await stripe.checkout.sessions.create({
      // No payment_method_types = Stripe auto-enables Apple Pay, Google Pay, Link, cards, etc.
      mode: 'payment',
      customer_email: email,
      // Pre-fill customer name for faster checkout
      customer_creation: 'if_required',
      metadata: {
        buyerName: name,
        buyerEmail: email,
        eventId: eventId?.toString(),
        admissionQuantity: admissionQuantity?.toString(),
        parkingQuantity: parkingQuantity?.toString(),
        feeModel: feeModel || 'baked_in',
        serviceFeePerTicket: serviceFeePerTicket?.toString() || '0',
        totalServiceFee: (serviceFeePerTicket * totalTickets)?.toString() || '0',
        portalSlug: portalSlug || '',
      },
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      // UI customization for better UX
      locale: 'auto',
      submit_type: 'pay', // Shows "Pay" button instead of "Subscribe"
      
      // Streamline checkout - remove unnecessary fields for digital tickets
      billing_address_collection: 'auto', // Only collect if required by payment method (most cards don't need it)
      phone_number_collection: {
        enabled: false, // Don't require phone for digital tickets
      },
      
      // Allow promotion codes if needed
      allow_promotion_codes: false, // Set to true if you want to allow discount codes
      
      // Payment method configuration - Stripe will auto-enable Apple Pay/Google Pay/Link
      // No payment_method_types specified = Stripe uses smart defaults
      
      // Note: consent_collection requires agreeing to Stripe ToS in dashboard
      // If you want to enable marketing consent, visit:
      // https://dashboard.stripe.com/settings/checkout
      // Then uncomment the consent_collection block below
      // consent_collection: {
      //   promotions: 'auto', // Let users opt-in to marketing emails
      // },
      
      // Improve line item descriptions for clarity
      payment_intent_data: {
        description: `Event tickets - ${name}`,
      },
    });

    console.log('CREATE-CHECKOUT: Session created', session.id);
    console.log('CREATE-CHECKOUT: Redirect URLs configured');

    res.status(200).json({ url: session.url });

  } catch (error) {
    console.error('CREATE-CHECKOUT: Error', error);
    
    // Capture in Sentry
    captureException(error, {
      tags: {
        component: 'create-checkout',
        critical: true,
      },
      extra: {
        eventId: req.body?.eventId,
        admissionQuantity: req.body?.admissionQuantity,
        parkingQuantity: req.body?.parkingQuantity,
      },
    });
    
    res.status(500).json({ error: error.message });
  }
}
