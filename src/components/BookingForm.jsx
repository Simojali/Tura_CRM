import { useState } from 'react'
import { PROVIDERS as FALLBACK_PROVIDERS, HOTEL_TYPES, RESERV_STATUSES, CLIENT_TYPES } from '../lib/constants'
import { computeDays } from '../lib/itineraryUtils'

const EMPTY_FORM = {
  provider: '',
  agency_reference: '',
  client_type: '',
  client_name: '',
  phone: '',
  check_in: '',
  check_out: '',
  number_of_guests: '',
  number_of_days: '',
  type_of_hotels: '',
  single_rooms: 0,
  double_rooms: 0,
  triple_rooms: 0,
  flight_number: '',
  flight_hour: '',
  flight_return: '',
  unite_price_eur: '',
  group_price_eur: '',
  group_price_mad: '',
  paid: '',
  booking_status: 'Quotation',
  special_request: '',
}

export default function BookingForm({ initialData, providers: providersProp, onSubmit, isDetail = false }) {
  const PROVIDERS = (providersProp || FALLBACK_PROVIDERS).map((p) => typeof p === 'string' ? p : p.name)
  const [form, setForm] = useState(initialData || EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    const { name, value, type } = e.target
    setForm((prev) => {
      const updated = {
        ...prev,
        [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value,
      }
      if (name === 'check_in' && updated.check_out && updated.check_out < value) {
        updated.check_out = ''
      }
      if (name === 'check_in' || name === 'check_out') {
        const days = computeDays(updated)
        updated.number_of_days = days > 0 ? days : ''
      }
      return updated
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const total = Number(form.group_price_eur) || 0
    const paid  = Number(form.paid) || 0
    if (paid > total && total > 0) {
      alert('Paid amount cannot exceed the total group price.')
      return
    }
    setSaving(true)
    try {
      await onSubmit(form)
    } finally {
      setSaving(false)
    }
  }

  const restOfPayment =
    (Number(form.group_price_eur) || 0) - (Number(form.paid) || 0)

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        {/* Provider */}
        <div className="form-group">
          <label>Provider</label>
          <select name="provider" value={form.provider} onChange={handleChange}>
            <option value="">-- Select --</option>
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Agency Reference */}
        <div className="form-group">
          <label>Agency Reference</label>
          <input
            type="text"
            name="agency_reference"
            value={form.agency_reference}
            onChange={handleChange}
          />
        </div>

        {/* Client Type */}
        <div className="form-group">
          <label>Client Type</label>
          <select name="client_type" value={form.client_type} onChange={handleChange}>
            <option value="">-- Select --</option>
            {CLIENT_TYPES.map((ct) => (
              <option key={ct.value} value={ct.value}>{ct.label}</option>
            ))}
          </select>
        </div>

        {/* Booking Reference (only shown on detail page, read-only) */}
        {isDetail && (
          <div className="form-group">
            <label>Booking Reference</label>
            <input
              type="text"
              value={form.booking_reference || ''}
              readOnly
            />
          </div>
        )}

        {/* Client Name */}
        <div className="form-group">
          <label>Client Name *</label>
          <input
            type="text"
            name="client_name"
            value={form.client_name}
            onChange={handleChange}
            required
          />
        </div>

        {/* Phone */}
        <div className="form-group">
          <label>Phone</label>
          <input
            type="text"
            name="phone"
            value={form.phone}
            onChange={handleChange}
          />
        </div>

        {/* Check In */}
        <div className="form-group">
          <label>Check In</label>
          <input
            type="date"
            name="check_in"
            value={form.check_in}
            onChange={handleChange}
          />
        </div>

        {/* Check Out */}
        <div className="form-group">
          <label>Check Out</label>
          <input
            type="date"
            name="check_out"
            value={form.check_out}
            min={form.check_in || undefined}
            onChange={handleChange}
          />
        </div>

        {/* Number of Guests */}
        <div className="form-group">
          <label>Number of Guests *</label>
          <input
            type="number"
            name="number_of_guests"
            value={form.number_of_guests}
            onChange={handleChange}
            min="1"
            required
          />
        </div>

        {/* Type of Hotels */}
        <div className="form-group">
          <label>Hotel Type *</label>
          <select
            name="type_of_hotels"
            value={form.type_of_hotels}
            onChange={handleChange}
            required
          >
            <option value="">-- Select --</option>
            {HOTEL_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Rooms */}
        <div className="rooms-group">
          <label>Rooms</label>
          <div className="rooms-inputs">
            <div className="sub-field">
              <span>Single</span>
              <input
                type="number"
                name="single_rooms"
                value={form.single_rooms}
                onChange={handleChange}
                min="0"
              />
            </div>
            <div className="sub-field">
              <span>Double</span>
              <input
                type="number"
                name="double_rooms"
                value={form.double_rooms}
                onChange={handleChange}
                min="0"
              />
            </div>
            <div className="sub-field">
              <span>Triple</span>
              <input
                type="number"
                name="triple_rooms"
                value={form.triple_rooms}
                onChange={handleChange}
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Flight Section */}
        <div className="form-section-label">Flight</div>

        <div className="form-group">
          <label>Flight Number</label>
          <input
            type="text"
            name="flight_number"
            value={form.flight_number}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Flight Time</label>
          <input
            type="text"
            name="flight_hour"
            value={form.flight_hour}
            onChange={handleChange}
            placeholder="e.g. 14:30"
          />
        </div>

        <div className="form-group">
          <label>Return Flight</label>
          <input
            type="text"
            name="flight_return"
            value={form.flight_return}
            onChange={handleChange}
          />
        </div>

        {/* Pricing Section */}
        <div className="form-section-label">Pricing</div>

        <div className="form-group">
          <label>Unit Price (EUR)</label>
          <input
            type="number"
            name="unite_price_eur"
            value={form.unite_price_eur}
            onChange={handleChange}
            step="0.01"
            min="0"
          />
        </div>

        <div className="form-group">
          <label>Group Price (EUR)</label>
          <input
            type="number"
            name="group_price_eur"
            value={form.group_price_eur}
            onChange={handleChange}
            step="0.01"
            min="0"
          />
        </div>

        <div className="form-group">
          <label>Group Price (MAD)</label>
          <input
            type="number"
            name="group_price_mad"
            value={form.group_price_mad}
            onChange={handleChange}
            step="0.01"
            min="0"
          />
        </div>

        <div className="form-group">
          <label>Paid</label>
          <input
            type="number"
            name="paid"
            value={form.paid}
            onChange={handleChange}
            step="0.01"
            min="0"
          />
        </div>

        {/* Rest of Payment (calculated, always shown) */}
        <div className="form-group">
          <label>Remaining Payment</label>
          <div className="calculated-value">
            {restOfPayment.toFixed(2)} EUR
          </div>
        </div>

        {/* Status */}
        <div className="form-group">
          <label>Booking Status *</label>
          <select
            name="booking_status"
            value={form.booking_status}
            onChange={handleChange}
            required
          >
            {RESERV_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Special Request */}
        <div className="form-group full-width">
          <label>Note / Special Request</label>
          <textarea
            name="special_request"
            value={form.special_request}
            onChange={handleChange}
            rows={3}
          />
        </div>
      </div>

      {/* Submit only shown inside modal (not detail page which has its own save) */}
      {!isDetail && (
        <div className="modal-footer" style={{ padding: '1rem 0 0', borderTop: 'none' }}>
          <button type="submit" className="btn btn-success" disabled={saving}>
            {saving ? 'Saving...' : 'Save Booking'}
          </button>
        </div>
      )}

      {isDetail && (
        <div className="detail-actions">
          <button type="submit" className="btn btn-success" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </form>
  )
}
