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

export const TIERS = [
  { value: 'Basic', label: 'Basic (4-star)' },
  { value: 'Superior', label: 'Superior (3-star)' },
  { value: 'Superior Plus', label: 'Superior Plus (2-star)' },
  { value: 'Superior Luxury', label: 'Superior Luxury (1-star)' },
  { value: 'Luxury', label: 'Luxury' },
]

let _nextId = 100

export const MOCK_REFERENCE_DATA = [
  // ─── HOTELS: Marrakech ───
  { id: 'ref-1',  category: 'hotel', subcategory: 'Riad',         name: 'Riad Kniza',              city: 'Marrakech', tier: 'Superior Luxury', price_single: 80,  price_double: 95,  price_triple: 120, price: null, price_unit: 'per night', pax_label: null, notes: null },
  { id: 'ref-2',  category: 'hotel', subcategory: 'Hotel',        name: 'Hotel Kenzi Menara',       city: 'Marrakech', tier: 'Superior',      price_single: 45,  price_double: 55,  price_triple: 75,  price: null, price_unit: 'per night', pax_label: null, notes: null },
  { id: 'ref-3',  category: 'hotel', subcategory: 'Riad',         name: 'Riad Dar Anika',           city: 'Marrakech', tier: 'Superior Plus', price_single: 65,  price_double: 75,  price_triple: 100, price: null, price_unit: 'per night', pax_label: null, notes: null },
  { id: 'ref-4',  category: 'hotel', subcategory: 'Hotel',        name: 'Hotel Islane',             city: 'Marrakech', tier: 'Basic',        price_single: 25,  price_double: 30,  price_triple: 40,  price: null, price_unit: 'per night', pax_label: null, notes: null },
  { id: 'ref-5',  category: 'hotel', subcategory: 'Hotel',        name: 'La Mamounia',              city: 'Marrakech', tier: 'Luxury',          price_single: 240, price_double: 280, price_triple: 380, price: null, price_unit: 'per night', pax_label: null, notes: null },

  // ─── HOTELS: Fes ───
  { id: 'ref-6',  category: 'hotel', subcategory: 'Riad',         name: 'Riad Fes',                city: 'Fes',       tier: 'Superior Luxury', price_single: 90,  price_double: 110, price_triple: 145, price: null, price_unit: 'per night', pax_label: null, notes: null },
  { id: 'ref-7',  category: 'hotel', subcategory: 'Hotel',        name: 'Hotel Sahrai',             city: 'Fes',       tier: 'Superior Plus', price_single: 65,  price_double: 80,  price_triple: 105, price: null, price_unit: 'per night', pax_label: null, notes: null },
  { id: 'ref-8',  category: 'hotel', subcategory: 'Riad',         name: 'Riad Laaroussa',           city: 'Fes',       tier: 'Superior',      price_single: 40,  price_double: 50,  price_triple: 65,  price: null, price_unit: 'per night', pax_label: null, notes: null },
  { id: 'ref-9',  category: 'hotel', subcategory: 'Hotel',        name: 'Hotel Batha',              city: 'Fes',       tier: 'Basic',        price_single: 22,  price_double: 28,  price_triple: 38,  price: null, price_unit: 'per night', pax_label: null, notes: null },

  // ─── HOTELS: Merzouga ───
  { id: 'ref-10', category: 'hotel', subcategory: 'Desert Camp',  name: 'Luxury Desert Camp Erg Chebbi', city: 'Merzouga', tier: 'Luxury',     price_single: 120, price_double: 150, price_triple: 200, price: null, price_unit: 'per night', pax_label: null, notes: 'Full board included' },
  { id: 'ref-11', category: 'hotel', subcategory: 'Desert Camp',  name: 'Standard Desert Camp',     city: 'Merzouga', tier: 'Basic',        price_single: 28,  price_double: 35,  price_triple: 48,  price: null, price_unit: 'per night', pax_label: null, notes: 'Dinner & breakfast included' },
  { id: 'ref-12', category: 'hotel', subcategory: 'Desert Camp',  name: 'Premium Desert Camp',      city: 'Merzouga', tier: 'Superior Plus', price_single: 75,  price_double: 90,  price_triple: 120, price: null, price_unit: 'per night', pax_label: null, notes: 'Full board, private tent' },
  { id: 'ref-13', category: 'hotel', subcategory: 'Hotel',        name: 'Kasbah Tombouctou',        city: 'Merzouga', tier: 'Superior',      price_single: 36,  price_double: 45,  price_triple: 58,  price: null, price_unit: 'per night', pax_label: null, notes: null },

  // ─── HOTELS: Essaouira ───
  { id: 'ref-14', category: 'hotel', subcategory: 'Riad',         name: 'Riad Baladin',             city: 'Essaouira', tier: 'Superior',     price_single: 40,  price_double: 50,  price_triple: 65,  price: null, price_unit: 'per night', pax_label: null, notes: null },
  { id: 'ref-15', category: 'hotel', subcategory: 'Hotel',        name: 'Hotel Atlas Essaouira',    city: 'Essaouira', tier: 'Basic',        price_single: 25,  price_double: 32,  price_triple: 42,  price: null, price_unit: 'per night', pax_label: null, notes: null },
  { id: 'ref-16', category: 'hotel', subcategory: 'Hotel',        name: 'Heure Bleue Palais',       city: 'Essaouira', tier: 'Superior Luxury', price_single: 100, price_double: 120, price_triple: 160, price: null, price_unit: 'per night', pax_label: null, notes: null },

  // ─── HOTELS: Ouarzazate ───
  { id: 'ref-17', category: 'hotel', subcategory: 'Hotel',        name: 'Le Berbere Palace',        city: 'Ouarzazate', tier: 'Superior Plus', price_single: 55, price_double: 70, price_triple: 92,  price: null, price_unit: 'per night', pax_label: null, notes: null },
  { id: 'ref-18', category: 'hotel', subcategory: 'Hotel',        name: 'Hotel Azoul',              city: 'Ouarzazate', tier: 'Basic',        price_single: 20, price_double: 25, price_triple: 33,  price: null, price_unit: 'per night', pax_label: null, notes: null },

  // ─── HOTELS: Chefchaouen ───
  { id: 'ref-19', category: 'hotel', subcategory: 'Riad',         name: 'Casa Hassan',              city: 'Chefchaouen', tier: 'Superior',    price_single: 35, price_double: 45, price_triple: 58,  price: null, price_unit: 'per night', pax_label: null, notes: null },
  { id: 'ref-20', category: 'hotel', subcategory: 'Hotel',        name: 'Hotel Parador',            city: 'Chefchaouen', tier: 'Superior Plus', price_single: 50, price_double: 65, price_triple: 85, price: null, price_unit: 'per night', pax_label: null, notes: null },

  // ─── HOTELS: Dades ───
  { id: 'ref-21', category: 'hotel', subcategory: 'Hotel',        name: 'Kasbah des Roses',         city: 'Dades',     tier: 'Superior',      price_single: 32,  price_double: 40,  price_triple: 52,  price: null, price_unit: 'per night', pax_label: null, notes: null },
  { id: 'ref-22', category: 'hotel', subcategory: 'Hotel',        name: 'Hotel Dades',              city: 'Dades',     tier: 'Basic',        price_single: 18,  price_double: 22,  price_triple: 29,  price: null, price_unit: 'per night', pax_label: null, notes: null },

  // ─── HOTELS: Other cities ───
  { id: 'ref-23', category: 'hotel', subcategory: 'Hotel',        name: 'Hotel Farah',              city: 'Tanger',     tier: 'Superior',     price_single: 45,  price_double: 55,  price_triple: 72,  price: null, price_unit: 'per night', pax_label: null, notes: null },
  { id: 'ref-24', category: 'hotel', subcategory: 'Hotel',        name: 'Sofitel Casablanca',       city: 'Casablanca', tier: 'Luxury',         price_single: 170, price_double: 200, price_triple: 270, price: null, price_unit: 'per night', pax_label: null, notes: null },
  { id: 'ref-25', category: 'hotel', subcategory: 'Hotel',        name: 'Hotel Barcelo',            city: 'Casablanca', tier: 'Superior Plus', price_single: 60, price_double: 75, price_triple: 100, price: null, price_unit: 'per night', pax_label: null, notes: null },
  { id: 'ref-26', category: 'hotel', subcategory: 'Riad',         name: 'Riad Dar El Kebira',       city: 'Rabat',      tier: 'Superior',     price_single: 48,  price_double: 60,  price_triple: 78,  price: null, price_unit: 'per night', pax_label: null, notes: null },
  { id: 'ref-27', category: 'hotel', subcategory: 'Hotel',        name: 'Hotel Sofitel Agadir',     city: 'Agadir',     tier: 'Superior Luxury', price_single: 85, price_double: 100, price_triple: 130, price: null, price_unit: 'per night', pax_label: null, notes: null },
  { id: 'ref-28', category: 'hotel', subcategory: 'Hotel',        name: 'Hotel Ibis Tetouan',       city: 'Tetouan',    tier: 'Basic',       price_single: 24,  price_double: 30,  price_triple: 40,  price: null, price_unit: 'per night', pax_label: null, notes: null },
  { id: 'ref-29', category: 'hotel', subcategory: 'Desert Camp',  name: 'Zagora Desert Camp',       city: 'Zagora',     tier: 'Superior',     price_single: 45,  price_double: 55,  price_triple: 72,  price: null, price_unit: 'per night', pax_label: null, notes: 'Dinner & breakfast included' },
  { id: 'ref-30', category: 'hotel', subcategory: 'Desert Camp',  name: 'Agafay Luxury Camp',       city: 'Agafay',     tier: 'Luxury',         price_single: 150, price_double: 180, price_triple: 240, price: null, price_unit: 'per night', pax_label: null, notes: 'Pool, full board' },

  // ─── TRANSFERS ───
  { id: 'ref-31', category: 'transfer', subcategory: 'Airport Pickup',  name: 'Marrakech Airport Pickup',       city: 'Marrakech', tier: null, price: 20,  price_single: null, price_double: null, price_triple: null, price_unit: 'one way',    pax_label: '1-4 pax', notes: 'Private vehicle' },
  { id: 'ref-32', category: 'transfer', subcategory: 'Airport Pickup',  name: 'Marrakech Airport Pickup',       city: 'Marrakech', tier: null, price: 30,  price_single: null, price_double: null, price_triple: null, price_unit: 'one way',    pax_label: '4-6 pax', notes: 'Private minivan' },
  { id: 'ref-33', category: 'transfer', subcategory: 'Airport Pickup',  name: 'Marrakech Airport Pickup',       city: 'Marrakech', tier: null, price: 45,  price_single: null, price_double: null, price_triple: null, price_unit: 'one way',    pax_label: '7+ pax',  notes: 'Private minibus' },
  { id: 'ref-34', category: 'transfer', subcategory: 'Airport Pickup',  name: 'Marrakech Airport Round Trip',   city: 'Marrakech', tier: null, price: 35,  price_single: null, price_double: null, price_triple: null, price_unit: 'round trip', pax_label: '1-4 pax', notes: 'Private vehicle' },
  { id: 'ref-35', category: 'transfer', subcategory: 'Airport Pickup',  name: 'Marrakech Airport Round Trip',   city: 'Marrakech', tier: null, price: 55,  price_single: null, price_double: null, price_triple: null, price_unit: 'round trip', pax_label: '4-6 pax', notes: 'Private minivan' },
  { id: 'ref-36', category: 'transfer', subcategory: 'Airport Pickup',  name: 'Fes Airport Pickup',             city: 'Fes',       tier: null, price: 20,  price_single: null, price_double: null, price_triple: null, price_unit: 'one way',    pax_label: '1-4 pax', notes: null },
  { id: 'ref-37', category: 'transfer', subcategory: 'Airport Pickup',  name: 'Fes Airport Round Trip',         city: 'Fes',       tier: null, price: 35,  price_single: null, price_double: null, price_triple: null, price_unit: 'round trip', pax_label: '1-4 pax', notes: null },
  { id: 'ref-38', category: 'transfer', subcategory: 'City Transfer',   name: 'Marrakech City Transfer',        city: 'Marrakech', tier: null, price: 15,  price_single: null, price_double: null, price_triple: null, price_unit: 'one way',    pax_label: '1-4 pax', notes: 'Within city limits' },

  // ─── ACTIVITIES: Private ───
  { id: 'ref-39', category: 'activity', subcategory: 'Private Guide', name: 'City Guide Marrakech',     city: 'Marrakech',   tier: null, price: 120, price_single: null, price_double: null, price_triple: null, price_unit: 'per group', pax_label: null,    notes: 'Full day guided tour' },
  { id: 'ref-40', category: 'activity', subcategory: 'Private Guide', name: 'City Guide Fes',           city: 'Fes',         tier: null, price: 120, price_single: null, price_double: null, price_triple: null, price_unit: 'per group', pax_label: null,    notes: 'Full day guided tour' },
  { id: 'ref-41', category: 'activity', subcategory: 'Private Guide', name: 'City Guide Rabat',         city: 'Rabat',       tier: null, price: 100, price_single: null, price_double: null, price_triple: null, price_unit: 'per group', pax_label: null,    notes: 'Full day guided tour' },
  { id: 'ref-42', category: 'activity', subcategory: 'Private Guide', name: 'City Guide Casablanca',    city: 'Casablanca',  tier: null, price: 100, price_single: null, price_double: null, price_triple: null, price_unit: 'per group', pax_label: null,    notes: 'Half day' },
  { id: 'ref-43', category: 'activity', subcategory: 'Private Guide', name: 'City Guide Chefchaouen',   city: 'Chefchaouen', tier: null, price: 80,  price_single: null, price_double: null, price_triple: null, price_unit: 'per group', pax_label: null,    notes: 'Half day walking tour' },
  { id: 'ref-44', category: 'activity', subcategory: 'Private Guide', name: '4x4 Dune Tour Merzouga',   city: 'Merzouga',    tier: null, price: 60,  price_single: null, price_double: null, price_triple: null, price_unit: 'per group', pax_label: '1-4 pax', notes: '1 hour dune excursion' },
  { id: 'ref-45', category: 'activity', subcategory: 'Private Guide', name: '4x4 Dune Tour Merzouga',   city: 'Merzouga',    tier: null, price: 90,  price_single: null, price_double: null, price_triple: null, price_unit: 'per group', pax_label: '5-7 pax', notes: '1 hour, 2 vehicles' },

  // ─── ACTIVITIES: Group ───
  { id: 'ref-46', category: 'activity', subcategory: 'Group Activity', name: 'Quad Biking',              city: 'Merzouga',   tier: null, price: 25,  price_single: null, price_double: null, price_triple: null, price_unit: 'per person', pax_label: null, notes: '1 hour ride' },
  { id: 'ref-47', category: 'activity', subcategory: 'Group Activity', name: 'Dromedary Camel Ride',     city: 'Merzouga',   tier: null, price: 20,  price_single: null, price_double: null, price_triple: null, price_unit: 'per person', pax_label: null, notes: 'Sunset camel trek' },
  { id: 'ref-48', category: 'activity', subcategory: 'Group Activity', name: 'Dinner Show Fantasia',     city: 'Marrakech',  tier: null, price: 40,  price_single: null, price_double: null, price_triple: null, price_unit: 'per person', pax_label: null, notes: 'Evening dinner + show' },
  { id: 'ref-49', category: 'activity', subcategory: 'Group Activity', name: 'Buggy Ride',               city: 'Marrakech',  tier: null, price: 35,  price_single: null, price_double: null, price_triple: null, price_unit: 'per person', pax_label: null, notes: '2 hours, Palmeraie' },
  { id: 'ref-50', category: 'activity', subcategory: 'Group Activity', name: 'Quad Biking Agafay',       city: 'Agafay',     tier: null, price: 30,  price_single: null, price_double: null, price_triple: null, price_unit: 'per person', pax_label: null, notes: '1.5 hours' },
  { id: 'ref-51', category: 'activity', subcategory: 'Group Activity', name: 'Hot Air Balloon',          city: 'Marrakech',  tier: null, price: 65,  price_single: null, price_double: null, price_triple: null, price_unit: 'per person', pax_label: null, notes: 'Sunrise flight' },
  { id: 'ref-52', category: 'activity', subcategory: 'Group Activity', name: 'Hammam & Spa',             city: 'Marrakech',  tier: null, price: 25,  price_single: null, price_double: null, price_triple: null, price_unit: 'per person', pax_label: null, notes: 'Traditional hammam experience' },

  // ─── TRANSPORT: Buses ───
  { id: 'ref-53', category: 'transport', subcategory: 'Bus', name: 'Minibus 14 pax',                    city: null, tier: null, price: 150, price_single: null, price_double: null, price_triple: null, price_unit: 'per day',     pax_label: '14 seats', notes: 'With driver, fuel included' },
  { id: 'ref-54', category: 'transport', subcategory: 'Bus', name: 'Minibus 17 pax',                    city: null, tier: null, price: 180, price_single: null, price_double: null, price_triple: null, price_unit: 'per day',     pax_label: '17 seats', notes: 'With driver, fuel included' },
  { id: 'ref-55', category: 'transport', subcategory: 'Bus', name: 'Bus 34 pax',                        city: null, tier: null, price: 300, price_single: null, price_double: null, price_triple: null, price_unit: 'per day',     pax_label: '34 seats', notes: 'With driver, fuel included' },
  { id: 'ref-56', category: 'transport', subcategory: 'Bus', name: 'Bus 50 pax',                        city: null, tier: null, price: 400, price_single: null, price_double: null, price_triple: null, price_unit: 'per day',     pax_label: '50 seats', notes: 'With driver, fuel included' },

  // ─── TRANSPORT: Multi-day routes ───
  { id: 'ref-57', category: 'transport', subcategory: 'Multi-Day Route', name: 'Marrakech → Merzouga (3 days)',        city: null, tier: null, price: 500, price_single: null, price_double: null, price_triple: null, price_unit: 'per vehicle', pax_label: '1-6 pax', notes: 'Via Ouarzazate, Dades' },
  { id: 'ref-58', category: 'transport', subcategory: 'Multi-Day Route', name: 'Marrakech → Fes via Desert (4 days)', city: null, tier: null, price: 700, price_single: null, price_double: null, price_triple: null, price_unit: 'per vehicle', pax_label: '1-6 pax', notes: 'Via Ouarzazate, Merzouga' },

  // ─── TRANSPORT: Day trips ───
  { id: 'ref-59', category: 'transport', subcategory: 'Day Trip', name: 'Ouzoud Waterfalls Day Trip', city: 'Ouzoud',    tier: null, price: 80, price_single: null, price_double: null, price_triple: null, price_unit: 'per vehicle', pax_label: '1-6 pax', notes: 'From Marrakech, full day' },
  { id: 'ref-60', category: 'transport', subcategory: 'Day Trip', name: 'Ourika Valley Day Trip',     city: 'Marrakech', tier: null, price: 60, price_single: null, price_double: null, price_triple: null, price_unit: 'per vehicle', pax_label: '1-6 pax', notes: 'From Marrakech, half day' },
  { id: 'ref-61', category: 'transport', subcategory: 'Day Trip', name: 'Essaouira Day Trip',         city: 'Essaouira', tier: null, price: 90, price_single: null, price_double: null, price_triple: null, price_unit: 'per vehicle', pax_label: '1-6 pax', notes: 'From Marrakech, full day' },
  { id: 'ref-62', category: 'transport', subcategory: 'Day Trip', name: 'Agafay Desert Day Trip',     city: 'Agafay',    tier: null, price: 50, price_single: null, price_double: null, price_triple: null, price_unit: 'per vehicle', pax_label: '1-6 pax', notes: 'From Marrakech, half day' },
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
