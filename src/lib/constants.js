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
