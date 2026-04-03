import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadReferenceData, saveReferenceData, loadCities } from '../lib/referenceData'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { fmtDate, fmtCost } from '../lib/formatters'
import ReferenceItemModal from '../components/ReferenceItemModal'
import Toast from '../components/Toast'

const slugify = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const fmtPrice = (v) =>
  v != null
    ? `€${Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : null

const STATUS_LABELS = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  draft: 'Draft',
}

export default function TransferProfile() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [items, setItems] = useState([])
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [toast, setToast] = useState(null)
  const [cities, setCities] = useState([])
  const [bookingHistory, setBookingHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)

  useEffect(() => {
    loadReferenceData().then((data) => {
      setItems(data)
      const found = data.find((i) => i.category === 'transfer' && slugify(i.name) === id)
      if (found) {
        setItem(found)
      } else {
        setNotFound(true)
      }
      setLoading(false)
    })
    loadCities().then((data) => setCities(data))
  }, [id])

  // Fetch booking history once item is loaded
  useEffect(() => {
    if (!item || !isSupabaseConfigured) { setHistoryLoading(false); return }

    const fetchHistory = async () => {
      setHistoryLoading(true)
      const { data: itinRows } = await supabase
        .from('itinerary_rows')
        .select('booking_id, rows')

      if (!itinRows) { setHistoryLoading(false); return }

      // Find all (bookingId, transferEntry, date) matching this transfer name
      const matches = []
      itinRows.forEach((rec) => {
        const days = rec.rows?.rows || []
        days.forEach((day) => {
          ;(day.transfers || []).forEach((t) => {
            if (t.name === item.name) {
              matches.push({ bookingId: rec.booking_id, transferEntry: t, date: day.date })
            }
          })
        })
      })

      if (matches.length === 0) { setHistoryLoading(false); return }

      const bookingIds = [...new Set(matches.map((m) => m.bookingId))]
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, client_name, booking_reference, number_of_guests, check_in, check_out, created_at')
        .in('id', bookingIds)

      if (!bookings) { setHistoryLoading(false); return }

      const bookingMap = Object.fromEntries(bookings.map((b) => [b.id, b]))

      const history = matches
        .map((m) => ({ booking: bookingMap[m.bookingId], transferEntry: m.transferEntry, date: m.date }))
        .filter((h) => h.booking)
        .sort((a, b) => new Date(b.booking.created_at) - new Date(a.booking.created_at))

      setBookingHistory(history)
      setHistoryLoading(false)
    }

    fetchHistory()
  }, [item])

  const stats = useMemo(() => {
    const totalBookings = bookingHistory.length
    const totalRevenue = bookingHistory.reduce((sum, { transferEntry }) => sum + (Number(transferEntry.cost) || 0), 0)
    return { totalBookings, totalRevenue }
  }, [bookingHistory])

  const handleSave = async (data) => {
    const next = items.map((i) => (i.id === item.id ? { ...i, ...data } : i))
    await saveReferenceData(next)
    setItems(next)
    setItem({ ...item, ...data })
    setEditModal(false)
    setToast({ message: 'Transfer updated', type: 'success' })
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
            <button className="crumb-link" onClick={() => navigate('/transfers')}>Transfers</button>
            <span className="crumb-sep">&rsaquo;</span>
            <span className="crumb-current">Not Found</span>
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/transfers')}>&larr; Back</button>
        </div>
        <div className="container" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-light)' }}>
          Transfer not found.
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page-header">
        <div className="page-breadcrumb">
          <button className="crumb-link" onClick={() => navigate('/transfers')}>Transfers</button>
          <span className="crumb-sep">&rsaquo;</span>
          <span className="crumb-current">{item.name}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={() => setEditModal(true)}>Edit</button>
          <button className="btn btn-outline" onClick={() => navigate('/transfers')}>&larr; Back</button>
        </div>
      </div>

      <div className="container">
        {/* Name + badges */}
        <div className="booking-card">
          <div className="bc-header">
            <div className="bc-header-left">
              <div className="bc-name">{item.name}</div>
              <div className="bc-meta-line">
                {item.subcategory && <span className="ref-cat-badge ref-cat-transfer">{item.subcategory}</span>}
                {item.city && <span className="bc-meta-chip">{item.city}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div className="hp-cards-grid">
          <div className="booking-card">
            <div className="hp-card-body">
              <div className="hp-card-title">Pricing &amp; Details</div>
              <div className="hp-prices-grid">
                <div className="hp-price-item">
                  <div className="hp-price-label">Individual Price</div>
                  <div className="hp-price-value">{fmtPrice(item.price) || '—'}</div>
                </div>
                {item.group_price != null && (
                  <div className="hp-price-item">
                    <div className="hp-price-label">Group Price</div>
                    <div className="hp-price-value">{fmtPrice(item.group_price)}</div>
                  </div>
                )}
                {item.capacity != null && (
                  <div className="hp-price-item">
                    <div className="hp-price-label">Capacity</div>
                    <div className="hp-price-value">{item.capacity} pax</div>
                  </div>
                )}
              </div>
              <div className="hp-field">
                <div className="hp-field-label">Price Unit</div>
                <div className="hp-field-value">{item.price_unit || <span className="hp-field-empty">Not set</span>}</div>
              </div>
              {item.notes && (
                <div className="hp-field">
                  <div className="hp-field-label">Notes</div>
                  <div className="hp-field-value">{item.notes}</div>
                </div>
              )}
            </div>
          </div>

          <div className="booking-card">
            <div className="hp-card-body">
              <div className="hp-card-title">Supplier / Contact</div>
              <div className="hp-field">
                <div className="hp-field-label">Contact Person</div>
                <div className="hp-field-value">
                  {item.contact_person || <span className="hp-field-empty">Not set</span>}
                </div>
              </div>
              <div className="hp-field">
                <div className="hp-field-label">Email</div>
                <div className="hp-field-value">
                  {item.contact_email
                    ? <a href={`mailto:${item.contact_email}`}>{item.contact_email}</a>
                    : <span className="hp-field-empty">Not set</span>}
                </div>
              </div>
              <div className="hp-field">
                <div className="hp-field-label">Phone / WhatsApp</div>
                <div className="hp-field-value">
                  {item.contact_phone
                    ? <a href={`tel:${item.contact_phone}`}>{item.contact_phone}</a>
                    : <span className="hp-field-empty">Not set</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Booking History */}
        <div className="hp-section-title">Booking History</div>

        {!historyLoading && bookingHistory.length > 0 && (
          <div className="hp-stats-strip">
            <div className="hp-stat">
              <div className="hp-stat-value">{stats.totalBookings}</div>
              <div className="hp-stat-label">Total Bookings</div>
            </div>
            <div className="hp-stat-divider" />
            <div className="hp-stat">
              <div className="hp-stat-value">{fmtCost(stats.totalRevenue)}</div>
              <div className="hp-stat-label">Total Revenue</div>
            </div>
          </div>
        )}

        {historyLoading ? (
          <div className="hp-history-empty">Loading booking history...</div>
        ) : bookingHistory.length === 0 ? (
          <div className="hp-history-empty">No bookings yet for this transfer.</div>
        ) : (
          <div className="hp-history-list">
            {bookingHistory.map(({ booking, transferEntry, date }, idx) => (
              <div
                key={`${booking.id}-${idx}`}
                className={`hp-booking-card hp-bc-status-${transferEntry.status || 'draft'}`}
                onClick={() => navigate(`/bookings/${booking.booking_reference}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/bookings/${booking.booking_reference}`)}
              >
                {/* Status */}
                <div className="hp-bc-col hp-bc-col-status">
                  <span className={`itin-status-badge status-${transferEntry.status || 'draft'}`}>
                    {STATUS_LABELS[transferEntry.status] || 'Draft'}
                  </span>
                </div>

                {/* Client name + ref */}
                <div className="hp-bc-col hp-bc-col-name">
                  <div className="hp-bc-name">{booking.client_name || 'Unnamed'}</div>
                  {booking.booking_reference && (
                    <div className="hp-bc-ref">{booking.booking_reference}</div>
                  )}
                </div>

                {/* Date */}
                <div className="hp-bc-col hp-bc-col-dates">
                  <div className="hp-bc-dates-val">{fmtDate(date)}</div>
                  <div className="hp-bc-nights-val">
                    {transferEntry.is_arrival && 'Arrival'}
                    {transferEntry.is_departure && 'Departure'}
                    {!transferEntry.is_arrival && !transferEntry.is_departure && 'Transfer'}
                    {transferEntry.time ? ` · ${transferEntry.time}` : ''}
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

                {/* Cost */}
                <div className="hp-bc-col hp-bc-col-rate">
                  <span className="hp-bc-cost-value">{fmtCost(transferEntry.cost)}</span>
                </div>

                {/* Driver info if set */}
                <div className="hp-bc-col hp-bc-col-total">
                  {transferEntry.driver_name
                    ? <span className="hp-bc-total-val">{transferEntry.driver_name}</span>
                    : <span style={{ color: 'var(--color-text-light)', fontSize: '0.8rem' }}>No driver</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editModal && (
        <ReferenceItemModal
          item={item}
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
