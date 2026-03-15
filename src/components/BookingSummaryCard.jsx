import { useState } from 'react'

// ── Inline SVG icons ─────────────────────────────────────────────────────────
const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1" y="2" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M1 5.5h12" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M4.5 1v2M9.5 1v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)
const BedIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M1 9.5V7A1.5 1.5 0 0 1 2.5 5.5h9A1.5 1.5 0 0 1 13 7v2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <rect x="1" y="9.5" width="12" height="2" rx="0.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M1 8.5V5a1 1 0 0 1 1-1h2v4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <rect x="5.5" y="5.5" width="3" height="2.5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
)
const PlaneIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M12.5 1.5L1.5 5.5l3.5 1.5 1 4 2-3L12.5 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>
)
const BuildingIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="2" y="1.5" width="10" height="11" rx="1" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M5 5h1M8 5h1M5 8h1M8 8h1M5 11h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)
const NoteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M4 5h6M4 7.5h6M4 10h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)
const UsersIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="5" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M1 12c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M10.5 5.5a2 2 0 0 0 0-3M11.5 9c1.2.5 2 1.7 2 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)
const RefIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M4 5h6M4 7.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

// ── Component ─────────────────────────────────────────────────────────────────
export default function BookingSummaryCard({ booking, onEdit }) {
  const [expanded, setExpanded] = useState(false)

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatCurrency = (val) => {
    if (val == null || val === '') return '—'
    return Number(val).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const getStatusClass = (status) => {
    switch (status) {
      case 'Confirmed': return 'status-confirmed'
      case 'Pending':   return 'status-pending'
      case 'Passed':    return 'status-passed'
      default:          return ''
    }
  }

  const buildRoomsLabel = () => {
    const parts = []
    if (booking.single_rooms > 0) parts.push(`${booking.single_rooms} Single`)
    if (booking.double_rooms > 0) parts.push(`${booking.double_rooms} Double`)
    if (booking.triple_rooms > 0) parts.push(`${booking.triple_rooms} Triple`)
    return parts.length > 0 ? parts.join(', ') + ' Rooms' : null
  }

  const remaining = (Number(booking.group_price_eur) || 0) - (Number(booking.paid) || 0)
  const remainingClass =
    remaining === 0 ? 'remaining-zero' : remaining > 0 ? 'remaining-positive' : ''

  return (
    <div className="booking-card">

      {/* ── Header ── */}
      <div className="bc-header">
        <div className="bc-header-left">
          <div className="bc-name">{booking.client_name}</div>
          <div className="bc-meta-line">
            <span className="bc-meta-chip"><UsersIcon /> {booking.number_of_guests} {booking.number_of_guests === 1 ? 'Guest' : 'Guests'}</span>
            <span className="bc-meta-chip"><RefIcon /> {booking.referencia_ruta}</span>
            <span className={`status-badge ${getStatusClass(booking.reserv_status)}`}>
              {booking.reserv_status}
            </span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={onEdit}>Edit</button>
      </div>

      {/* ── Info Grid — always visible, 2 rows × 4 cols ── */}
      <div className="bc-info-grid">
        {/* Row 1 — with icons */}
        <div className="bc-info-cell">
          <div className="bc-info-label">Check In & Out</div>
          <div className="bc-info-value">
            <CalendarIcon /> {formatDate(booking.check_in)} → {formatDate(booking.check_out)}
          </div>
        </div>
        <div className="bc-info-cell">
          <div className="bc-info-label">Provider</div>
          <div className={`bc-info-value${!booking.proveedor ? ' bc-info-empty' : ''}`}>
            <BuildingIcon /> {booking.proveedor || '—'}
          </div>
        </div>
        <div className="bc-info-cell">
          <div className="bc-info-label">Rooms</div>
          <div className={`bc-info-value${!buildRoomsLabel() ? ' bc-info-empty' : ''}`}>
            <BedIcon /> {buildRoomsLabel() || '—'}
          </div>
        </div>
        <div className="bc-info-cell">
          <div className="bc-info-label">Flight</div>
          <div className={`bc-info-value${!booking.flight_number ? ' bc-info-empty' : ''}`}>
            <PlaneIcon /> {booking.flight_number ? (
              <>{booking.flight_number}{booking.flight_hour ? ` • ${booking.flight_hour}` : ''}</>
            ) : '—'}
          </div>
        </div>

      </div>

      {/* ── Collapsible: Payment + Note ── */}
      <div className={`booking-card-collapse ${expanded ? 'open' : ''}`}>
        <div className="bc-expand-inner">

          {/* Row 2 — text only */}
          <div className="bc-info-grid bc-info-grid--row2">
            <div className="bc-info-cell">
              <div className="bc-info-label">Duration</div>
              <div className={`bc-info-value bc-info-value--plain${!booking.n_dias ? ' bc-info-empty' : ''}`}>
                {booking.n_dias ? `${booking.n_dias} Days` : '—'}
              </div>
            </div>
            <div className="bc-info-cell">
              <div className="bc-info-label">Hotel Type</div>
              <div className={`bc-info-value bc-info-value--plain${!booking.type_of_hotels ? ' bc-info-empty' : ''}`}>
                {booking.type_of_hotels || '—'}
              </div>
            </div>
            <div className="bc-info-cell">
              <div className="bc-info-label">Agency Ref</div>
              <div className={`bc-info-value bc-info-value--plain${!booking.referencia_agencia ? ' bc-info-empty' : ' bc-info-link'}`}>
                {booking.referencia_agencia || '—'}
              </div>
            </div>
            <div className="bc-info-cell">
              <div className="bc-info-label">Contact Phone</div>
              <div className={`bc-info-value bc-info-value--plain${!booking.telefono ? ' bc-info-empty' : ''}`}>
                {booking.telefono || '—'}
              </div>
            </div>
          </div>

          {/* Payment row */}
          <div className="bc-payment-grid">
            <div className="bc-pay-cell">
              <div className="bc-pay-label">Group Price (EUR)</div>
              <div className="bc-pay-value">{booking.group_price_eur ? `${formatCurrency(booking.group_price_eur)} EUR` : '—'}</div>
              {booking.group_price_mad ? (
                <div className="bc-pay-sub">{formatCurrency(booking.group_price_mad)} MAD</div>
              ) : null}
            </div>
            <div className="bc-pay-cell">
              <div className="bc-pay-label">Paid Amount</div>
              <div className="bc-pay-value">{formatCurrency(booking.paid)} EUR</div>
              {booking.unite_price_eur ? (
                <div className="bc-pay-sub">Unit Price: {formatCurrency(booking.unite_price_eur)} EUR</div>
              ) : null}
            </div>
            <div className="bc-pay-cell">
              <div className="bc-pay-label">Remaining Balance</div>
              <div className={`bc-pay-value ${remainingClass}`}>{formatCurrency(remaining)} EUR</div>
              {remaining > 0 && <div className="bc-pay-sub bc-pay-sub--warning">Due before travel</div>}
              {remaining === 0 && <div className="bc-pay-sub bc-pay-sub--success">Paid in full</div>}
            </div>
          </div>

          {/* Note */}
          {booking.special_request && (
            <div className="bc-note-box">
              <div className="bc-note-box-label"><NoteIcon /> Note / Special Request</div>
              <div className="bc-note-box-text">{booking.special_request}</div>
            </div>
          )}

        </div>
      </div>

      {/* ── Toggle — always at bottom ── */}
      <button
        className={`booking-card-toggle ${expanded ? 'expanded' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <span>{expanded ? 'HIDE DETAILS' : 'SHOW DETAILS'}</span>
        <svg className="toggle-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

    </div>
  )
}
