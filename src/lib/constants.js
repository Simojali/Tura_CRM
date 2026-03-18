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

export const HOTEL_TYPES = [
  'Basic',
  'Superior',
  'Superior Plus',
  'Superior Luxury',
  'Luxury',
]

export const RESERV_STATUSES = ['Confirmed', 'Pending', 'Passed']

export const HOTEL_STATUS_LABELS = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
}

export const TRANSFER_STATUS_LABELS = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  done:      'Done',
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
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export function generateBookingReference(provider, sequentialNumber) {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const monthAbbr = MONTH_ABBR[now.getMonth()]
  const provAbbr = (provider || 'XX').slice(0, 2).toUpperCase()
  const seq = String(sequentialNumber).padStart(3, '0')
  return `${yy}${mm}${monthAbbr}${provAbbr}${seq}`
}
