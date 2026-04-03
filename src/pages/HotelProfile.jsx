import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadReferenceData, saveReferenceData, loadCities, tierStars } from '../lib/referenceData'
import { supabase } from '../lib/supabase'
import { fmtDate, fmtCost, statusClass } from '../lib/formatters'
import ReferenceItemModal from '../components/ReferenceItemModal'
import HotelMessageModal from '../components/HotelMessageModal'
import Toast from '../components/Toast'

const slugify = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const STATUS_EVENTS = new Set(['requested', 'confirmed', 'declined', 'modified', 'cancelled'])
const HOTEL_STATUS_LABELS = {
  draft: 'Draft', requested: 'Requested', confirmed: 'Confirmed',
  declined: 'Declined', modified: 'Modified', cancelled: 'Cancelled',
}
function getHotelStatus(entry) {
  const timeline = entry.timeline || []
  if (timeline.length === 0) return 'draft'
  for (let i = timeline.length - 1; i >= 0; i--) {
    if (STATUS_EVENTS.has(timeline[i].type)) return timeline[i].type
  }
  return 'draft'
}

const fmtPrice = (v) =>
  v != null
    ? `€${Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : null

const fmtRoomsShort = (entry) => {
  const parts = []
  // rooms from the booking-level (single_rooms etc.) aren't on the entry,
  // so we display what we know from the hotel entry itself
  return parts.join(' · ') || null
}

// ── Side panel: timeline icons ────────────────────────────────────────────
const _sz = { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
const TlSend    = () => <svg {..._sz}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
const TlRefresh = () => <svg {..._sz}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
const TlCheck   = () => <svg {..._sz}><polyline points="20 6 9 17 4 12"/></svg>
const TlX       = () => <svg {..._sz}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const TlEdit    = () => <svg {..._sz}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const TlBan     = () => <svg {..._sz}><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
const TlMail    = () => <svg {..._sz}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>

const PANEL_TL_TYPES = [
  { value: 'requested', label: 'Requested', icon: <TlSend /> },
  { value: 'follow-up', label: 'Follow-up', icon: <TlRefresh /> },
  { value: 'confirmed', label: 'Confirmed', icon: <TlCheck /> },
  { value: 'declined',  label: 'Declined',  icon: <TlX /> },
  { value: 'modified',  label: 'Modified',  icon: <TlEdit /> },
  { value: 'cancelled', label: 'Cancelled', icon: <TlBan /> },
]
const PANEL_TL_METHODS = [
  { value: 'email',    label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'phone',    label: 'Phone' },
]
const EMPTY_PANEL_TL = { type: 'follow-up', method: 'email', note: '', ref: '' }

function computeNights(checkin, checkout) {
  if (!checkin || !checkout) return 0
  const diff = Math.round((new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
}

function createTlEvent(type, method = 'email', note = '', ref = '') {
  return { id: crypto.randomUUID(), date: new Date().toISOString(), type, method, note, ...(ref ? { ref } : {}) }
}

function fmtTimeline(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

function fmtElapsedHP(prevDate, currDate) {
  if (!prevDate || !currDate) return ''
  const ms = new Date(currDate) - new Date(prevDate)
  if (ms < 0) return ''
  const mins = Math.floor(ms / 60000)
  const hrs  = Math.floor(ms / 3600000)
  const days = Math.floor(ms / 86400000)
  if (days >= 7) return `${Math.floor(days / 7)}w`
  if (days >= 1) return `${days}d`
  if (hrs  >= 1) return `${hrs}h`
  return `${mins}m`
}

function getConfirmRef(entry) {
  const tl = entry.timeline || []
  for (let i = tl.length - 1; i >= 0; i--) {
    if (tl[i].type === 'confirmed' && tl[i].ref) return tl[i].ref
  }
  return ''
}

export default function HotelProfile() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [items, setItems] = useState([])
  const [hotel, setHotel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [cities, setCities] = useState([])
  const [toast, setToast] = useState(null)

  // Booking history state
  const [bookingHistory, setBookingHistory] = useState([]) // [{booking, hotelEntry}]
  const [historyLoading, setHistoryLoading] = useState(false)

  // Side panel state
  const [panelData, setPanelData]           = useState(null)  // { booking, hotelEntry } original
  const [panelEntry, setPanelEntry]         = useState(null)  // working copy being edited
  const [panelTlForm, setPanelTlForm]       = useState(EMPTY_PANEL_TL)
  const [showPanelTl, setShowPanelTl]       = useState(false)
  const [panelSaving, setPanelSaving]       = useState(false)
  const [panelMsgOpen, setPanelMsgOpen]     = useState(false)
  const [panelClosing, setPanelClosing]     = useState(false)
  const panelDataRef                        = useRef(null)    // stable ref for async callbacks

  useEffect(() => {
    Promise.all([loadReferenceData(), loadCities()]).then(([data, cityList]) => {
      setItems(data)
      setCities(cityList)
      const found = data.find((i) => i.category === 'hotel' && slugify(i.name) === id)
      if (found) {
        setHotel(found)
      } else {
        setNotFound(true)
      }
      setLoading(false)
    })
  }, [id])

  // Load booking history once hotel is found
  useEffect(() => {
    if (!hotel) return
    setHistoryLoading(true)

    const load = async () => {
      // 1. Fetch all itinerary_rows
      const { data: rows } = await supabase
        .from('itinerary_rows')
        .select('booking_id, rows')

      if (!rows) { setHistoryLoading(false); return }

      // 2. Find all entries where this hotel's ref_id appears
      const matches = [] // [{ booking_id, hotelEntry }]
      for (const row of rows) {
        const hotels = row.rows?.hotels || []
        for (const h of hotels) {
          if (h.ref_id === hotel.id) {
            matches.push({ booking_id: row.booking_id, hotelEntry: h })
          }
        }
      }

      if (matches.length === 0) { setHistoryLoading(false); return }

      // 3. Fetch the matching bookings
      const bookingIds = [...new Set(matches.map((m) => m.booking_id))]
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, client_name, booking_reference, booking_status, check_in, check_out, number_of_guests, single_rooms, double_rooms, triple_rooms, created_at')
        .in('id', bookingIds)
        .order('created_at', { ascending: false })

      if (!bookings) { setHistoryLoading(false); return }

      // 4. Merge hotel entries with booking info
      const history = matches.map((m) => ({
        booking: bookings.find((b) => b.id === m.booking_id),
        hotelEntry: m.hotelEntry,
      })).filter((h) => h.booking)
        .sort((a, b) => new Date(b.booking.created_at) - new Date(a.booking.created_at))

      setBookingHistory(history)
      setHistoryLoading(false)
    }

    load()
  }, [hotel])

  const handleSave = async (data) => {
    const next = items.map((i) => (i.id === hotel.id ? { ...i, ...data } : i))
    await saveReferenceData(next)
    setItems(next)
    setHotel({ ...hotel, ...data })
    setEditModal(false)
    setToast({ message: 'Hotel updated', type: 'success' })
  }

  // ── Side panel helpers ────────────────────────────────────────────────

  const openPanel = (item) => {
    panelDataRef.current = item
    setPanelData(item)
    setPanelEntry({ ...item.hotelEntry })
    setShowPanelTl(false)
    setPanelTlForm(EMPTY_PANEL_TL)
  }

  const closePanel = () => {
    setPanelClosing(true)
    setTimeout(() => {
      setPanelData(null)
      setPanelEntry(null)
      setPanelClosing(false)
      panelDataRef.current = null
    }, 220)
  }

  // Persist a hotel entry change to Supabase
  const persistEntry = async (bookingId, updatedEntry) => {
    const { data: rec } = await supabase
      .from('itinerary_rows')
      .select('*')
      .eq('booking_id', bookingId)
      .single()
    if (!rec) return
    const updatedHotels = (rec.rows?.hotels || []).map((h) =>
      h.id === updatedEntry.id ? updatedEntry : h
    )
    await supabase
      .from('itinerary_rows')
      .update({ rows: { ...rec.rows, hotels: updatedHotels } })
      .eq('booking_id', bookingId)
  }

  // Sync an updated entry back into bookingHistory state
  const syncHistory = (bookingId, updatedEntry) => {
    setBookingHistory((prev) => prev.map((item) =>
      item.booking.id === bookingId && item.hotelEntry.id === updatedEntry.id
        ? { ...item, hotelEntry: updatedEntry }
        : item
    ))
  }

  const savePanelDetails = async () => {
    setPanelSaving(true)
    const bkId = panelDataRef.current.booking.id
    await persistEntry(bkId, panelEntry)
    syncHistory(bkId, panelEntry)
    setPanelData((d) => ({ ...d, hotelEntry: panelEntry }))
    panelDataRef.current = { ...panelDataRef.current, hotelEntry: panelEntry }
    setPanelSaving(false)
    setToast({ message: 'Reservation updated', type: 'success' })
  }

  const panelAddEvent = async () => {
    const event = createTlEvent(panelTlForm.type, panelTlForm.method, panelTlForm.note, panelTlForm.ref)
    const updated = { ...panelEntry, timeline: [...(panelEntry.timeline || []), event] }
    const bkId = panelDataRef.current.booking.id
    setPanelEntry(updated)
    await persistEntry(bkId, updated)
    syncHistory(bkId, updated)
    setPanelTlForm(EMPTY_PANEL_TL)
    setShowPanelTl(false)
    setToast({ message: 'Event logged', type: 'success' })
  }

  const panelRemoveEvent = async (eventId) => {
    const updated = { ...panelEntry, timeline: (panelEntry.timeline || []).filter((e) => e.id !== eventId) }
    const bkId = panelDataRef.current.booking.id
    setPanelEntry(updated)
    await persistEntry(bkId, updated)
    syncHistory(bkId, updated)
  }

  const updatePanelDates = (field, value) => {
    setPanelEntry((prev) => {
      const next = { ...prev, [field]: value }
      next.nights = computeNights(next.checkin, next.checkout)
      return next
    })
  }

  const updatePanelPrice = (field, value) => {
    const bk = panelDataRef.current?.booking
    if (!bk) return
    setPanelEntry((prev) => {
      const next = { ...prev, [field]: value === '' ? '' : Number(value) }
      const s = Number(bk.single_rooms) || 0
      const d = Number(bk.double_rooms) || 0
      const t = Number(bk.triple_rooms) || 0
      const ps = next.price_single !== '' ? Number(next.price_single) : 0
      const pd = next.price_double !== '' ? Number(next.price_double) : 0
      const pt = next.price_triple !== '' ? Number(next.price_triple) : 0
      next.cost_per_night = s * ps + d * pd + t * pt
      return next
    })
  }

  // Stats derived from booking history
  const stats = {
    totalBookings: bookingHistory.length,
    totalNights: bookingHistory.reduce((sum, { hotelEntry }) => sum + (Number(hotelEntry.nights) || 0), 0),
    totalRevenue: bookingHistory.reduce((sum, { hotelEntry }) =>
      sum + (Number(hotelEntry.cost_per_night) || 0) * (Number(hotelEntry.nights) || 0), 0),
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-light)' }}>
        Loading...
      </div>
    )
  }

  if (notFound) {
    return (
      <>
        <div className="page-header">
          <div className="page-breadcrumb">
            <button className="crumb-link" onClick={() => navigate('/hotels')}>Hotels</button>
            <span className="crumb-sep">&rsaquo;</span>
            <span className="crumb-current">Not Found</span>
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/hotels')}>&larr; Back</button>
        </div>
        <div className="container" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-light)' }}>
          Hotel not found.
        </div>
      </>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div className="page-breadcrumb">
          <button className="crumb-link" onClick={() => navigate('/hotels')}>Hotels</button>
          <span className="crumb-sep">&rsaquo;</span>
          <span className="crumb-current">{hotel.name}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={() => setEditModal(true)}>Edit</button>
          <button className="btn btn-outline" onClick={() => navigate('/hotels')}>&larr; Back</button>
        </div>
      </div>

      <div className="container">
        {/* Hotel name + badges */}
        <div className="booking-card">
          <div className="bc-header">
            <div className="bc-header-left">
              <div className="bc-name">
                {hotel.name}
                {hotel.tier && tierStars(hotel.tier) && (
                  <span className="hl-card-stars" style={{ fontSize: '1.15rem' }}>{tierStars(hotel.tier)}</span>
                )}
              </div>
              <div className="bc-meta-line">
                {hotel.city && <span className="bc-meta-chip">{hotel.city}</span>}
                {hotel.tier && <span className="ht-tier-badge">{hotel.tier}</span>}
                {hotel.subcategory && <span className="ref-cat-badge ref-cat-hotel">{hotel.subcategory}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div className="hp-cards-grid">

          {/* Pricing card */}
          <div className="booking-card">
            <div className="hp-card-body">
              <div className="hp-card-title">Pricing</div>
              <div className="hp-prices-grid">
                <div className="hp-price-item">
                  <div className="hp-price-label">Single</div>
                  <div className="hp-price-value">{fmtPrice(hotel.price_single) || '—'}</div>
                </div>
                <div className="hp-price-item">
                  <div className="hp-price-label">Double</div>
                  <div className="hp-price-value">{fmtPrice(hotel.price_double) || '—'}</div>
                </div>
                <div className="hp-price-item">
                  <div className="hp-price-label">Triple</div>
                  <div className="hp-price-value">{fmtPrice(hotel.price_triple) || '—'}</div>
                </div>
              </div>
              <div className="hp-field">
                <div className="hp-field-label">Price Unit</div>
                <div className="hp-field-value">{hotel.price_unit || <span className="hp-field-empty">Not set</span>}</div>
              </div>
              {hotel.notes && (
                <div className="hp-field">
                  <div className="hp-field-label">Notes</div>
                  <div className="hp-field-value">{hotel.notes}</div>
                </div>
              )}
            </div>
          </div>

          {/* Supplier / Contact card */}
          <div className="booking-card">
            <div className="hp-card-body">
              <div className="hp-card-title">Supplier / Contact</div>
              <div className="hp-field">
                <div className="hp-field-label">Contact Person</div>
                <div className="hp-field-value">
                  {hotel.contact_person || <span className="hp-field-empty">Not set</span>}
                </div>
              </div>
              <div className="hp-field">
                <div className="hp-field-label">Email</div>
                <div className="hp-field-value">
                  {hotel.contact_email
                    ? <a href={`mailto:${hotel.contact_email}`}>{hotel.contact_email}</a>
                    : <span className="hp-field-empty">Not set</span>}
                </div>
              </div>
              <div className="hp-field">
                <div className="hp-field-label">Phone / WhatsApp</div>
                <div className="hp-field-value">
                  {hotel.contact_phone
                    ? <a href={`tel:${hotel.contact_phone}`}>{hotel.contact_phone}</a>
                    : <span className="hp-field-empty">Not set</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Terms card */}
          <div className="booking-card">
            <div className="hp-card-body">
              <div className="hp-card-title">Payment Terms</div>
              <div className="hp-field">
                <div className="hp-field-label">Default Deposit</div>
                <div className="hp-field-value">
                  {hotel.default_deposit_pct != null
                    ? `${hotel.default_deposit_pct}%`
                    : <span className="hp-field-empty">Not set</span>}
                </div>
              </div>
              <div className="hp-field">
                <div className="hp-field-label">Payment Terms</div>
                <div className="hp-field-value">
                  {hotel.payment_terms || <span className="hp-field-empty">Not set</span>}
                </div>
              </div>
              <div className="hp-field">
                <div className="hp-field-label">Cancellation Policy</div>
                <div className="hp-field-value">
                  {hotel.cancellation_policy || <span className="hp-field-empty">Not set</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Booking History ── */}
        <div className="hp-section-title">Booking History</div>

        {/* Stats strip */}
        {!historyLoading && bookingHistory.length > 0 && (
          <div className="hp-stats-strip">
            <div className="hp-stat">
              <div className="hp-stat-value">{stats.totalBookings}</div>
              <div className="hp-stat-label">Total Bookings</div>
            </div>
            <div className="hp-stat-divider" />
            <div className="hp-stat">
              <div className="hp-stat-value">{stats.totalNights}</div>
              <div className="hp-stat-label">Total Nights</div>
            </div>
            <div className="hp-stat-divider" />
            <div className="hp-stat">
              <div className="hp-stat-value">{fmtCost(stats.totalRevenue)}</div>
              <div className="hp-stat-label">Total Revenue</div>
            </div>
          </div>
        )}

        {/* Booking cards */}
        {historyLoading ? (
          <div className="hp-history-empty">Loading booking history...</div>
        ) : bookingHistory.length === 0 ? (
          <div className="hp-history-empty">No bookings yet for this hotel.</div>
        ) : (
          <div className="hp-history-list">
            {bookingHistory.map(({ booking, hotelEntry }, idx) => {
              const isCustom =
                (hotelEntry.price_single || 0) !== (hotel.price_single || 0) ||
                (hotelEntry.price_double || 0) !== (hotel.price_double || 0) ||
                (hotelEntry.price_triple || 0) !== (hotel.price_triple || 0)
              const roomParts = []
              if (Number(booking.single_rooms) > 0) roomParts.push(`${booking.single_rooms}× Single`)
              if (Number(booking.double_rooms) > 0) roomParts.push(`${booking.double_rooms}× Double`)
              if (Number(booking.triple_rooms) > 0) roomParts.push(`${booking.triple_rooms}× Triple`)
              const total = (hotelEntry.cost_per_night || 0) * (hotelEntry.nights || 0)

              return (
                <div
                  key={`${booking.id}-${idx}`}
                  className={`hp-booking-card hp-bc-status-${getHotelStatus(hotelEntry)}`}
                  onClick={() => openPanel({ booking, hotelEntry })}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && openPanel({ booking, hotelEntry })}
                >
                  {/* Hotel reservation status (derived from timeline) */}
                  <div className="hp-bc-col hp-bc-col-status">
                    <span className={`itin-status-badge status-${getHotelStatus(hotelEntry)}`}>
                      {HOTEL_STATUS_LABELS[getHotelStatus(hotelEntry)]}
                    </span>
                  </div>

                  {/* Name + ref */}
                  <div className="hp-bc-col hp-bc-col-name">
                    <div className="hp-bc-name">{booking.client_name || 'Unnamed'}</div>
                    {booking.booking_reference && (
                      <div className="hp-bc-ref">{booking.booking_reference}</div>
                    )}
                  </div>

                  {/* Dates + nights */}
                  <div className="hp-bc-col hp-bc-col-dates">
                    <div className="hp-bc-dates-val">
                      {fmtDate(hotelEntry.checkin)} → {fmtDate(hotelEntry.checkout)}
                    </div>
                    <div className="hp-bc-nights-val">
                      {hotelEntry.nights} {hotelEntry.nights === 1 ? 'night' : 'nights'}
                    </div>
                  </div>

                  {/* Guests */}
                  <div className="hp-bc-col hp-bc-col-guests">
                    {booking.number_of_guests > 0 && (
                      <div className="hp-bc-info-item">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        <span>{booking.number_of_guests}</span>
                      </div>
                    )}
                  </div>

                  {/* Room counts */}
                  <div className="hp-bc-col hp-bc-col-rooms">
                    {Number(booking.single_rooms) > 0 && <span className="hp-bc-room-count">{booking.single_rooms}× Single</span>}
                    {Number(booking.double_rooms) > 0 && <span className="hp-bc-room-count">{booking.double_rooms}× Double</span>}
                    {Number(booking.triple_rooms) > 0 && <span className="hp-bc-room-count">{booking.triple_rooms}× Triple</span>}
                  </div>

                  {/* Cost per night */}
                  <div className="hp-bc-col hp-bc-col-rate">
                    <span className="hp-bc-cost-value">{fmtCost(hotelEntry.cost_per_night)}/night</span>
                    {isCustom && <span className="ht-custom-badge">Custom price</span>}
                  </div>

                  {/* Total */}
                  <div className="hp-bc-col hp-bc-col-total">
                    <span className="hp-bc-total-val">{fmtCost(total)} Total</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editModal && (
        <ReferenceItemModal
          item={hotel}
          cities={cities.map((c) => c.name)}
          onClose={() => setEditModal(false)}
          onSave={handleSave}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}

      {/* ── Side Panel ── */}
      {panelData && panelEntry && (
        <>
          <div className={`hp-panel-backdrop${panelClosing ? ' hp-panel-backdrop-out' : ''}`} onClick={closePanel} />
          <div className={`hp-panel${panelClosing ? ' hp-panel-out' : ''}`}>

            {/* Header */}
            <div className="hp-panel-header">
              <div className="hp-panel-header-info">
                <div className="hp-panel-client">{panelData.booking.client_name || 'Unnamed'}</div>
                <button className="hp-panel-bk-link" onClick={() => navigate(`/bookings/${panelData.booking.booking_reference}`)}>
                  {panelData.booking.booking_reference}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </button>
              </div>
              <button className="hp-panel-close" onClick={closePanel} title="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="hp-panel-body">

              {/* ── Reservation Details ── */}
              <div className="hp-panel-section">
                <div className="hp-panel-section-title">Reservation Details</div>
                <div className="hp-panel-two-col">
                  <div className="hp-panel-field">
                    <label className="hp-panel-label">Check-in</label>
                    <input className="hp-panel-input" type="date" value={panelEntry.checkin || ''}
                      onChange={(e) => updatePanelDates('checkin', e.target.value)} />
                  </div>
                  <div className="hp-panel-field">
                    <label className="hp-panel-label">Check-out</label>
                    <input className="hp-panel-input" type="date" value={panelEntry.checkout || ''}
                      onChange={(e) => updatePanelDates('checkout', e.target.value)} />
                  </div>
                </div>
                <div className="hp-panel-nights-row">
                  <span>{panelEntry.nights} {panelEntry.nights === 1 ? 'night' : 'nights'}</span>
                  <span className="hp-panel-cost-label">{fmtCost(panelEntry.cost_per_night)} / night total</span>
                </div>
                <div className="hp-panel-three-col">
                  {[['price_single', 'Single'], ['price_double', 'Double'], ['price_triple', 'Triple']].map(([field, label]) => (
                    <div key={field} className="hp-panel-field">
                      <label className="hp-panel-label">{label} €</label>
                      <input className="hp-panel-input" type="number" min="0" placeholder="0"
                        value={panelEntry[field] ?? ''}
                        onChange={(e) => updatePanelPrice(field, e.target.value)} />
                    </div>
                  ))}
                </div>
                <div className="hp-panel-save-row">
                  <button className="btn btn-primary btn-sm" onClick={savePanelDetails} disabled={panelSaving}>
                    {panelSaving ? 'Saving…' : 'Save Details'}
                  </button>
                </div>
              </div>

              {/* ── Status Log ── */}
              <div className="hp-panel-section">
                <div className="hp-panel-tl-header">
                  <span className="hp-panel-section-title">Status Log</span>
                  {(panelEntry.timeline || []).length > 0 && (
                    <span className="ht-tl-staleness">
                      {fmtElapsedHP(panelEntry.timeline[panelEntry.timeline.length - 1].date, new Date().toISOString())} ago
                    </span>
                  )}
                  {getConfirmRef(panelEntry) && (
                    <span className="hp-panel-conf-ref">#{getConfirmRef(panelEntry)}</span>
                  )}
                  <button className="btn btn-outline btn-sm" title="Generate Message"
                    onClick={() => setPanelMsgOpen(true)}>
                    <TlMail />
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => { setShowPanelTl((v) => !v); setPanelTlForm(EMPTY_PANEL_TL) }}>
                    + Log
                  </button>
                </div>

                {showPanelTl && (
                  <div className="ht-timeline-form">
                    <div className="ht-tl-form-row">
                      <select className="tr-edit-input" value={panelTlForm.type}
                        onChange={(e) => setPanelTlForm((f) => ({ ...f, type: e.target.value }))}>
                        {PANEL_TL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <select className="tr-edit-input" value={panelTlForm.method}
                        onChange={(e) => setPanelTlForm((f) => ({ ...f, method: e.target.value }))}>
                        {PANEL_TL_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                      <input className="tr-edit-input" placeholder="Note (optional)" value={panelTlForm.note}
                        onChange={(e) => setPanelTlForm((f) => ({ ...f, note: e.target.value }))} />
                      <input className="tr-edit-input" placeholder="Ref # (optional)" value={panelTlForm.ref}
                        onChange={(e) => setPanelTlForm((f) => ({ ...f, ref: e.target.value }))}
                        style={{ maxWidth: 130 }} />
                    </div>
                    <div className="ht-tl-form-actions">
                      <button className="btn btn-success btn-sm" onClick={panelAddEvent}>Save</button>
                      <button className="btn btn-outline btn-sm" onClick={() => setShowPanelTl(false)}>Cancel</button>
                    </div>
                  </div>
                )}

                <div className="ht-timeline-events">
                  {(panelEntry.timeline || []).length === 0 ? (
                    <div className="ht-timeline-empty">No events logged yet.</div>
                  ) : (
                    (panelEntry.timeline || []).map((evt, idx, arr) => {
                      const typeInfo = PANEL_TL_TYPES.find((t) => t.value === evt.type) || PANEL_TL_TYPES[0]
                      const elapsed = idx > 0 ? fmtElapsedHP(arr[idx - 1].date, evt.date) : ''
                      return (
                        <div key={evt.id} className="ht-tl-event">
                          <span className="ht-tl-icon">{typeInfo.icon}</span>
                          <span className={`ht-tl-type ht-tl-type-${evt.type}`}>{typeInfo.label}</span>
                          <span className="ht-tl-method">{evt.method}</span>
                          {evt.note && <span className="ht-tl-note">{evt.note}</span>}
                          {evt.ref && <span className="ht-tl-ref">#{evt.ref}</span>}
                          <span className="ht-tl-date">
                            {fmtTimeline(evt.date)}
                            {elapsed && <span className="ht-tl-elapsed"> +{elapsed}</span>}
                          </span>
                          <button className="ht-tl-delete" title="Remove event"
                            onClick={() => panelRemoveEvent(evt.id)}>×</button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

            </div>
          </div>
        </>
      )}

      {/* Message modal (opened from panel) */}
      {panelMsgOpen && panelData && panelEntry && (
        <HotelMessageModal
          hotel={panelEntry}
          booking={panelData.booking}
          refHotel={hotel}
          onClose={() => setPanelMsgOpen(false)}
          onLogActivity={async (entryId, type, method, note) => {
            const event = createTlEvent(type, method, note)
            const updated = { ...panelEntry, timeline: [...(panelEntry.timeline || []), event] }
            setPanelEntry(updated)
            await persistEntry(panelDataRef.current.booking.id, updated)
            syncHistory(panelDataRef.current.booking.id, updated)
          }}
        />
      )}
    </>
  )
}
