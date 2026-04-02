import { supabase, isSupabaseConfigured } from './supabase'

export const PROVIDERS = [
  'Tura Hub',
  '10k tours',
  'Aroon y JENEY',
  'YourTtou',
  'Voyage priver',
  'Me pone viajar Ricardo',
  'Vivir Viajando',
  'Others',
  'Orient Tours',
  'Savoire Journy Nuria',
  'Pasa el mundo',
  'Branque Experience',
  'Houda viajes',
]

/* ── Providers CRUD (Supabase-backed) ────────────────────── */
export async function loadProviders() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('providers').select('*').order('name')
    if (!error && data) return data
  }
  return PROVIDERS.map((name, i) => ({ id: `prov-${i}`, name, email: null, phone: null, website: null, notes: null }))
}

export async function addProvider(provider) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('providers').insert(provider).select().single()
    if (error) throw error
    return data
  }
  return { id: `prov-${Date.now()}`, ...provider }
}

export async function updateProvider(id, updates) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('providers').update(updates).eq('id', id)
    if (error) throw error
  }
}

export async function deleteProvider(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('providers').delete().eq('id', id)
    if (error) throw error
  }
}

export const HOTEL_TYPES = [
  'Basic',
  'Superior',
  'Superior Plus',
  'Superior Luxury',
  'Luxury',
]

export const RESERV_STATUSES = ['Quotation', 'Confirmed', 'Completed', 'Cancelled']

export const HOTEL_STATUS_LABELS = {
  draft: 'Draft',
  requested: 'Requested',
  confirmed: 'Confirmed',
  declined: 'Declined',
  modified: 'Modified',
  cancelled: 'Cancelled',
}

export const TRANSFER_STATUS_LABELS = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  done:      'Done',
  cancelled: 'Cancelled',
}

export const ACTIVITY_STATUS_LABELS = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
}

export const CLIENT_TYPES = [
  { value: 'direct',    label: 'Direct (B2C)',        markup: 35 },
  { value: 'agency',    label: 'Travel Agency (B2B)', markup: 25 },
  { value: 'wholesale', label: 'Wholesale / DMC',      markup: 15 },
  { value: 'corporate', label: 'Group / Corporate',    markup: 20 },
  { value: 'other',     label: 'Other',                markup: 10 },
]

const MONTH_ABBR = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
]

/**
 * Derive a 2-letter abbreviation from a provider name.
 * - Two+ words: first letter of the first two words → "Mapi Expedicion" → "ME"
 * - One word: first two letters → "Marco" → "MA"
 */
export function providerAbbr(provider) {
  const name = (provider || 'XX').trim()
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function generateBookingReference(provider, sequentialNumber) {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const monthAbbr = MONTH_ABBR[now.getMonth()]
  const abbr = providerAbbr(provider)
  const seq = String(sequentialNumber).padStart(3, '0')
  return `${yy}${monthAbbr}${abbr}${seq}`
}
