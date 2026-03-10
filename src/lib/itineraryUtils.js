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
      hotel_cost: 0,
      upsells: [],           // [{ id, name, cost, price_unit }]
      transfer_id: null,
      transfer_name: null,
      transfer_cost: 0,
      transport_id: null,
      transport_name: null,
      transport_cost: 0,
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
 * hotel_cost + all upsell costs + transfer_cost + transport_cost
 */
export function computeDayCost(row) {
  const hotel = Number(row.hotel_cost) || 0
  const upsells = (row.upsells || []).reduce((sum, u) => sum + (Number(u.cost) || 0), 0)
  const transfer = Number(row.transfer_cost) || 0
  const transport = Number(row.transport_cost) || 0
  return hotel + upsells + transfer + transport
}

/**
 * Aggregate totals across all rows.
 * Returns { hotelTotal, upsellTotal, transferTotal, transportTotal, grandTotal, costPerPerson }
 */
export function computeTotals(rows, booking) {
  let hotelTotal = 0
  let upsellTotal = 0
  let transferTotal = 0
  let transportTotal = 0

  rows.forEach((row) => {
    hotelTotal += Number(row.hotel_cost) || 0
    upsellTotal += (row.upsells || []).reduce((sum, u) => sum + (Number(u.cost) || 0), 0)
    transferTotal += Number(row.transfer_cost) || 0
    transportTotal += Number(row.transport_cost) || 0
  })

  const grandTotal = hotelTotal + upsellTotal + transferTotal + transportTotal
  const guests = Math.max(Number(booking.number_of_guests) || 1, 1)
  const costPerPerson = grandTotal / guests

  return { hotelTotal, upsellTotal, transferTotal, transportTotal, grandTotal, costPerPerson }
}

/**
 * Look up the default markup % for a given client type value.
 * Falls back to 25 if not found.
 */
export function getDefaultMarkup(clientType) {
  const found = CLIENT_TYPES.find((ct) => ct.value === clientType)
  return found ? found.markup : 25
}
