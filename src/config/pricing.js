/**
 * PRICING CONFIGURATION - Single Source of Truth
 * 
 * All pricing information for events is centralized here.
 * This ensures consistency between frontend display, database, and Stripe.
 * 
 * PRICING MODELS:
 * - all_in: Price includes everything (California compliant). No separate fees shown.
 * - fees_separate: Base price + fees shown separately (traditional ticketing)
 * 
 * TO UPDATE PRICES:
 * 1. Update the price here
 * 2. Create/update the corresponding Stripe Price in dashboard
 * 3. Update the stripe_price_id here
 * 4. Run the SQL update to sync database
 */

// ═══════════════════════════════════════════════════════════════════════════
// PRICING TIERS - Define your pricing structures here
// ═══════════════════════════════════════════════════════════════════════════

export const PRICING_TIERS = {
  // SoCal Cup - All-in pricing (California compliant)
  SOCAL_CUP: {
    admission: 18.00,
    parking: 19.00,
    feeModel: 'all_in',
    // Stripe Price IDs - MUST match prices in Stripe Dashboard
    stripePriceIds: {
      admission: 'price_1Slck6RzFa5vaG1D1Lm1Ro40', // $18.00 all-in
      parking: 'price_1SldoCRzFa5vaG1DxSlTNgaS',   // $19.00 all-in
    }
  },
  
  // Default pricing for new events
  DEFAULT: {
    admission: 15.00,
    parking: 15.00,
    feeModel: 'all_in',
    stripePriceIds: {
      admission: null,
      parking: null,
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// EVENT PRICING MAP - Maps event IDs to their pricing tier
// ═══════════════════════════════════════════════════════════════════════════

export const EVENT_PRICING = {
  // SoCal Cup Events (IDs 4-19)
  4: PRICING_TIERS.SOCAL_CUP,
  5: PRICING_TIERS.SOCAL_CUP,
  6: PRICING_TIERS.SOCAL_CUP,
  7: PRICING_TIERS.SOCAL_CUP,
  8: PRICING_TIERS.SOCAL_CUP,
  9: PRICING_TIERS.SOCAL_CUP,
  10: PRICING_TIERS.SOCAL_CUP,
  11: PRICING_TIERS.SOCAL_CUP,
  12: PRICING_TIERS.SOCAL_CUP,
  13: PRICING_TIERS.SOCAL_CUP,
  14: PRICING_TIERS.SOCAL_CUP,
  15: PRICING_TIERS.SOCAL_CUP,
  16: PRICING_TIERS.SOCAL_CUP,
  17: PRICING_TIERS.SOCAL_CUP,
  18: PRICING_TIERS.SOCAL_CUP,
  19: PRICING_TIERS.SOCAL_CUP,
};

/**
 * Get pricing for an event
 * @param {number} eventId - The event ID
 * @returns {Object} Pricing configuration for the event
 */
export function getEventPricing(eventId) {
  return EVENT_PRICING[eventId] || PRICING_TIERS.DEFAULT;
}

/**
 * Get Stripe Price IDs for an event
 * @param {number} eventId - The event ID
 * @returns {Object} Object with admission and parking Stripe Price IDs
 */
export function getStripePriceIds(eventId) {
  const pricing = getEventPricing(eventId);
  return pricing.stripePriceIds;
}

// ═══════════════════════════════════════════════════════════════════════════
// SQL GENERATION - Generate SQL to sync database with this config
// ═══════════════════════════════════════════════════════════════════════════

export function generatePricingUpdateSQL() {
  let sql = '-- Auto-generated pricing update SQL\n';
  sql += '-- Generated from src/config/pricing.js\n\n';
  
  for (const [eventId, pricing] of Object.entries(EVENT_PRICING)) {
    sql += `UPDATE events SET\n`;
    sql += `  admission_price = ${pricing.admission.toFixed(2)},\n`;
    sql += `  parking_price = ${pricing.parking.toFixed(2)},\n`;
    sql += `  stripe_admission_price_id = ${pricing.stripePriceIds.admission ? `'${pricing.stripePriceIds.admission}'` : 'NULL'},\n`;
    sql += `  stripe_parking_price_id = ${pricing.stripePriceIds.parking ? `'${pricing.stripePriceIds.parking}'` : 'NULL'},\n`;
    sql += `  updated_at = NOW()\n`;
    sql += `WHERE id = ${eventId};\n\n`;
  }
  
  return sql;
}
