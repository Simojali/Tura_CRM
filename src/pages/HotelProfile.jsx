import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadReferenceData, saveReferenceData, loadCities } from '../lib/referenceData'
import { supabase } from '../lib/supabase'
import { fmtDate, fmtCost, statusClass } from '../lib/formatters'
import ReferenceItemModal from '../components/ReferenceItemModal'
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
        .select('id, client_name, booking_reference, booking_status, check_in, check_out, number_of_guests, single_rooms, double_rooms, triple_rooms')
        .in('id', bookingIds)
        .order('check_in', { ascending: false })

      if (!bookings) { setHistoryLoading(false); return }

      // 4. Merge hotel entries with booking info
      const history = matches.map((m) => ({
        booking: bookings.find((b) => b.id === m.booking_id),
        hotelEntry: m.hotelEntry,
      })).filter((h) => h.booking)
        .sort((a, b) => new Date(b.booking.check_in) - new Date(a.booking.check_in))

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
              <div className="bc-name">{hotel.name}</div>
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
                  onClick={() => navigate(`/bookings/${booking.booking_reference}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/bookings/${booking.booking_reference}`)}
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
    </>
  )
}
