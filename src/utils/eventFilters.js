// Event filtering utilities
// Filters events based on date to hide past events

/**
 * Parse event date string (e.g., "Saturday, December 28") to Date object
 * @param {string} dateStr - Date string from event data
 * @param {string} timeStr - Time string (e.g., "7:30 PM")
 * @returns {Date|null} - Parsed date or null if invalid
 */
export function parseEventDate(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null
  
  try {
    // Extract day name and date parts
    const parts = dateStr.split(', ')
    if (parts.length < 2) return null
    
    const monthDay = parts[1] // "December 28"
    const monthDayParts = monthDay.split(' ')
    if (monthDayParts.length < 2) return null
    
    const monthName = monthDayParts[0] // "December"
    const day = parseInt(monthDayParts[1]) // 28
    
    // Get current year (or next year if month has passed)
    const now = new Date()
    const currentYear = now.getFullYear()
    const monthIndex = new Date(`${monthName} 1, ${currentYear}`).getMonth()
    
    // If month has passed this year, use next year
    let year = currentYear
    if (monthIndex < now.getMonth() || (monthIndex === now.getMonth() && day < now.getDate())) {
      year = currentYear + 1
    }
    
    // Parse time
    const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i)
    if (!timeMatch) return null
    
    let hours = parseInt(timeMatch[1])
    const minutes = parseInt(timeMatch[2])
    const ampm = timeMatch[3].toUpperCase()
    
    if (ampm === 'PM' && hours !== 12) hours += 12
    if (ampm === 'AM' && hours === 12) hours = 0
    
    return new Date(year, monthIndex, day, hours, minutes)
  } catch (error) {
    console.error('Error parsing event date:', error)
    return null
  }
}

/**
 * Check if event date has passed
 * @param {Object} event - Event object with date and time
 * @returns {boolean} - True if event is in the past
 */
export function isEventPast(event) {
  if (!event.date || !event.time) return false
  
  const eventDate = parseEventDate(event.date, event.time)
  if (!eventDate) return false
  
  const now = new Date()
  return eventDate < now
}

/**
 * Filter out past events
 * @param {Array} events - Array of event objects
 * @returns {Array} - Filtered array with only future events
 */
export function filterPastEvents(events) {
  return events.filter(event => !isEventPast(event))
}

