export const PROVEEDORES = [
  'Ruta Tours',
  '10k tours',
  'Aroon y JENEY',
  'YourTtou',
  'Voyage priver',
  'Me pone viajar Ricardo',
  'Vivir Viajando',
  'Recommendation',
  'Others',
  'Orient Tours',
  'Fack reservations',
  'Savoire Journy Nuria',
  'Pasa el mundo',
  'Branque Experience',
  'Houda viajes',
  'jesus black',
]

export const HOTEL_TYPES = [
  'Basico',
  'Superior',
  'Superior Plus',
  'Superior Lujo',
  'Lujo',
]

export const RESERV_STATUSES = ['Confirmed', 'Pending', 'Passed']

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

export function generateReferenciaRuta(proveedor, sequentialNumber) {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const monthAbbr = MONTH_ABBR[now.getMonth()]
  const provAbbr = (proveedor || 'XX').slice(0, 2).toUpperCase()
  const seq = String(sequentialNumber).padStart(3, '0')
  return `${yy}${mm}${monthAbbr}${provAbbr}${seq}`
}
