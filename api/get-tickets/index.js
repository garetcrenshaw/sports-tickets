import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/get-tickets?order=SESSION_ID
 * 
 * Fetches all tickets for a given Stripe session ID
 * Used by the ticket viewing page (accessed via SMS link)
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { order } = req.query;

  if (!order) {
    return res.status(400).json({ error: 'Order ID required' });
  }

  console.log('GET-TICKETS: Fetching tickets for order:', order);

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Fetch all tickets for this Stripe session
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('*')
      .eq('stripe_session_id', order)
      .order('ticket_type', { ascending: true });

    if (ticketsError) {
      console.error('GET-TICKETS: Database error:', ticketsError);
      return res.status(500).json({ error: 'Failed to fetch tickets' });
    }

    if (!tickets || tickets.length === 0) {
      console.log('GET-TICKETS: No tickets found for order:', order);
      return res.status(404).json({ error: 'No tickets found' });
    }

    console.log(`GET-TICKETS: Found ${tickets.length} tickets`);

    // Get event info for branding
    const eventId = tickets[0].event_id;
    let eventInfo = null;

    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, event_name, event_date, venue_name, venue_city')
      .eq('id', eventId)
      .single();

    if (eventData) {
      // Format event info with organization branding
      // In the future, join with organizations table
      eventInfo = {
        name: eventData.event_name,
        date: eventData.event_date,
        venue: eventData.venue_name,
        city: eventData.venue_city,
        // Default branding (can be customized per org)
        primaryColor: '#32cd32',
        secondaryColor: '#228b22',
        logo: null
      };

      // SoCal Cup events get special branding
      if (eventData.event_name?.includes('SoCal Cup')) {
        eventInfo.logo = '/socal-cup-logo.png';
        eventInfo.primaryColor = '#32cd32';
        eventInfo.secondaryColor = '#228b22';
      }
    }

    return res.status(200).json({
      tickets,
      event: eventInfo
    });

  } catch (error) {
    console.error('GET-TICKETS: Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

