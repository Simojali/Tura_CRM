import { supabase, isSupabaseConfigured } from './supabase'

// Categories & subcategories for the Reference Data Bank
export const REF_CATEGORIES = ['hotel', 'transfer', 'activity', 'transport']

export const REF_SUBCATEGORIES = {
  hotel: ['Hotel', 'Riad', 'Desert Camp'],
  transfer: ['Airport Pickup', 'City Transfer'],
  activity: ['Private Guide', 'Group Activity'],
  transport: ['Bus', 'Day Trip', 'Multi-Day Route'],
}

export const CITIES = [
  'Marrakech', 'Fes', 'Merzouga', 'Essaouira', 'Ouarzazate',
  'Chefchaouen', 'Dades', 'Agadir', 'Tanger', 'Tetouan',
  'Casablanca', 'Rabat', 'Asilah', 'Ouzoud', 'Zagora', 'Agafay',
]

/* ── Cities CRUD (Supabase-backed) ───────────────────────── */
export async function loadCities() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('cities').select('*').order('name')
    if (!error && data) return data
  }
  return CITIES.map((name, i) => ({ id: `city-${i}`, name }))
}

export async function addCity(name) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('cities').insert({ name }).select().single()
    if (error) throw error
    return data
  }
  return { id: `city-${Date.now()}`, name }
}

export async function updateCity(id, name) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('cities').update({ name }).eq('id', id)
    if (error) throw error
  }
}

export async function deleteCity(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('cities').delete().eq('id', id)
    if (error) throw error
  }
}

export const TIERS = [
  { value: 'Basic', label: 'Basic (1-star)' },
  { value: 'Superior', label: 'Superior (2-star)' },
  { value: 'Superior Plus', label: 'Superior Plus (3-star)' },
  { value: 'Superior Luxury', label: 'Superior Luxury (4-star)' },
  { value: 'Luxury', label: 'Luxury (5-star)' },
]

let _nextId = 100

