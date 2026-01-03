import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
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
 * - Simplified payment: Apple Pay (when available) and card only
 * - Removed Link, Klarna, Amazon Pay, Affirm, Cash App Pay for cleaner UX
 * - Marketing consent is optional (opt-in)
 * 
 * UPDATED: Now fetches Stripe Price IDs from events table for multi-event support
 * 
 * To further customize appearance (colors, logo, etc.):
 * Go to Stripe Dashboard → Settings → Branding
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase client for database lookups
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
      phone,
      eventId, 
      admissionQuantity, 
      parkingQuantity,
      portalSlug 
    } = req.body || {};

    console.log('CREATE-CHECKOUT: Processing order (all-in pricing)', { 
      name, email, eventId, admissionQuantity, parkingQuantity 
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // DYNAMIC EVENT PRICING - Fetches Stripe Price IDs from database
    // This allows adding unlimited events without code changes
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Fetch event pricing from Supabase
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, event_name, has_admission, has_parking, stripe_admission_price_id, stripe_parking_price_id, admission_price, parking_price')
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('CREATE-CHECKOUT: Database error fetching event:', eventError);
    }

    // Fallback to legacy hardcoded pricing for events 1-3 if database lookup fails
    // This ensures backward compatibility during migration
    let pricing;
    
    if (eventData && (eventData.stripe_admission_price_id || eventData.stripe_parking_price_id)) {
      // Use database pricing (preferred for new events)
      console.log('CREATE-CHECKOUT: Using database pricing for event:', eventData.event_name);
      pricing = {
        admission: eventData.has_admission ? eventData.stripe_admission_price_id : null,
        parking: eventData.has_parking ? eventData.stripe_parking_price_id : null,
        admissionPrice: eventData.admission_price,
        parkingPrice: eventData.parking_price,
        eventName: eventData.event_name
      };
    } else {
      // Legacy fallback for events 1-3 (can be removed once migrated)
      console.log('CREATE-CHECKOUT: Using legacy pricing for event ID:', eventId);
      const legacyPricing = {
        1: {
          admission: process.env.GA_PRICE_ID,
          parking: process.env.PARKING_PRICE_ID,
        },
        2: {
          admission: null,
          parking: process.env.SPORTSPLEX_SHOWDOWN_PARKING_PRICE_ID,
        },
        3: {
          admission: process.env.SPORTSPLEX_EVENT_ADMISSION_PRICE_ID,
          parking: null,
        },
      };
      pricing = legacyPricing[eventId] || legacyPricing[1];
    }

    const lineItems = [];

    // Add admission tickets (only if this event has admission and quantity > 0)
    if (admissionQuantity > 0 && pricing.admission) {
      lineItems.push({
        price: pricing.admission,
        quantity: admissionQuantity,
      });
    }

    // Add parking passes (only if this event has parking and quantity > 0)
    if (parkingQuantity > 0 && pricing.parking) {
      lineItems.push({
        price: pricing.parking,
        quantity: parkingQuantity,
      });
    }

    // NOTE: Service fees removed - All-in pricing model (California compliant)
    // The all-in price in Stripe already includes platform fee + processing

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
      mode: 'payment',
      customer_email: email,
      // Pre-fill customer name for faster checkout
      customer_creation: 'if_required',
      metadata: {
        buyerName: name,
        buyerEmail: email || '',
        buyerPhone: phone || '', // Phone for SMS ticket delivery
        eventId: eventId?.toString(),
        admissionQuantity: admissionQuantity?.toString(),
        parkingQuantity: parkingQuantity?.toString(),
        feeModel: 'all_in', // California compliant all-in pricing
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
      
      // SIMPLIFIED PAYMENT METHODS - Only Apple Pay and Card
      // This explicitly removes: Link, Klarna, Amazon Pay, Affirm, Cash App Pay
      // Apple Pay will appear at the top on supported devices (iOS, macOS Safari)
      // Card option will be available for all customers (including older customers)
      // NOTE: You may also need to disable unwanted methods in Stripe Dashboard:
      // Settings → Payment methods → Turn off Link, Klarna, Affirm, Cash App Pay
      payment_method_types: ['card'], // Apple Pay appears automatically with 'card' on supported devices
      
      // Payment method options
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic',
        },
      },
      
      // Marketing consent collection
      // REQUIRES: Agree to Stripe ToS at https://dashboard.stripe.com/settings/checkout (LIVE MODE ONLY)
      // TODO: Uncomment when ready to go live and enable in Stripe Dashboard
      // Once enabled, consent data will be available in webhook at session.consent
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
