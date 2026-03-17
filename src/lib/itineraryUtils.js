import { CLIENT_TYPES } from './constants'
import { supabase, isSupabaseConfigured } from './supabase'

/**
 * Compute the number of days for a booking (inclusive: check-in day + check-out day).
 * e.g. Jun 10 → Jun 17 = 8 days, 7 nights.
 * Falls back to stored number_of_days if dates are not available.
 */
export function computeDays(booking) {
  const { check_in, check_out, number_of_days } = booking
  if (check_in && check_out) {
    const diff = Math.round((new Date(check_out) - new Date(check_in)) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff + 1 : 1
  }
  return Number(number_of_days) || 0
}

/**
 * Build N empty itinerary rows from a booking's check_in + check_out (or n_dias).
 * Dates are computed using local calendar arithmetic to avoid UTC-offset issues.
 */
export function initItinerary(booking) {
  const { check_in } = booking
  if (!check_in) return []

  const numDays = computeDays(booking)
  if (numDays <= 0) return []

  const [year, month, day] = check_in.split('-').map(Number)
  const rows = []

  for (let i = 0; i < numDays; i++) {
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

/**
 * Reconcile a saved itinerary against the expected rows from the booking.
 * - If saved has fewer rows than expected: append the missing empty rows.
 * - If saved has more rows than expected: trim the extras.
 * - If counts match: return saved as-is.
 */
export function reconcileItinerary(saved, booking) {
  const expected = initItinerary(booking)
  if (!saved || saved.length === expected.length) return saved || expected
  if (saved.length < expected.length) {
    return [...saved, ...expected.slice(saved.length)]
  }
  return saved.slice(0, expected.length)
}

/**
 * Normalize raw stored data into { rows, contracts }.
 * Handles legacy format where data was stored as a plain array.
 */
function normalizeStored(raw) {
  if (!raw) return null
  if (Array.isArray(raw)) return { rows: raw, contracts: [] }
  return { rows: raw.rows ?? [], contracts: raw.contracts ?? [] }
}

/** Read saved itinerary from Supabase (or localStorage in mock mode). Returns { rows, contracts } or null. */
export async function loadItinerary(bookingId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('itinerary_rows')
      .select('rows')
      .eq('booking_id', bookingId)
      .single()
    return normalizeStored(data?.rows)
  }
  try {
    const stored = localStorage.getItem(`itinerary_${bookingId}`)
    return stored ? normalizeStored(JSON.parse(stored)) : null
  } catch {
    return null
  }
}

/** Persist itinerary rows + contracts to Supabase (or localStorage in mock mode). */
export async function saveItinerary(bookingId, rows, contracts = []) {
  const blob = { rows, contracts }
  if (isSupabaseConfigured) {
    await supabase
      .from('itinerary_rows')
      .upsert({ booking_id: bookingId, rows: blob, updated_at: new Date().toISOString() }, { onConflict: 'booking_id' })
    return
  }
  localStorage.setItem(`itinerary_${bookingId}`, JSON.stringify(blob))
}

/**
 * Compute the display cost for a single itinerary day.
 * hotel_cost + all activity costs + all transfer costs
 * + cost_per_day for each transport contract that has at least one movement on this day (display only — grand total is handled separately in computeTotals).
 */
export function computeDayCost(row, contracts = [], rowIndex = -1) {
  const hotel = Number(row.hotel_cost) || 0
  const activities = (row.activities || []).reduce((sum, a) => sum + (Number(a.cost) || 0), 0)
  const transfers = (row.transfers || []).reduce((sum, t) => sum + (Number(t.cost) || 0), 0)
  const contractCost = rowIndex >= 0
    ? contracts
        .filter((c) => (c.movements || []).some((m) => m.dayIdx === rowIndex))
        .reduce((sum, c) => sum + (Number(c.cost_per_day) || 0), 0)
    : 0
  return hotel + activities + transfers + contractCost
}

/**
 * Aggregate totals across all rows + transport contracts.
 * Returns { hotelTotal, activityTotal, transferTotal, grandTotal, costPerPerson }
 */
export function computeTotals(rows, booking, contracts = []) {
  let hotelTotal = 0
  let activityTotal = 0
  let transferTotal = 0

  rows.forEach((row) => {
    hotelTotal += Number(row.hotel_cost) || 0
    activityTotal += (row.activities || []).reduce((sum, a) => sum + (Number(a.cost) || 0), 0)
    transferTotal += (row.transfers || []).reduce((sum, t) => sum + (Number(t.cost) || 0), 0)
  })

  // Add daily transport contract costs
  transferTotal += contracts.reduce((sum, c) => sum + (Number(c.cost_per_day) || 0) * (Number(c.days_hired) || 0), 0)

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
