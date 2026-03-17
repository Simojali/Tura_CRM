import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { generateBookingReference } from '../lib/constants'
import { loadItinerary, computeTotals, computeDays } from '../lib/itineraryUtils'
import { MOCK_BOOKINGS } from '../lib/mockData'
import { useAppContext } from '../lib/AppContext'
import NewBookingModal from '../components/NewBookingModal'
import Toast from '../components/Toast'
import { fmtCurrency, calcRemaining, fmtDay, fmtMon, paymentBadge } from '../lib/formatters'

// ── Icons ─────────────────────────────────────────────────────────────────────
const PeopleIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M1 12c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M10 5a1.5 1.5 0 0 0 0-3M11.5 9.5c1 .5 1.5 1.5 1.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)
const PlaneIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.5 19h19v1.5H2.5zM22 9.5c0-1.1-.9-2-2-2h-5.5L10 2H8l2.5 5.5H5L3.5 6H2l1 3.5L2 13h1.5L5 11.5h5.5L8 17h2l4.5-5.5H20c1.1 0 2-.9 2-2z"/>
  </svg>
)
const DotsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="4.5" r="1.3" fill="currentColor"/>
    <circle cx="9" cy="9" r="1.3" fill="currentColor"/>
    <circle cx="9" cy="13.5" r="1.3" fill="currentColor"/>
  </svg>
)
const NoteIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M4 5h6M4 7.5h6M4 10h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)
const RefIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M4 5h6M4 7.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)
const AgencyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <path d="M2 12V5.5L7 2l5 3.5V12" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <rect x="4.5" y="8" width="2" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
    <rect x="7.5" y="8" width="2" height="2.5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
)
const MountainIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M1 12L5.5 4.5L8 8L9.5 6L13 12H1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>
)
const WaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M1 7.5c1.3-2 2.7-2 4 0s2.7 2 4 0 2.7-2 4 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M1 10.5c1.3-2 2.7-2 4 0s2.7 2 4 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)
const BusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1.5" y="2" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M1.5 5.5h11" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="4" cy="11.5" r="1.1" stroke="currentColor" strokeWidth="1.2"/>
    <circle cx="10" cy="11.5" r="1.1" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M5 11.5h4" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
)
const CameraIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1" y="4" width="12" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="7" cy="8.2" r="2" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M4.5 4L5.5 2h3l1 2" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>
)

const ACTIVITY_ICONS = [MountainIcon, WaveIcon, BusIcon, CameraIcon]

