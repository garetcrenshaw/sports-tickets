const { createClient } = require('@supabase/supabase-js');
const QRCode = require('qrcode');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { email, name, ticketTypeId, eventId } = body;

  if (!email || !name || !ticketTypeId || !eventId) {
    return { statusCode: 400, body: 'Missing name, email, ticketTypeId, or eventId' };
  }

  try {
    // Fetch ticket type + event
    const { data: type, error: typeError } = await supabase
      .from('ticket_types')
      .select('price, type_name, event_id')
      .eq('id', ticketTypeId)
      .single();

    if (typeError || !type) {
      return { statusCode: 404, body: 'Ticket type not found' };
  }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('title, tickets_sold, max_tickets')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return { statusCode: 404, body: 'Event not found' };
    }

    if (event.tickets_sold >= event.max_tickets) {
      return { statusCode: 400, body: 'Event sold out' };
    }

    // Generate IDs
    const ticketNumber = String(event.tickets_sold + 1).padStart(3, '0');
    const ticketId = `${event.title.split(' ')[0].toUpperCase()}-${ticketNumber}`;
    const confirmation = `CONF-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Generate QR
    const qrData = `${eventId}-${ticketId}`;
    const qrBuffer = await QRCode.toBuffer(qrData, { width: 300 });

    // Upload to Supabase
    const fileName = `${ticketId}.png`;
    const { error: uploadError } = await supabase.storage
      .from('qrs')
      .upload(fileName, qrBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('qrs')
      .getPublicUrl(fileName);

    // Insert ticket
    const { error: insertError } = await supabase
      .from('tickets')
      .insert({
        ticket_id: ticketId,
        email,
        name,
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        qr_url: publicUrl,
        price_paid: type.price,
        confirmation_number: confirmation,
        status: 'issued'
      });

    if (insertError) throw insertError;

    // Update tickets_sold
    await supabase
      .from('events')
      .update({ tickets_sold: event.tickets_sold + 1 })
      .eq('id', eventId);

    // Email with embedded QR
    const qrBase64 = qrBuffer.toString('base64');
    const qrDataUrl = `data:image/png;base64,${qrBase64}`;

    const emailHtml = `
      <div style="font-family: Arial; text-align: center; padding: 20px; max-width: 400px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
        <h2>NS Game Day Ticket</h2>
        <p><strong>Event:</strong> ${event.title}</p>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Ticket Type:</strong> ${type.type_name}</p>
        <p><strong>Price:</strong> $${type.price}</p>
        <p><strong>Confirmation:</strong> ${confirmation}</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <img src="${qrDataUrl}" width="250" height="250" style="border: 2px solid #000; margin: 20px;" />
        <p><strong>Scan to enter:</strong> ${eventId}-${ticketId}</p>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'NS Tickets <tickets@nsgamedaytickets.com>',
        to: email,
        subject: `Your Ticket: ${ticketId}`,
        html: emailHtml
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.log('Email failed:', err);
      return { statusCode: 200, body: JSON.stringify({ success: true, qrUrl: publicUrl, emailFailed: true }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, qrUrl: publicUrl })
    };

  } catch (error) {
    console.error('Error:', error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
