// Debug endpoint to check pricing
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { eventId } = req.query;

  if (!eventId) {
    return res.status(400).json({ error: 'eventId required' });
  }

  try {
    // Fetch from database
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, event_name, has_admission, has_parking, stripe_admission_price_id, stripe_parking_price_id, admission_price, parking_price')
      .eq('id', eventId)
      .single();

    if (eventError) {
      return res.status(500).json({ 
        error: 'Database error',
        details: eventError.message 
      });
    }

    if (!eventData) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get actual prices from Stripe
    let admissionPrice = null;
    let parkingPrice = null;
    let admissionPriceDetails = null;
    let parkingPriceDetails = null;

    if (eventData.stripe_admission_price_id) {
      try {
        admissionPriceDetails = await stripe.prices.retrieve(eventData.stripe_admission_price_id);
        admissionPrice = admissionPriceDetails.unit_amount / 100; // Convert cents to dollars
      } catch (err) {
        console.error('Error fetching admission price:', err);
      }
    }

    if (eventData.stripe_parking_price_id) {
      try {
        parkingPriceDetails = await stripe.prices.retrieve(eventData.stripe_parking_price_id);
        parkingPrice = parkingPriceDetails.unit_amount / 100; // Convert cents to dollars
      } catch (err) {
        console.error('Error fetching parking price:', err);
      }
    }

    return res.status(200).json({
      event: {
        id: eventData.id,
        name: eventData.event_name,
        databasePrices: {
          admission: eventData.admission_price,
          parking: eventData.parking_price,
        },
        stripePriceIds: {
          admission: eventData.stripe_admission_price_id,
          parking: eventData.stripe_parking_price_id,
        },
        actualStripePrices: {
          admission: admissionPrice,
          parking: parkingPrice,
        },
        stripePriceDetails: {
          admission: admissionPriceDetails ? {
            id: admissionPriceDetails.id,
            amount: admissionPriceDetails.unit_amount,
            currency: admissionPriceDetails.currency,
            active: admissionPriceDetails.active,
            product: admissionPriceDetails.product,
          } : null,
          parking: parkingPriceDetails ? {
            id: parkingPriceDetails.id,
            amount: parkingPriceDetails.unit_amount,
            currency: parkingPriceDetails.currency,
            active: parkingPriceDetails.active,
            product: parkingPriceDetails.product,
          } : null,
        },
      },
      issues: [
        ...(eventData.admission_price !== 18.00 ? [`Admission price in database is $${eventData.admission_price}, should be $18.00`] : []),
        ...(eventData.parking_price !== 19.00 ? [`Parking price in database is $${eventData.parking_price}, should be $19.00`] : []),
        ...(admissionPrice && admissionPrice !== 18.00 ? [`Stripe admission price is $${admissionPrice}, should be $18.00`] : []),
        ...(parkingPrice && parkingPrice !== 19.00 ? [`Stripe parking price is $${parkingPrice}, should be $19.00`] : []),
        ...(!eventData.stripe_admission_price_id ? ['Missing stripe_admission_price_id in database'] : []),
        ...(!eventData.stripe_parking_price_id ? ['Missing stripe_parking_price_id in database'] : []),
      ],
    });
  } catch (error) {
    console.error('Debug pricing error:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
}