// ── Skeleton card ─────────────────────────────────────────────────────────────
function BookingCardSkeleton() {
  return (
    <div className="bk-card bk-card-skel">
      <div className="bk-card-inner">
        <div className="bk-client">
          <div className="skel skel-name" />
          <div className="bk-chips"><div className="skel skel-chip" /></div>
          <div className="bk-chips"><div className="skel skel-chip2" /></div>
        </div>
        <div className="bk-vdiv" />
        <div className="bk-dates">
          <div className="bk-dates-row">
            <div className="skel skel-date" />
            <div style={{ width: 22, height: 22 }} className="skel" style={{ borderRadius: '50%', width: 22, height: 22 }} />
            <div className="skel skel-date" />
          </div>
        </div>
        <div className="bk-vdiv" />
        <div className="bk-section" style={{ minWidth: 110 }}>
          <div className="skel skel-label" />
          <div className="skel skel-val" />
        </div>
        <div className="bk-vdiv" />
        <div className="bk-section" style={{ minWidth: 120 }}>
          <div className="skel skel-label" />
          <div className="skel skel-badge" />
        </div>
        <div className="bk-vdiv" />
        <div className="bk-section" style={{ minWidth: 190 }}>
          <div className="bk-balance-row">
            <div>
              <div className="skel skel-label" />
              <div className="skel skel-bal" />
            </div>
            <div className="bk-balance-sep" />
            <div>
              <div className="skel skel-label" />
              <div className="skel skel-badge" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [bookings,    setBookings]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [toast,       setToast]       = useState(null)
  const [noteOpen,    setNoteOpen]    = useState(null)   // bookingId with note popover open
  const [menuOpen,    setMenuOpen]    = useState(null)   // bookingId with dots menu open
  const [noteText,    setNoteText]    = useState('')
  const [noteSaving,  setNoteSaving]  = useState(false)
  const navigate = useNavigate()
  const { setBookingCount } = useAppContext()

  // Pre-compute cost/person for all bookings (async — itinerary now comes from Supabase)
  const [costMap, setCostMap] = useState({})
  useEffect(() => {
    if (!bookings.length) return
    async function buildCostMap() {
      const map = {}
      for (const b of bookings) {
        const loaded = await loadItinerary(b.id)
        const rows = loaded?.rows || []
        const contracts = loaded?.contracts || []
        map[b.id] = computeTotals(rows, b, contracts).costPerPerson
      }
      setCostMap(map)
    }
    buildCostMap()
  }, [bookings])

  // Close all menus on outside click
  useEffect(() => {
    const handler = () => { setMenuOpen(null); setNoteOpen(null) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    if (!isSupabaseConfigured) {
      setBookings(MOCK_BOOKINGS)
      setBookingCount(MOCK_BOOKINGS.length)
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      setToast({ message: 'Error loading bookings', type: 'error' })
    } else {
      setBookings(data || [])
      setBookingCount(data?.length || 0)
    }
    setLoading(false)
  }, [setBookingCount])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  const handleCreateBooking = async (formData) => {
    const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true })
    const booking_reference = generateBookingReference(formData.provider, (count || 0) + 1)
    const payload = {
      ...formData, booking_reference,
      number_of_guests: Number(formData.number_of_guests) || 0,
      number_of_days: (() => {
        const days = computeDays(formData)
        return days > 0 ? days : (formData.number_of_days === '' ? null : Number(formData.number_of_days))
      })(),
      single_rooms:    Number(formData.single_rooms)  || 0,
      double_rooms:    Number(formData.double_rooms)  || 0,
      triple_rooms:    Number(formData.triple_rooms)  || 0,
      unite_price_eur: formData.unite_price_eur === '' ? null : Number(formData.unite_price_eur),
      group_price_eur: formData.group_price_eur === '' ? null : Number(formData.group_price_eur),
      group_price_mad: formData.group_price_mad === '' ? null : Number(formData.group_price_mad),
      paid:            formData.paid            === '' ? 0    : Number(formData.paid),
      check_in:        formData.check_in  || null,
      check_out:       formData.check_out || null,
    }
    const { error } = await supabase.from('bookings').insert([payload])
    if (error) {
      setToast({ message: 'Error creating booking: ' + error.message, type: 'error' })
      throw error
    }
    setShowModal(false)
    setToast({ message: 'Booking created successfully', type: 'success' })
    fetchBookings()
  }

  const handleNoteOpen = (e, b) => {
    e.stopPropagation()
    setNoteText(b.special_request || '')
    setNoteOpen(noteOpen === b.id ? null : b.id)
    setMenuOpen(null)
  }

  const handleSaveNote = async (e, bookingId) => {
    e.stopPropagation()
    setNoteSaving(true)
    if (isSupabaseConfigured) {
      await supabase.from('bookings').update({ special_request: noteText }).eq('id', bookingId)
    }
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, special_request: noteText } : b))
    setNoteSaving(false)
    setNoteOpen(null)
    setToast({ message: 'Note saved', type: 'success' })
  }

  const handleDeleteBooking = async (e, bookingId) => {
    e.stopPropagation()
    setMenuOpen(null)
    if (!window.confirm('Delete this booking? This cannot be undone.')) return
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('bookings').delete().eq('id', bookingId)
      if (error) { setToast({ message: 'Error deleting booking', type: 'error' }); return }
    }
    setBookings(prev => prev.filter(b => b.id !== bookingId))
    setToast({ message: 'Booking deleted', type: 'success' })
  }

  return (
    <>
      <div className="page-header">
        <h2>Bookings</h2>
        <button className="btn btn-success" onClick={() => setShowModal(true)}>
          + New Booking
        </button>
      </div>

      <div className="container">
      <div className="booking-list" style={{ padding: 0, maxWidth: 1120, margin: '0 auto' }}>
        {loading ? (
          [1,2,3].map((n) => <BookingCardSkeleton key={n} />)
        ) : bookings.length === 0 ? (
          <div className="loading">No bookings yet. Click "+ New Booking" to get started.</div>
        ) : (
          bookings.map((b) => {
            const badge        = paymentBadge(b)
            const remaining    = calcRemaining(b)
            const isZero       = remaining <= 0
            const costPerPerson = costMap[b.id] || 0

            return (
              <div key={b.id} className="bk-card" style={{ zIndex: (noteOpen === b.id || menuOpen === b.id) ? 10 : 'auto' }} onClick={() => navigate(`/bookings/${b.id}`)}>
                <div className="bk-card-inner">

                  {/* Client */}
                  <div className="bk-client">
                    <div className="bk-client-name">{b.client_name}</div>
                    <div className="bk-chips">
                      <span className="bk-chip" title="Number of guests"><PeopleIcon /> {b.number_of_guests} {b.number_of_guests === 1 ? 'Guest' : 'Guests'}</span>
                      <span className="bk-chip" title="Booking reference"><RefIcon /> {b.booking_reference}</span>
                    </div>
                    {b.agency_reference && (
                      <div className="bk-chips" style={{ marginBottom: '0.4rem' }}>
                        <span className="bk-chip" title="Agency reference"><AgencyIcon /> {b.agency_reference}</span>
                      </div>
                    )}
                  </div>

                  <div className="bk-vdiv" />

                  {/* Dates */}
                  <div className="bk-dates">
                    <div className="bk-dates-row">
                      <div className="bk-date-block" title="Check-in date">
                        <div className="bk-date-day">{fmtDay(b.check_in)}</div>
                        <div className="bk-date-mon">{fmtMon(b.check_in)}</div>
                      </div>
                      <div className="bk-date-arrow">
                        <PlaneIcon />
                      </div>
                      <div className="bk-date-block" title="Check-out date">
                        <div className="bk-date-day">{fmtDay(b.check_out)}</div>
                        <div className="bk-date-mon">{fmtMon(b.check_out)}</div>
                      </div>
                    </div>
                    {(() => {
                      const days = computeDays(b)
                      return days > 1 ? <div className="bk-date-nights">{days} days</div> : null
                    })()}
                  </div>

                  <div className="bk-vdiv" />

                  {/* Cost per person (NET, calculated from itinerary) */}
                  <div className="bk-section" style={{ minWidth: 110 }}>
                    <div className="bk-section-label">Cost / person</div>
                    <div className="bk-cost-value">
                      {costPerPerson > 0 ? fmtCurrency(costPerPerson) : <span className="bk-cost-empty">—</span>}
                    </div>
                  </div>

                  <div className="bk-vdiv" />

                  {/* Booking Status */}
                  <div className="bk-section" style={{ minWidth: 120 }}>
                    <div className="bk-section-label">Status</div>
                    <span className={`bk-status-badge bk-status-badge-${(b.booking_status || 'pending').toLowerCase()}`}>
                      {b.booking_status || 'Pending'}
                    </span>
                  </div>

                  <div className="bk-vdiv" />

                  {/* Balance */}
                  <div className="bk-section" style={{ minWidth: 190 }}>
                    <div className="bk-balance-row">
                      <div className="bk-balance-item">
                        <span className="bk-balance-sublabel">Remaining balance</span>
                        <div className="bk-balance">
                          <span className={`bk-balance-dot ${isZero ? 'bk-balance-dot-zero' : 'bk-balance-dot-primary'}`} />
                          <span className={`bk-balance-amount ${isZero ? 'bk-balance-amount-zero' : 'bk-balance-amount-primary'}`}>
                            {fmtCurrency(remaining)}
                          </span>
                        </div>
                      </div>
                      <div className="bk-balance-sep" />
                      <div className="bk-balance-item">
                        <span className="bk-balance-sublabel">Payment</span>
                        <span className={badge.cls}>{badge.label}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="bk-actions" style={{ zIndex: (noteOpen === b.id || menuOpen === b.id) ? 300 : 'auto' }} onClick={e => e.stopPropagation()}>

                    {/* Note button + popover */}
                    <div style={{ position: 'relative' }}>
                      <button className="bk-note-btn" onClick={e => handleNoteOpen(e, b)}>
                        {b.special_request ? <><NoteIcon /> View note</> : '+ Add note'}
                      </button>
                      {noteOpen === b.id && (
                        <div className="bk-note-popover" onMouseDown={e => e.stopPropagation()}>
                          <div className="bk-note-popover-title">
                            {b.special_request ? 'Note' : 'Add note'}
                          </div>
                          <textarea
                            className="bk-note-textarea"
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            placeholder="Write a note…"
                            rows={3}
                            autoFocus
                          />
                          <div className="bk-note-popover-footer">
                            <button className="bk-note-cancel" onClick={() => setNoteOpen(null)}>
                              Cancel
                            </button>
                            <button
                              className="bk-note-save"
                              onClick={e => handleSaveNote(e, b.id)}
                              disabled={noteSaving}
                            >
                              {noteSaving ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Dots button + dropdown menu */}
                    <div style={{ position: 'relative' }}>
                      <button
                        className="bk-dots-btn"
                        onClick={e => {
                          e.stopPropagation()
                          setMenuOpen(menuOpen === b.id ? null : b.id)
                          setNoteOpen(null)
                        }}
                      >
                        <DotsIcon />
                      </button>
                      {menuOpen === b.id && (
                        <div className="bk-dots-menu" onMouseDown={e => e.stopPropagation()}>
                          <button
                            className="bk-dots-menu-item"
                            onClick={e => { e.stopPropagation(); navigate(`/bookings/${b.id}?edit=true`) }}
                          >
                            Edit booking
                          </button>
                          <div className="bk-dots-menu-divider" />
                          <button
                            className="bk-dots-menu-item bk-dots-menu-danger"
                            onClick={e => handleDeleteBooking(e, b.id)}
                          >
                            Delete booking
                          </button>
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              </div>
            )
          })
        )}
      </div>
      </div>

      {showModal && (
        <NewBookingModal onClose={() => setShowModal(false)} onCreated={handleCreateBooking} />
      )}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </>
  )
}
