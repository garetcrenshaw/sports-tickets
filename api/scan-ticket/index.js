import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/scan-ticket
 * Validates a ticket QR code and marks it as used
 * Tracks which staff member scanned the ticket
 * 
 * Request body: { 
 *   ticket_id: "cs_test_...-General_Admission-1",
 *   pin: "1234",
 *   event_id: "1",
 *   staff_name: "John"
 * }
 * 
 * Response: {
 *   valid: true/false,
 *   status: 'admitted' | 'already_used' | 'invalid' | 'wrong_event',
 *   ticket_type: "General Admission",
 *   buyer_name: "John Smith",
 *   scanned_at: "2025-12-17T10:30:00Z" (if already used)
 * }
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ticket_id, pin, event_id, staff_name } = req.body;

  if (!ticket_id) {
    return res.status(400).json({ 
      valid: false, 
      status: 'invalid',
      message: 'No ticket ID provided' 
    });
  }

  if (!pin || !event_id) {
    return res.status(400).json({ 
      valid: false, 
      status: 'unauthorized',
      message: 'Scanner not authenticated' 
    });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // 1. Verify the PIN is valid for this event (using events table)
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, event_name, scanner_pin')
      .eq('id', event_id)
      .eq('scanner_pin', pin)
      .eq('event_status', 'active')
      .single();

    if (eventError || !eventData) {
      return res.status(401).json({
        valid: false,
        status: 'unauthorized',
        message: 'Invalid scanner credentials'
      });
    }

    // 2. Look up the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('ticket_id', ticket_id)
      .single();

    // Log the scan attempt (for analytics)
    const logScan = async (result) => {
      try {
        await supabase.from('scan_logs').insert({
          ticket_id,
          scanner_pin: pin,
          event_id,
          staff_name: staff_name || 'Unknown',
          scan_result: result,
          device_info: req.headers['user-agent'] || 'unknown'
        });
      } catch (logErr) {
        // Don't fail if logging fails
        console.log('Scan log insert failed (table may not exist):', logErr.message);
      }
    };

    // 3. Ticket doesn't exist
    if (ticketError || !ticket) {
      await logScan('invalid');
      console.log(`❌ Invalid ticket scanned: ${ticket_id} by ${staff_name}`);
      return res.status(200).json({
        valid: false,
        status: 'invalid',
        message: 'Ticket not found'
      });
    }

    // 4. Check if ticket is for the correct event
    if (ticket.event_id !== event_id) {
      await logScan('wrong_event');
      console.log(`❌ Wrong event: ticket for ${ticket.event_id}, scanner for ${event_id} - by ${staff_name}`);
      return res.status(200).json({
        valid: false,
        status: 'wrong_event',
        message: `This ticket is for a different event`,
        ticket_event: ticket.event_id
      });
    }

    // 5. Check if already used
    if (ticket.status === 'used' || ticket.scanned_at) {
      await logScan('already_used');
      console.log(`❌ Already used: ${ticket_id} at ${ticket.scanned_at} - scanned again by ${staff_name}`);
      return res.status(200).json({
        valid: false,
        status: 'already_used',
        message: 'Ticket already scanned',
        ticket_type: ticket.ticket_type,
        buyer_name: ticket.buyer_name,
        scanned_at: ticket.scanned_at,
        scanned_by: ticket.scanned_by
      });
    }

    // 6. VALID TICKET - Mark as used!
    const now = new Date().toISOString();
    const scannedBy = staff_name || 'Unknown Staff';
    
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ 
        status: 'used',
        scanned_at: now,
        scanned_by: scannedBy
      })
      .eq('ticket_id', ticket_id);

    if (updateError) {
      console.error('Failed to update ticket:', updateError.message);
      return res.status(500).json({
        valid: false,
        status: 'error',
        message: 'Failed to process ticket'
      });
    }

    await logScan('valid');
    console.log(`✅ ADMITTED: ${ticket_id} - ${ticket.ticket_type} - ${ticket.buyer_name} - scanned by ${scannedBy}`);

    return res.status(200).json({
      valid: true,
      status: 'admitted',
      message: 'Welcome! Enjoy the event.',
      ticket_type: ticket.ticket_type,
      buyer_name: ticket.buyer_name,
      buyer_email: ticket.buyer_email,
      scanned_at: now,
      scanned_by: scannedBy
    });

  } catch (err) {
    console.error('Scan error:', err.message);
    return res.status(500).json({
      valid: false,
      status: 'error',
      message: 'Server error'
    });
  }
}
