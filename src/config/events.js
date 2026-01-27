/**
 * EVENTS CONFIGURATION - All SoCal Cup Events
 * 
 * This file defines all events that appear in the frontend.
 * Pricing is imported from pricing.js to ensure single source of truth.
 * 
 * TO ADD A NEW EVENT:
 * 1. Add the event definition below
 * 2. Add pricing in pricing.js
 * 3. Create Stripe prices and add IDs to pricing.js
 * 4. Insert event into database
 */

import { getEventPricing } from './pricing.js';

// ═══════════════════════════════════════════════════════════════════════════
// SOCAL CUP EVENTS - 2026 Season
// ═══════════════════════════════════════════════════════════════════════════

const SOCAL_CUP_EVENTS = [
  {
    id: 4,
    name: 'SoCal Cup: 12-18 Friendly',
    date: 'Friday, January 10',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    hasAdmission: true,
    hasParking: true,
  },
  {
    id: 5,
    name: 'SoCal Cup: 14/13 Tourney 2',
    date: 'Saturday, February 21',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    hasAdmission: true,
    hasParking: true,
  },
  {
    id: 6,
    name: 'SoCal Cup: 12 Tourney 2',
    date: 'Sunday, February 22',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    hasAdmission: true,
    hasParking: true,
  },
  {
    id: 7,
    name: 'SoCal Cup: 14/13 Tourney 3',
    date: 'Saturday, March 21',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    hasAdmission: true,
    hasParking: true,
  },
  {
    id: 8,
    name: 'SoCal Cup: 12 Tourney 3',
    date: 'Sunday, March 22',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    hasAdmission: true,
    hasParking: true,
  },
  {
    id: 9,
    name: 'SoCal Cup: 14/13 Tourney 4',
    date: 'Saturday, April 11',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    hasAdmission: true,
    hasParking: true,
  },
  {
    id: 10,
    name: 'SoCal Cup: 12 Tourney 4',
    date: 'Sunday, April 12',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    hasAdmission: true,
    hasParking: true,
  },
  {
    id: 11,
    name: 'SoCal Cup: 14/13 Tourney 5',
    date: 'Saturday, April 25',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    hasAdmission: true,
    hasParking: true,
  },
  {
    id: 12,
    name: 'SoCal Cup: 12 Tourney 5',
    date: 'Sunday, April 26',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    hasAdmission: true,
    hasParking: true,
  },
  {
    id: 13,
    name: 'SoCal Cup: 14/13 Championship',
    date: 'Saturday, May 16',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    hasAdmission: true,
    hasParking: true,
  },
  {
    id: 14,
    name: 'SoCal Cup: 12 Championship',
    date: 'Sunday, May 17',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    hasAdmission: true,
    hasParking: true,
  },
  {
    id: 15,
    name: 'SoCal Cup: 15-18 Friendly',
    date: 'Saturday, May 23',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    hasAdmission: true,
    hasParking: true,
  },
  {
    id: 16,
    name: 'SoCal Cup: 16/15 Tourney 3',
    date: 'Saturday, May 30',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    hasAdmission: true,
    hasParking: true,
  },
  {
    id: 17,
    name: 'SoCal Cup: 18/17 Tourney 3',
    date: 'Sunday, May 31',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    hasAdmission: true,
    hasParking: true,
  },
  {
    id: 18,
    name: 'SoCal Cup: 16/15 Spring Championship',
    date: 'Saturday, June 6',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    hasAdmission: true,
    hasParking: true,
  },
  {
    id: 19,
    name: 'SoCal Cup: 18/17 Spring Championship',
    date: 'Sunday, June 7',
    time: 'TBD',
    venue: 'AIM Sportsplex',
    city: 'Seal Beach, CA',
    category: 'Volleyball',
    hasAdmission: true,
    hasParking: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// HYDRATE EVENTS WITH PRICING
// Combines event data with pricing from centralized config
// ═══════════════════════════════════════════════════════════════════════════

function hydrateEventWithPricing(event) {
  const pricing = getEventPricing(event.id);
  return {
    ...event,
    price: pricing.admission,
    parkingPrice: pricing.parking,
    feeModel: pricing.feeModel,
  };
}

// Export hydrated events
export const EVENTS_DATA = SOCAL_CUP_EVENTS.map(hydrateEventWithPricing);

// Export raw events (without pricing) for database sync
export const EVENTS_RAW = SOCAL_CUP_EVENTS;
