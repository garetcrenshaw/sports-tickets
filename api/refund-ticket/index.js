import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from '@resend/resend'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { ticket_id, stripe_session_id } = req.body

    console.log('=== REFUND REQUEST ===')
    console.log('Ticket ID:', ticket_id)
    console.log('Session ID:', stripe_session_id)

    if (!ticket_id) {
      return res.status(400).json({ error: 'Ticket ID required' })
    }

    // Fetch the ticket with event info
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('ticket_id', ticket_id)
      .single()

    if (ticketError || !ticket) {
      console.error('Ticket not found:', ticketError)
      return res.status(404).json({ error: 'Ticket not found' })
    }

    if (ticket.status === 'refunded') {
      return res.status(400).json({ error: 'Ticket already refunded' })
    }

    console.log('Ticket found:', ticket.ticket_type, ticket.buyer_email, 'event_id:', ticket.event_id)

    // Get event pricing - try both integer and string ID
    const eventIdInt = parseInt(ticket.event_id, 10)
    let event = null
    
    // Try integer lookup first
    const { data: eventInt } = await supabase
      .from('events')
      .select('admission_price, parking_price')
      .eq('id', eventIdInt)
      .single()
    
    if (eventInt) {
      event = eventInt
    } else {
      // Try string lookup
      const { data: eventStr } = await supabase
        .from('events')
        .select('admission_price, parking_price')
        .eq('id', ticket.event_id)
        .single()
      event = eventStr
    }

    console.log('Event pricing found:', event)

    // Determine ticket price (default to $15 if not found)
    const isParking = ticket.ticket_type?.toLowerCase().includes('parking')
    let ticketPrice = 15.00 // Default
    
    if (event) {
      ticketPrice = isParking ? (event.parking_price || 15) : (event.admission_price || 15)
    }
    
    console.log('Is parking:', isParking, 'Ticket price:', ticketPrice)
    
    // Convert to cents for Stripe
    const refundAmountCents = Math.round(ticketPrice * 100)
    console.log(`Refund amount: $${ticketPrice} (${refundAmountCents} cents)`)

    // Process refund via Stripe
    let stripeRefunded = false
    let refundId = null
    
    const sessionId = stripe_session_id || ticket.stripe_session_id
    
    if (sessionId) {
      try {
        // Get the checkout session to find the payment intent
        const session = await stripe.checkout.sessions.retrieve(sessionId)
        
        if (session.payment_intent) {
          console.log('Payment Intent:', session.payment_intent)
          
          // Issue PARTIAL refund for just this ticket
          const refund = await stripe.refunds.create({
            payment_intent: session.payment_intent,
            amount: refundAmountCents, // Partial refund amount in cents
            reason: 'requested_by_customer'
          })
          
          stripeRefunded = true
          refundId = refund.id
          console.log('✅ Stripe refund successful:', refund.id)
        }
      } catch (stripeError) {
        console.error('Stripe refund error:', stripeError.message)
        
        // Check if it's a known recoverable error
        const errorMsg = stripeError.message?.toLowerCase() || ''
        if (errorMsg.includes('already been refunded') ||
            errorMsg.includes('greater than') ||
            errorMsg.includes('exceeds') ||
            errorMsg.includes('charge has been refunded')) {
          // Payment already refunded or exceeds remaining amount
          // This happens when multiple tickets from same order are refunded
          console.log('Stripe refund limit reached, marking in database only')
          stripeRefunded = false // Mark as database-only refund
        } else {
          // Real error - return it
          return res.status(400).json({ 
            error: 'Stripe refund failed', 
            details: stripeError.message 
          })
        }
      }
    } else {
      console.log('No Stripe session ID found, marking as refunded in database only')
    }

    // Update ticket status in database
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ 
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        refund_amount: refundAmountCents
      })
      .eq('ticket_id', ticket_id)

    if (updateError) {
      console.error('Database update error:', updateError)
      return res.status(500).json({ error: 'Failed to update ticket status' })
    }

    console.log('✅ Ticket marked as refunded in database')

    // Send refund confirmation email
    try {
      await resend.emails.send({
        from: 'GameDay Tickets <tickets@gamedaytickets.io>',
        to: ticket.buyer_email,
        subject: 'Your Refund Has Been Processed',
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a;">
            <!-- Header -->
            <div style="background-color: #0a0a0a; background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%); padding: 40px 30px; text-align: center; border-bottom: 3px solid #f97316;">
              <h1 style="color: #FFFFFF; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                Refund Confirmed
              </h1>
              <p style="color: #f97316; margin: 12px 0 0; font-size: 16px; font-weight: 500;">
                Your refund is on its way
              </p>
            </div>
            
            <!-- Body -->
            <div style="padding: 40px 30px; background: #0a0a0a;">
              <p style="color: #e5e5e5; font-size: 16px; line-height: 1.7; margin: 0 0 24px;">
                Hi <strong style="color: #ffffff;">${ticket.buyer_name || 'there'}</strong>,
              </p>
              
              <p style="color: #a3a3a3; font-size: 16px; line-height: 1.7; margin: 0 0 30px;">
                We've processed your refund request. Here are the details:
              </p>
              
              <!-- Refund Details Card -->
              <div style="background: linear-gradient(145deg, rgba(249, 115, 22, 0.1), rgba(249, 115, 22, 0.05)); border: 1px solid rgba(249, 115, 22, 0.3); border-radius: 16px; padding: 24px; margin-bottom: 30px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                  <span style="color: #a3a3a3; font-size: 14px;">Ticket Type</span>
                  <span style="color: #ffffff; font-size: 14px; font-weight: 600;">${ticket.ticket_type || 'Event Ticket'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                  <span style="color: #a3a3a3; font-size: 14px;">Refund Amount</span>
                  <span style="color: #22c55e; font-size: 18px; font-weight: 700;">$${ticketPrice.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #a3a3a3; font-size: 14px;">Status</span>
                  <span style="color: #f97316; font-size: 14px; font-weight: 600;">Processing</span>
                </div>
              </div>
              
              <!-- Timeline -->
              <div style="background: rgba(255,255,255,0.03); border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                <p style="color: #a3a3a3; font-size: 14px; line-height: 1.6; margin: 0;">
                  <strong style="color: #f97316;">⏱️ Timing:</strong> Refunds typically appear in your account within 5-10 business days, depending on your bank.
                </p>
              </div>
              
              <p style="color: #a3a3a3; font-size: 14px; line-height: 1.6; margin: 0;">
                If you have any questions, just reply to this email and we'll help you out.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #050505; padding: 24px 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
              <p style="color: #525252; font-size: 12px; margin: 0;">
                GameDay Tickets • Refund Confirmation
              </p>
            </div>
          </div>
        `
      })
      console.log('✅ Refund confirmation email sent to', ticket.buyer_email)
    } catch (emailError) {
      console.error('⚠️ Failed to send refund email:', emailError.message)
      // Don't fail the refund if email fails
    }

    return res.status(200).json({ 
      success: true, 
      message: stripeRefunded ? 'Refund processed via Stripe' : 'Ticket marked as refunded',
      stripe_refund: stripeRefunded,
      refund_id: refundId,
      refund_amount: ticketPrice
    })

  } catch (error) {
    console.error('Refund error:', error)
    return res.status(500).json({ error: 'Failed to process refund', details: error.message })
  }
}
