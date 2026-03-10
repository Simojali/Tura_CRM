import { CLIENT_TYPES } from './constants'

/**
 * Build N empty itinerary rows from a booking's check_in + n_dias.
 * Dates are computed using local calendar arithmetic to avoid UTC-offset issues.
 */
export function initItinerary(booking) {
  const { check_in, n_dias } = booking
  if (!check_in || !n_dias || Number(n_dias) <= 0) return []

  const [year, month, day] = check_in.split('-').map(Number)
  const rows = []

  for (let i = 0; i < Number(n_dias); i++) {
    const d = new Date(year, month - 1, day + i)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const dateStr = `${d.getFullYear()}-${mm}-${dd}`

    rows.push({
      day: i + 1,
      date: dateStr,
      city: '',
      hotel_id: null,
      hotel_name: null,
      hotel_tier: null,
      hotel_cost: 0,
      activities: [],   // [{ id, name, cost, price_unit, time }]
      transfers: [],    // [{ id, name, cost, type: 'transfer'|'transport', time, pax_label }]
    })
  }

  return rows
}

/** Read saved itinerary from localStorage. Returns null if none stored yet. */
export function loadItinerary(bookingId) {
  try {
    const stored = localStorage.getItem(`itinerary_${bookingId}`)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

/** Persist itinerary rows to localStorage. */
export function saveItinerary(bookingId, rows) {
  localStorage.setItem(`itinerary_${bookingId}`, JSON.stringify(rows))
}

/**
 * Compute the total cost for a single itinerary row.
 * hotel_cost + all activity costs + all transfer costs
 */
export function computeDayCost(row) {
  const hotel = Number(row.hotel_cost) || 0
  const activities = (row.activities || []).reduce((sum, a) => sum + (Number(a.cost) || 0), 0)
  const transfers = (row.transfers || []).reduce((sum, t) => sum + (Number(t.cost) || 0), 0)
  return hotel + activities + transfers
}

/**
 * Aggregate totals across all rows.
 * Returns { hotelTotal, activityTotal, transferTotal, grandTotal, costPerPerson }
 */
export function computeTotals(rows, booking) {
  let hotelTotal = 0
  let activityTotal = 0
  let transferTotal = 0

  rows.forEach((row) => {
    hotelTotal += Number(row.hotel_cost) || 0
    activityTotal += (row.activities || []).reduce((sum, a) => sum + (Number(a.cost) || 0), 0)
    transferTotal += (row.transfers || []).reduce((sum, t) => sum + (Number(t.cost) || 0), 0)
  })

  const grandTotal = hotelTotal + activityTotal + transferTotal
  const guests = Math.max(Number(booking.number_of_guests) || 1, 1)
  const costPerPerson = grandTotal / guests

  return { hotelTotal, activityTotal, transferTotal, grandTotal, costPerPerson }
}

/**
 * Look up the default markup % for a given client type value.
 * Falls back to 25 if not found.
 */
export function getDefaultMarkup(clientType) {
  const found = CLIENT_TYPES.find((ct) => ct.value === clientType)
  return found ? found.markup : 25
}