export const MOCK_REFERENCE_DATA = [
  // ─── HOTELS: Marrakech ───
  { id: 'ref-1',  category: 'hotel', subcategory: 'Riad',         name: 'Riad Kniza',              city: 'Marrakech', tier: 'Superior Luxury', price_single: 80,  price_double: 95,  price_triple: 120, price: null, price_unit: 'per night', notes: null, contact_person: 'Ahmed Benali', contact_email: 'ahmed@riadkniza.com', contact_phone: '+212 6 12 34 56 78', payment_terms: '50% deposit on confirmation, balance 7 days before arrival', default_deposit_pct: 50, cancellation_policy: 'Free cancellation 14 days before check-in. 100% charge within 7 days.' },
  { id: 'ref-2',  category: 'hotel', subcategory: 'Hotel',        name: 'Hotel Kenzi Menara',       city: 'Marrakech', tier: 'Superior',      price_single: 45,  price_double: 55,  price_triple: 75,  price: null, price_unit: 'per night', notes: null, contact_person: null, contact_email: null, contact_phone: null, payment_terms: null, default_deposit_pct: null, cancellation_policy: null },
  { id: 'ref-3',  category: 'hotel', subcategory: 'Riad',         name: 'Riad Dar Anika',           city: 'Marrakech', tier: 'Superior Plus', price_single: 65,  price_double: 75,  price_triple: 100, price: null, price_unit: 'per night', notes: null, contact_person: 'Fatima Zahra', contact_email: 'reservations@riaddaranika.com', contact_phone: '+212 6 98 76 54 32', payment_terms: '30% deposit, 70% on arrival', default_deposit_pct: 30, cancellation_policy: 'Free cancellation 7 days before. 50% charge after.' },
  { id: 'ref-4',  category: 'hotel', subcategory: 'Hotel',        name: 'Hotel Islane',             city: 'Marrakech', tier: 'Basic',        price_single: 25,  price_double: 30,  price_triple: 40,  price: null, price_unit: 'per night', notes: null, contact_person: null, contact_email: null, contact_phone: null, payment_terms: null, default_deposit_pct: null, cancellation_policy: null },
  { id: 'ref-5',  category: 'hotel', subcategory: 'Hotel',        name: 'La Mamounia',              city: 'Marrakech', tier: 'Luxury',          price_single: 240, price_double: 280, price_triple: 380, price: null, price_unit: 'per night', notes: null, contact_person: 'Youssef El Idrissi', contact_email: 'groups@mamounia.com', contact_phone: '+212 5 24 38 86 00', payment_terms: '100% prepayment required', default_deposit_pct: 100, cancellation_policy: 'Non-refundable. Modifications subject to availability.' },

  // ─── HOTELS: Fes ───
  { id: 'ref-6',  category: 'hotel', subcategory: 'Riad',         name: 'Riad Fes',                city: 'Fes',       tier: 'Superior Luxury', price_single: 90,  price_double: 110, price_triple: 145, price: null, price_unit: 'per night', notes: null, contact_person: 'Karim Tazi', contact_email: 'booking@riadfes.com', contact_phone: '+212 5 35 94 76 10', payment_terms: '50% deposit, balance 14 days before', default_deposit_pct: 50, cancellation_policy: 'Free cancellation 21 days before. 100% within 14 days.' },
  { id: 'ref-7',  category: 'hotel', subcategory: 'Hotel',        name: 'Hotel Sahrai',             city: 'Fes',       tier: 'Superior Plus', price_single: 65,  price_double: 80,  price_triple: 105, price: null, price_unit: 'per night', notes: null, contact_person: null, contact_email: null, contact_phone: null, payment_terms: null, default_deposit_pct: null, cancellation_policy: null },
  { id: 'ref-8',  category: 'hotel', subcategory: 'Riad',         name: 'Riad Laaroussa',           city: 'Fes',       tier: 'Superior',      price_single: 40,  price_double: 50,  price_triple: 65,  price: null, price_unit: 'per night', notes: null, contact_person: null, contact_email: null, contact_phone: null, payment_terms: null, default_deposit_pct: null, cancellation_policy: null },
  { id: 'ref-9',  category: 'hotel', subcategory: 'Hotel',        name: 'Hotel Batha',              city: 'Fes',       tier: 'Basic',        price_single: 22,  price_double: 28,  price_triple: 38,  price: null, price_unit: 'per night', notes: null, contact_person: null, contact_email: null, contact_phone: null, payment_terms: null, default_deposit_pct: null, cancellation_policy: null },

  // ─── HOTELS: Merzouga ───
  { id: 'ref-10', category: 'hotel', subcategory: 'Desert Camp',  name: 'Luxury Desert Camp Erg Chebbi', city: 'Merzouga', tier: 'Luxury',     price_single: 120, price_double: 150, price_triple: 200, price: null, price_unit: 'per night', notes: 'Full board included', contact_person: 'Hassan Ouali', contact_email: 'hassan@desertcampmerzouga.com', contact_phone: '+212 6 55 44 33 22', payment_terms: '50% deposit, balance on arrival', default_deposit_pct: 50, cancellation_policy: 'Free cancellation 10 days before. Full charge after.' },
  { id: 'ref-11', category: 'hotel', subcategory: 'Desert Camp',  name: 'Standard Desert Camp',     city: 'Merzouga', tier: 'Basic',        price_single: 28,  price_double: 35,  price_triple: 48,  price: null, price_unit: 'per night', notes: 'Dinner & breakfast included', contact_person: null, contact_email: null, contact_phone: null, payment_terms: null, default_deposit_pct: null, cancellation_policy: null },
  { id: 'ref-12', category: 'hotel', subcategory: 'Desert Camp',  name: 'Premium Desert Camp',      city: 'Merzouga', tier: 'Superior Plus', price_single: 75,  price_double: 90,  price_triple: 120, price: null, price_unit: 'per night', notes: 'Full board, private tent', contact_person: null, contact_email: null, contact_phone: null, payment_terms: null, default_deposit_pct: null, cancellation_policy: null },
  { id: 'ref-13', category: 'hotel', subcategory: 'Hotel',        name: 'Kasbah Tombouctou',        city: 'Merzouga', tier: 'Superior',      price_single: 36,  price_double: 45,  price_triple: 58,  price: null, price_unit: 'per night', notes: null, contact_person: null, contact_email: null, contact_phone: null, payment_terms: null, default_deposit_pct: null, cancellation_policy: null },

  // ─── HOTELS: Essaouira ───
  { id: 'ref-14', category: 'hotel', subcategory: 'Riad',         name: 'Riad Baladin',             city: 'Essaouira', tier: 'Superior',     price_single: 40,  price_double: 50,  price_triple: 65,  price: null, price_unit: 'per night', notes: null, contact_person: null, contact_email: null, contact_phone: null, payment_terms: null, default_deposit_pct: null, cancellation_policy: null },
  { id: 'ref-15', category: 'hotel', subcategory: 'Hotel',        name: 'Hotel Atlas Essaouira',    city: 'Essaouira', tier: 'Basic',        price_single: 25,  price_double: 32,  price_triple: 42,  price: null, price_unit: 'per night', notes: null, contact_person: null, contact_email: null, contact_phone: null, payment_terms: null, default_deposit_pct: null, cancellation_policy: null },
  { id: 'ref-16', category: 'hotel', subcategory: 'Hotel',        name: 'Heure Bleue Palais',       city: 'Essaouira', tier: 'Superior Luxury', price_single: 100, price_double: 120, price_triple: 160, price: null, price_unit: 'per night', notes: null, contact_person: null, contact_email: null, contact_phone: null, payment_terms: null, default_deposit_pct: null, cancellation_policy: null },

  // ─── HOTELS: Ouarzazate ───
  { id: 'ref-17', category: 'hotel', subcategory: 'Hotel',        name: 'Le Berbere Palace',        city: 'Ouarzazate', tier: 'Superior Plus', price_single: 55, price_double: 70, price_triple: 92,  price: null, price_unit: 'per night', notes: null, contact_person: null, contact_email: null, contact_phone: null, payment_terms: null, default_deposit_pct: null, cancellation_policy: null },
  { id: 'ref-18', category: 'hotel', subcategory: 'Hotel',        name: 'Hotel Azoul',              city: 'Ouarzazate', tier: 'Basic',        price_single: 20, price_double: 25, price_triple: 33,  price: null, price_unit: 'per night', notes: null, contact_person: null, contact_email: null, contact_phone: null, payment_terms: null, default_deposit_pct: null, cancellation_policy: null },

  // ─── HOTELS: Chefchaouen ───
  { id: 'ref-19', category: 'hotel', subcategory: 'Riad',         name: 'Casa Hassan',              city: 'Chefchaouen', tier: 'Superior',    price_single: 35, price_double: 45, price_triple: 58,  price: null, price_unit: 'per night', notes: null, contact_person: null, contact_email: null, contact_phone: null, payment_terms: null, default_deposit_pct: null, cancellation_policy: null },
  { id: 'ref-20', category: 'hotel', subcategory: 'Hotel',        name: 'Hotel Parador',            city: 'Chefchaouen', tier: 'Superior Plus', price_single: 50, price_double: 65, price_triple: 85, price: null, price_unit: 'per night', notes: null, contact_person: null, contact_email: null, contact_phone: null, payment_terms: null, default_deposit_pct: null, cancellation_policy: null },

  // ─── HOTELS: Dades ───
  { id: 'ref-21', category: 'hotel', subcategory: 'Hotel',        name: 'Kasbah des Roses',         city: 'Dades',     tier: 'Superior',      price_single: 32,  price_double: 40,  price_triple: 52,  price: null, price_unit: 'per night', notes: null, contact_person: null, contact_email: null, contact_phone: null, payment_terms: null, default_deposit_pct: null, cancellation_policy: null },
  { id: 'ref-22', category: 'hotel', subcategory: 'Hotel',        name: 'Hotel Dades',              city: 'Dades',     tier: 'Basic',        price_single: 18,  price_double: 22,  price_triple: 29,  price: null, price_unit: 'per night', notes: null, contact_person: null, contact_email: null, contact_phone: null, payment_terms: null, default_deposit_pct: null, cancellation_policy: null },

  // ─── HOTELS: Other cities ───
  { id: 'ref-23', category: 'hotel', subcategory: 'Hotel',        name: 'Hotel Farah',              city: 'Tanger',     tier: 'Superior',     price_single: 45,  price_double: 55,  price_triple: 72,  price: null, price_unit: 'per night', notes: null, contact_person: null, contact_email: null, contact_phone: null, payment_terms: null, default_deposit_pct: null, cancellation_policy: null },
  { id: 'ref-24', category: 'hotel', subcategory: 'Hotel',        name: 'Sofitel Casablanca',       city: 'Casablanca', tier: 'Luxury',         price_single: 170, price_double: 200, price_triple: 270, price: null, price_unit: 'per night', notes: null, contact_person: null, contact_email: null, contact_phone: null, payment_terms: null, default_deposit_pct: null, cancellation_policy: null },
  { id: 'ref-25', category: 'hotel', subcategory: 'Hotel',        name: 'Hotel Barcelo',            city: 'Casablanca', tier: 'Superior Plus', price_single: 60, price_double: 75, price_triple: 100, price: null, price_unit: 'per night', notes: null, contact_person: null, contact_email: null, contact_phone: null, payment_terms: null, default_deposit_pct: null, cancellation_policy: null },
  { id: 'ref-26', category: 'hotel', subcategory: 'Riad',         name: 'Riad Dar El Kebira',       city: 'Rabat',      tier: 'Superior',     price_single: 48,  price_double: 60,  price_triple: 78,  price: null, price_unit: 'per night', notes: null, contact_person: null, contact_email: null, contact_phone: null, payment_terms: null, default_deposit_pct: null, cancellation_policy: null },
  { id: 'ref-27', category: 'hotel', subcategory: 'Hotel',        name: 'Hotel Sofitel Agadir',     city: 'Agadir',     tier: 'Superior Luxury', price_single: 85, price_double: 100, price_triple: 130, price: null, price_unit: 'per night', notes: null, contact_person: null, contact_email: null, contact_phone: null, payment_terms: null, default_deposit_pct: null, cancellation_policy: null },
  { id: 'ref-28', category: 'hotel', subcategory: 'Hotel',        name: 'Hotel Ibis Tetouan',       city: 'Tetouan',    tier: 'Basic',       price_single: 24,  price_double: 30,  price_triple: 40,  price: null, price_unit: 'per night', notes: null, contact_person: null, contact_email: null, contact_phone: null, payment_terms: null, default_deposit_pct: null, cancellation_policy: null },
  { id: 'ref-29', category: 'hotel', subcategory: 'Desert Camp',  name: 'Zagora Desert Camp',       city: 'Zagora',     tier: 'Superior',     price_single: 45,  price_double: 55,  price_triple: 72,  price: null, price_unit: 'per night', notes: 'Dinner & breakfast included', contact_person: null, contact_email: null, contact_phone: null, payment_terms: null, default_deposit_pct: null, cancellation_policy: null },
  { id: 'ref-30', category: 'hotel', subcategory: 'Desert Camp',  name: 'Agafay Luxury Camp',       city: 'Agafay',     tier: 'Luxury',         price_single: 150, price_double: 180, price_triple: 240, price: null, price_unit: 'per night', notes: 'Pool, full board', contact_person: null, contact_email: null, contact_phone: null, payment_terms: null, default_deposit_pct: null, cancellation_policy: null },

  // ─── TRANSFERS ───
  { id: 'ref-31', category: 'transfer', subcategory: 'Airport Pickup',  name: 'Marrakech Airport Pickup',       city: 'Marrakech', tier: null, price: 20,  price_single: null, price_double: null, price_triple: null, price_unit: 'one way',    notes: 'Private vehicle', group_price: null, capacity: 4 },
  { id: 'ref-32', category: 'transfer', subcategory: 'Airport Pickup',  name: 'Marrakech Airport Pickup',       city: 'Marrakech', tier: null, price: 30,  price_single: null, price_double: null, price_triple: null, price_unit: 'one way',    notes: 'Private minivan', group_price: null, capacity: 6 },
  { id: 'ref-33', category: 'transfer', subcategory: 'Airport Pickup',  name: 'Marrakech Airport Pickup',       city: 'Marrakech', tier: null, price: 45,  price_single: null, price_double: null, price_triple: null, price_unit: 'one way',     notes: 'Private minibus', group_price: 7, capacity: 8 },
  { id: 'ref-34', category: 'transfer', subcategory: 'Airport Pickup',  name: 'Marrakech Airport Round Trip',   city: 'Marrakech', tier: null, price: 35,  price_single: null, price_double: null, price_triple: null, price_unit: 'round trip', notes: 'Private vehicle', group_price: null, capacity: 4 },
  { id: 'ref-35', category: 'transfer', subcategory: 'Airport Pickup',  name: 'Marrakech Airport Round Trip',   city: 'Marrakech', tier: null, price: 55,  price_single: null, price_double: null, price_triple: null, price_unit: 'round trip', notes: 'Private minivan', group_price: null, capacity: 6 },
  { id: 'ref-36', category: 'transfer', subcategory: 'Airport Pickup',  name: 'Fes Airport Pickup',             city: 'Fes',       tier: null, price: 20,  price_single: null, price_double: null, price_triple: null, price_unit: 'one way',    notes: null, group_price: null, capacity: 4 },
  { id: 'ref-37', category: 'transfer', subcategory: 'Airport Pickup',  name: 'Fes Airport Round Trip',         city: 'Fes',       tier: null, price: 35,  price_single: null, price_double: null, price_triple: null, price_unit: 'round trip', notes: null, group_price: null, capacity: 4 },
  { id: 'ref-38', category: 'transfer', subcategory: 'City Transfer',   name: 'Marrakech City Transfer',        city: 'Marrakech', tier: null, price: 15,  price_single: null, price_double: null, price_triple: null, price_unit: 'one way',    notes: 'Within city limits', group_price: null, capacity: 4 },

  // ─── ACTIVITIES: Private ───
  { id: 'ref-39', category: 'activity', subcategory: 'Private Guide', name: 'City Guide Marrakech',     city: 'Marrakech',   tier: null, price: 120, price_single: null, price_double: null, price_triple: null, price_unit: 'per group',    notes: 'Full day guided tour' },
  { id: 'ref-40', category: 'activity', subcategory: 'Private Guide', name: 'City Guide Fes',           city: 'Fes',         tier: null, price: 120, price_single: null, price_double: null, price_triple: null, price_unit: 'per group',    notes: 'Full day guided tour' },
  { id: 'ref-41', category: 'activity', subcategory: 'Private Guide', name: 'City Guide Rabat',         city: 'Rabat',       tier: null, price: 100, price_single: null, price_double: null, price_triple: null, price_unit: 'per group',    notes: 'Full day guided tour' },
  { id: 'ref-42', category: 'activity', subcategory: 'Private Guide', name: 'City Guide Casablanca',    city: 'Casablanca',  tier: null, price: 100, price_single: null, price_double: null, price_triple: null, price_unit: 'per group',    notes: 'Half day' },
  { id: 'ref-43', category: 'activity', subcategory: 'Private Guide', name: 'City Guide Chefchaouen',   city: 'Chefchaouen', tier: null, price: 80,  price_single: null, price_double: null, price_triple: null, price_unit: 'per group',    notes: 'Half day walking tour' },
  { id: 'ref-44', category: 'activity', subcategory: 'Private Guide', name: '4x4 Dune Tour Merzouga',   city: 'Merzouga',    tier: null, price: 60,  price_single: null, price_double: null, price_triple: null, price_unit: 'per group', notes: '1 hour dune excursion' },
  { id: 'ref-45', category: 'activity', subcategory: 'Private Guide', name: '4x4 Dune Tour Merzouga',   city: 'Merzouga',    tier: null, price: 90,  price_single: null, price_double: null, price_triple: null, price_unit: 'per group', notes: '1 hour, 2 vehicles' },

  // ─── ACTIVITIES: Group ───
  { id: 'ref-46', category: 'activity', subcategory: 'Group Activity', name: 'Quad Biking',              city: 'Merzouga',   tier: null, price: 25,  price_single: null, price_double: null, price_triple: null, price_unit: 'per person', notes: '1 hour ride' },
  { id: 'ref-47', category: 'activity', subcategory: 'Group Activity', name: 'Dromedary Camel Ride',     city: 'Merzouga',   tier: null, price: 20,  price_single: null, price_double: null, price_triple: null, price_unit: 'per person', notes: 'Sunset camel trek' },
  { id: 'ref-48', category: 'activity', subcategory: 'Group Activity', name: 'Dinner Show Fantasia',     city: 'Marrakech',  tier: null, price: 40,  price_single: null, price_double: null, price_triple: null, price_unit: 'per person', notes: 'Evening dinner + show' },
  { id: 'ref-49', category: 'activity', subcategory: 'Group Activity', name: 'Buggy Ride',               city: 'Marrakech',  tier: null, price: 35,  price_single: null, price_double: null, price_triple: null, price_unit: 'per person', notes: '2 hours, Palmeraie' },
  { id: 'ref-50', category: 'activity', subcategory: 'Group Activity', name: 'Quad Biking Agafay',       city: 'Agafay',     tier: null, price: 30,  price_single: null, price_double: null, price_triple: null, price_unit: 'per person', notes: '1.5 hours' },
  { id: 'ref-51', category: 'activity', subcategory: 'Group Activity', name: 'Hot Air Balloon',          city: 'Marrakech',  tier: null, price: 65,  price_single: null, price_double: null, price_triple: null, price_unit: 'per person', notes: 'Sunrise flight' },
  { id: 'ref-52', category: 'activity', subcategory: 'Group Activity', name: 'Hammam & Spa',             city: 'Marrakech',  tier: null, price: 25,  price_single: null, price_double: null, price_triple: null, price_unit: 'per person', notes: 'Traditional hammam experience' },

  // ─── TRANSPORT: Buses ───
  { id: 'ref-53', category: 'transport', subcategory: 'Bus', name: 'Minibus 14 pax',                    city: null, tier: null, price: 150, price_single: null, price_double: null, price_triple: null, price_unit: 'per day',     notes: 'With driver, fuel included', group_price: 12, capacity: 14 },
  { id: 'ref-54', category: 'transport', subcategory: 'Bus', name: 'Minibus 17 pax',                    city: null, tier: null, price: 180, price_single: null, price_double: null, price_triple: null, price_unit: 'per day',     notes: 'With driver, fuel included', group_price: 13, capacity: 17 },
  { id: 'ref-55', category: 'transport', subcategory: 'Bus', name: 'Bus 34 pax',                        city: null, tier: null, price: 300, price_single: null, price_double: null, price_triple: null, price_unit: 'per day',     notes: 'With driver, fuel included', group_price: null, capacity: 34 },
  { id: 'ref-56', category: 'transport', subcategory: 'Bus', name: 'Bus 50 pax',                        city: null, tier: null, price: 400, price_single: null, price_double: null, price_triple: null, price_unit: 'per day',     notes: 'With driver, fuel included', group_price: null, capacity: 50 },

  // ─── TRANSPORT: Multi-day routes ───
  { id: 'ref-57', category: 'transport', subcategory: 'Multi-Day Route', name: 'Marrakech → Merzouga (3 days)',        city: null, tier: null, price: 500, price_single: null, price_double: null, price_triple: null, price_unit: 'per vehicle', notes: 'Via Ouarzazate, Dades', group_price: null, capacity: 6 },
  { id: 'ref-58', category: 'transport', subcategory: 'Multi-Day Route', name: 'Marrakech → Fes via Desert (4 days)', city: null, tier: null, price: 700, price_single: null, price_double: null, price_triple: null, price_unit: 'per vehicle', notes: 'Via Ouarzazate, Merzouga', group_price: null, capacity: 6 },

  // ─── TRANSPORT: Day trips ───
  { id: 'ref-59', category: 'transport', subcategory: 'Day Trip', name: 'Ouzoud Waterfalls Day Trip', city: 'Ouzoud',    tier: null, price: 80, price_single: null, price_double: null, price_triple: null, price_unit: 'per vehicle', notes: 'From Marrakech, full day', group_price: null, capacity: 6 },
  { id: 'ref-60', category: 'transport', subcategory: 'Day Trip', name: 'Ourika Valley Day Trip',     city: 'Marrakech', tier: null, price: 60, price_single: null, price_double: null, price_triple: null, price_unit: 'per vehicle', notes: 'From Marrakech, half day', group_price: null, capacity: 6 },
  { id: 'ref-61', category: 'transport', subcategory: 'Day Trip', name: 'Essaouira Day Trip',         city: 'Essaouira', tier: null, price: 90, price_single: null, price_double: null, price_triple: null, price_unit: 'per vehicle', notes: 'From Marrakech, full day', group_price: null, capacity: 6 },
  { id: 'ref-62', category: 'transport', subcategory: 'Day Trip', name: 'Agafay Desert Day Trip',     city: 'Agafay',    tier: null, price: 50, price_single: null, price_double: null, price_triple: null, price_unit: 'per vehicle', notes: 'From Marrakech, half day', group_price: null, capacity: 6 },
]

export function getNextRefId() {
  return `ref-${_nextId++}`
}

export async function loadReferenceData() {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('reference_items')
      .select('*')
      .order('category')
    return data?.length ? data : MOCK_REFERENCE_DATA
  }
  try {
    const stored = localStorage.getItem('reference_data')
    return stored ? JSON.parse(stored) : MOCK_REFERENCE_DATA
  } catch {
    return MOCK_REFERENCE_DATA
  }
}

export async function saveReferenceData(items) {
  if (isSupabaseConfigured) {
    await supabase.from('reference_items').upsert(items)
    return
  }
  localStorage.setItem('reference_data', JSON.stringify(items))
}
