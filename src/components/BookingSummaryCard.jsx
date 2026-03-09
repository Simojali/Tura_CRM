import { useState } from 'react'

export default function BookingSummaryCard({ booking, onEdit }) {
  const [expanded, setExpanded] = useState(false)

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
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
      case 'Pending': return 'status-pending'
      case 'Passed': return 'status-passed'
      default: return ''
    }
  }

  const buildRoomsLabel = () => {
    const parts = []
    if (booking.single_rooms > 0) parts.push(`${booking.single_rooms} Single`)
    if (booking.double_rooms > 0) parts.push(`${booking.double_rooms} Double`)
    if (booking.triple_rooms > 0) parts.push(`${booking.triple_rooms} Triple`)
    return parts.length > 0 ? parts.join(', ') : null
  }

  const remaining = (Number(booking.group_price_eur) || 0) - (Number(booking.paid) || 0)

  const remainingClass =
    remaining === 0 ? 'remaining-zero' : remaining > 0 ? 'remaining-positive' : ''

  return (
    <div className="booking-card">
      {/* Always visible: Header + key info */}
      <div className="booking-card-top">
        <div>
          <div className="booking-card-name">{booking.client_name}</div>
          <div className="booking-card-meta">
            {booking.proveedor || 'No provider'}
            <span>·</span>
            Ref #{booking.referencia_ruta}
            <span>·</span>
            {booking.number_of_guests} {booking.number_of_guests === 1 ? 'Guest' : 'Guests'}
          </div>
          <span className={`status-badge ${getStatusClass(booking.reserv_status)}`}>
            {booking.reserv_status}
          </span>
        </div>
        <button className="btn btn-primary" onClick={onEdit}>
          Edit
        </button>
      </div>

      {/* Always visible: Key fields strip */}
      <div className="booking-card-key-fields">
        <div className="booking-card-key-field">
          <div className="label">Check In & Out</div>
          <div className="value">
            {formatDate(booking.check_in)} → {formatDate(booking.check_out)}
          </div>
        </div>

        <div className="booking-card-key-field">
          <div className="label">Days</div>
          <div className={`value ${!booking.n_dias ? 'empty' : ''}`}>
            {booking.n_dias || '—'}
          </div>
        </div>

        <div className="booking-card-key-field">
          <div className="label">Rooms</div>
          <div className={`value ${!buildRoomsLabel() ? 'empty' : ''}`}>
            {buildRoomsLabel() || '—'}
          </div>
        </div>

        <div className="booking-card-key-field">
          <div className="label">Flight</div>
          <div className={`value ${!booking.flight_number ? 'empty' : ''}`}>
            {booking.flight_number ? (
              <>
                {booking.flight_number}
                {booking.flight_hour ? ` · ${booking.flight_hour}` : ''}
                {booking.flight_return ? (
                  <span className="flight-return"> / {booking.flight_return}</span>
                ) : null}
              </>
            ) : '—'}
          </div>
        </div>
      </div>

      {/* Toggle bar */}
      <button
        className={`booking-card-toggle ${expanded ? 'expanded' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <span>{expanded ? 'Hide details' : 'Show details'}</span>
        <svg
          className="toggle-chevron"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Collapsible: Details, Payment, Note */}
      <div className={`booking-card-collapse ${expanded ? 'open' : ''}`}>
        <div className="booking-card-grid">
          {/* Details */}
          <div className="booking-card-section-label">Details</div>

          <div className="booking-card-field">
            <div className="label">Provider</div>
            <div className={`value ${!booking.proveedor ? 'empty' : ''}`}>
              {booking.proveedor || '—'}
            </div>
          </div>

          <div className="booking-card-field">
            <div className="label">Hotel Type</div>
            <div className={`value ${!booking.type_of_hotels ? 'empty' : ''}`}>
              {booking.type_of_hotels || '—'}
            </div>
          </div>

          <div className="booking-card-field">
            <div className="label">Agency Ref</div>
            <div className={`value ${!booking.referencia_agencia ? 'empty' : ''}`}>
              {booking.referencia_agencia || '—'}
            </div>
          </div>

          <div className="booking-card-field">
            <div className="label">Phone</div>
            <div className={`value ${!booking.telefono ? 'empty' : ''}`}>
              {booking.telefono || '—'}
            </div>
          </div>

          {/* Payment */}
          <div className="booking-card-section-label">Payment</div>

          <div className="booking-card-field">
            <div className="label">Group Price (EUR)</div>
            <div className={`value ${booking.group_price_eur ? 'highlight' : 'empty'}`}>
              {booking.group_price_eur ? `${formatCurrency(booking.group_price_eur)} EUR` : '—'}
            </div>
          </div>

          <div className="booking-card-field">
            <div className="label">Paid</div>
            <div className="value">
              {formatCurrency(booking.paid)} EUR
            </div>
          </div>

          <div className="booking-card-field">
            <div className="label">Remaining</div>
            <div className={`value ${remainingClass}`}>
              {formatCurrency(remaining)} EUR
            </div>
          </div>

          <div className="booking-card-field">
            <div className="label">Invoice</div>
            <div className={`value ${!booking.factura ? 'empty' : ''}`}>
              {booking.factura || '—'}
            </div>
          </div>

          {booking.group_price_mad ? (
            <div className="booking-card-field">
              <div className="label">Group Price (MAD)</div>
              <div className="value">
                {formatCurrency(booking.group_price_mad)} MAD
              </div>
            </div>
          ) : null}

          {booking.unite_price_eur ? (
            <div className="booking-card-field">
              <div className="label">Unit Price (EUR)</div>
              <div className="value">
                {formatCurrency(booking.unite_price_eur)} EUR
              </div>
            </div>
          ) : null}

          {/* Note */}
          {booking.special_request && (
            <div className="booking-card-note">
              <div className="label">Note / Special Request</div>
              <div className="value">{booking.special_request}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
