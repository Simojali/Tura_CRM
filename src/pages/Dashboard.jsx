import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { generateReferenciaRuta } from '../lib/constants'
import { MOCK_BOOKINGS } from '../lib/mockData'
import NewBookingModal from '../components/NewBookingModal'
import Toast from '../components/Toast'

const isSupabaseConfigured = !import.meta.env.VITE_SUPABASE_URL?.includes('your-project')

// ── Icons ─────────────────────────────────────────────────────────────────────
const PeopleIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M1 12c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M10 5a1.5 1.5 0 0 0 0-3M11.5 9.5c1 .5 1.5 1.5 1.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)
const PlaneIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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

// ── Helpers ───────────────────────────────────────────────────────────────────
const getPaymentBadge = (b) => {
  if (b.reserv_status === 'Cancelled') return { label: 'Cancelled', cls: 'bk-badge bk-badge-cancelled' }
  if (b.reserv_status === 'Passed')    return { label: 'Passed',    cls: 'bk-badge bk-badge-passed' }
  const total = Number(b.group_price_eur) || 0
  const paid  = Number(b.paid) || 0
  if (total === 0)    return { label: 'No price',       cls: 'bk-badge bk-badge-passed' }
  if (paid >= total)  return { label: 'Full paid',      cls: 'bk-badge bk-badge-full' }
  if (paid > 0)       return { label: 'Partially paid', cls: 'bk-badge bk-badge-partial' }
  return                     { label: 'Not paid',       cls: 'bk-badge bk-badge-notpaid' }
}

const fmtDay = (d) => d ? new Date(d).getDate() : '—'
const fmtMon = (d) => d ? new Date(d).toLocaleDateString('en-GB', { month: 'short' }) : ''
const fmtCurrency = (v) =>
  v == null ? '—' : `€${Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

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
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  const handleCreateBooking = async (formData) => {
    const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true })
    const referencia_ruta = generateReferenciaRuta(formData.proveedor, (count || 0) + 1)
    const payload = {
      ...formData, referencia_ruta,
      number_of_guests: Number(formData.number_of_guests) || 0,
      n_dias: (() => {
        if (formData.check_in && formData.check_out) {
          const diff = (new Date(formData.check_out) - new Date(formData.check_in)) / (1000 * 60 * 60 * 24)
          return diff > 0 ? diff : null
        }
        return formData.n_dias === '' ? null : Number(formData.n_dias)
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
          <div className="loading">Loading bookings…</div>
        ) : bookings.length === 0 ? (
          <div className="loading">No bookings yet. Click "+ New Booking" to get started.</div>
        ) : (
          bookings.map((b) => {
            const badge     = getPaymentBadge(b)
            const remaining = (Number(b.group_price_eur) || 0) - (Number(b.paid) || 0)
            const isZero    = remaining <= 0

            return (
              <div key={b.id} className="bk-card" style={{ zIndex: (noteOpen === b.id || menuOpen === b.id) ? 10 : 'auto' }} onClick={() => navigate(`/bookings/${b.id}`)}>
                <div className="bk-card-inner">

                  {/* Client */}
                  <div className="bk-client">
                    <div className="bk-client-name">{b.client_name}</div>
                    <div className="bk-chips">
                      <span className="bk-chip"><PeopleIcon /> {b.number_of_guests} {b.number_of_guests === 1 ? 'Guest' : 'Guests'}</span>
                      <span className="bk-chip"><RefIcon /> {b.referencia_ruta}</span>
                    </div>
                    <span className={badge.cls}>{badge.label}</span>
                  </div>

                  <div className="bk-vdiv" />

                  {/* Dates */}
                  <div className="bk-dates">
                    <div className="bk-date-block">
                      <div className="bk-date-day">{fmtDay(b.check_in)}</div>
                      <div className="bk-date-mon">{fmtMon(b.check_in)}</div>
                    </div>
                    <div className="bk-date-arrow">
                      <div className="bk-date-arrow-line" />
                      <PlaneIcon />
                      <div className="bk-date-arrow-line" />
                    </div>
                    <div className="bk-date-block">
                      <div className="bk-date-day">{fmtDay(b.check_out)}</div>
                      <div className="bk-date-mon">{fmtMon(b.check_out)}</div>
                    </div>
                  </div>

                  <div className="bk-vdiv" />

                  {/* Activities */}
                  <div className="bk-section">
                    <div className="bk-section-label">Activities</div>
                    <div className="bk-activities-icons">
                      {ACTIVITY_ICONS.map((Icon, i) => (
                        <span key={i} className="bk-act-icon"><Icon /></span>
                      ))}
                    </div>
                  </div>

                  <div className="bk-vdiv" />

                  {/* Booking Status */}
                  <div className="bk-section" style={{ minWidth: 120 }}>
                    <div className="bk-section-label">Status</div>
                    <span className={`bk-status-badge bk-status-badge-${(b.reserv_status || 'pending').toLowerCase()}`}>
                      {b.reserv_status || 'Pending'}
                    </span>
                  </div>

                  <div className="bk-vdiv" />

                  {/* Balance */}
                  <div className="bk-section" style={{ minWidth: 190 }}>
                    <div className="bk-section-label">Balance</div>
                    <div className="bk-balance-row">
                      <div className="bk-balance-item">
                        <span className="bk-balance-sublabel">Paid</span>
                        <span className="bk-balance-paid">{fmtCurrency(b.paid)}</span>
                      </div>
                      <div className="bk-balance-sep" />
                      <div className="bk-balance-item">
                        <span className="bk-balance-sublabel">Remaining</span>
                        <div className="bk-balance">
                          <span className={`bk-balance-dot ${isZero ? 'bk-balance-dot-zero' : 'bk-balance-dot-primary'}`} />
                          <span className={`bk-balance-amount ${isZero ? 'bk-balance-amount-zero' : 'bk-balance-amount-primary'}`}>
                            {fmtCurrency(remaining)}
                          </span>
                        </div>
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
                            onClick={() => navigate(`/bookings/${b.id}`)}
                          >
                            Open booking
                          </button>
                          <button
                            className="bk-dots-menu-item"
                            onClick={e => handleNoteOpen(e, b)}
                          >
                            {b.special_request ? 'Edit note' : 'Add note'}
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
