/**
 * Format an ISO date string (YYYY-MM-DD) to a short display string.
 * e.g. '2025-06-10' → '10 Jun'
 * Uses local calendar arithmetic to avoid UTC-offset issues.
 */
export function fmtDate(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

/**
 * Format a number as a currency string with € prefix and no decimals.
 * e.g. 1700.5 → '€1,701'
 */
export function fmtCurrency(val) {
  const n = Number(val) || 0
  return '€' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

/**
 * Format a cost for display inside itinerary rows (€ + rounded integer).
 * e.g. 130.6 → '€131'
 */
export function fmtCost(val) {
  return '€' + (Number(val) || 0).toFixed(0)
}

/**
 * Build a room summary label from a booking object.
 * e.g. { single_rooms: 1, double_rooms: 2 } → '1× Single · 2× Double'
 */
export function fmtRooms(booking) {
  const parts = []
  if (Number(booking.single_rooms) > 0) parts.push(`${booking.single_rooms}× Single`)
  if (Number(booking.double_rooms) > 0) parts.push(`${booking.double_rooms}× Double`)
  if (Number(booking.triple_rooms) > 0) parts.push(`${booking.triple_rooms}× Triple`)
  return parts.join(' · ')
}

/**
 * Compute the next calendar day as an ISO date string.
 * e.g. '2025-06-10' → '2025-06-11'
 * Uses local calendar arithmetic to avoid UTC-offset issues.
 */
export function nextDay(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  const next = new Date(y, m - 1, d + 1)
  return [
    next.getFullYear(),
    String(next.getMonth() + 1).padStart(2, '0'),
    String(next.getDate()).padStart(2, '0'),
  ].join('-')
}

/**
 * Compute the remaining unpaid balance for a booking.
 * e.g. { group_price_eur: 3400, paid: 1700 } → 1700
 */
export function calcRemaining(booking) {
  return (Number(booking.group_price_eur) || 0) - (Number(booking.paid) || 0)
}
