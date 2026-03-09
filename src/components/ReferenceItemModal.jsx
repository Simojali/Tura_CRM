import { useState, useEffect } from 'react'
import { REF_SUBCATEGORIES, CITIES, TIERS } from '../lib/referenceData'

const PRICE_UNIT_OPTIONS = {
  hotel: ['per night'],
  transfer: ['one way', 'round trip'],
  activity: ['per group', 'per person'],
  transport: ['per day', 'per vehicle'],
}

const EMPTY_FORM = {
  category: 'hotel',
  subcategory: '',
  name: '',
  city: '',
  tier: '',
  price_single: '',
  price_double: '',
  price_triple: '',
  price: '',
  price_unit: 'per night',
  pax_label: '',
  notes: '',
}

export default function ReferenceItemModal({ item, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (item) {
      setForm({
        category: item.category || 'hotel',
        subcategory: item.subcategory || '',
        name: item.name || '',
        city: item.city || '',
        tier: item.tier || '',
        price_single: item.price_single != null ? String(item.price_single) : '',
        price_double: item.price_double != null ? String(item.price_double) : '',
        price_triple: item.price_triple != null ? String(item.price_triple) : '',
        price: item.price != null ? String(item.price) : '',
        price_unit: item.price_unit || '',
        pax_label: item.pax_label || '',
        notes: item.notes || '',
      })
    }
  }, [item])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      if (name === 'category') {
        next.subcategory = ''
        next.tier = ''
        next.price_unit = PRICE_UNIT_OPTIONS[value]?.[0] || ''
        next.price = ''
        next.price_single = ''
        next.price_double = ''
        next.price_triple = ''
      }
      return next
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const isHotel = form.category === 'hotel'
    onSave({
      category: form.category,
      subcategory: form.subcategory || null,
      name: form.name,
      city: form.city || null,
      tier: isHotel ? (form.tier || null) : null,
      price_single: isHotel ? (form.price_single !== '' ? Number(form.price_single) : null) : null,
      price_double: isHotel ? (form.price_double !== '' ? Number(form.price_double) : null) : null,
      price_triple: isHotel ? (form.price_triple !== '' ? Number(form.price_triple) : null) : null,
      price: isHotel ? null : (Number(form.price) || 0),
      price_unit: form.price_unit || null,
      pax_label: !isHotel ? (form.pax_label || null) : null,
      notes: form.notes || null,
    })
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  const isHotel = form.category === 'hotel'
  const subcategories = REF_SUBCATEGORIES[form.category] || []
  const priceUnits = PRICE_UNIT_OPTIONS[form.category] || []

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>{item ? 'Edit Item' : 'Add Item'}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">

              <div className="form-group">
                <label>Category *</label>
                <select name="category" value={form.category} onChange={handleChange} required>
                  <option value="hotel">Hotel</option>
                  <option value="transfer">Transfer</option>
                  <option value="activity">Activity</option>
                  <option value="transport">Transport</option>
                </select>
              </div>

              <div className="form-group">
                <label>Subcategory</label>
                <select name="subcategory" value={form.subcategory} onChange={handleChange}>
                  <option value="">— Select —</option>
                  {subcategories.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="form-group full-width">
                <label>Name *</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Riad Kniza, Quad Biking, Bus 17 pax..."
                  required
                />
              </div>

              <div className="form-group">
                <label>City</label>
                <select name="city" value={form.city} onChange={handleChange}>
                  <option value="">— None —</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {isHotel ? (
                <div className="form-group">
                  <label>Tier</label>
                  <select name="tier" value={form.tier} onChange={handleChange}>
                    <option value="">— None —</option>
                    {TIERS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label>Pax / Capacity</label>
                  <input
                    name="pax_label"
                    value={form.pax_label}
                    onChange={handleChange}
                    placeholder="e.g. 1-4 pax, 17 seats"
                  />
                </div>
              )}

              {/* Hotels: 3 room price fields */}
              {isHotel ? (
                <div className="rooms-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Room Prices (EUR / night)</label>
                  <div className="rooms-inputs">
                    <div className="sub-field">
                      <span>Single</span>
                      <input
                        name="price_single"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price_single}
                        onChange={handleChange}
                        placeholder="0"
                      />
                    </div>
                    <div className="sub-field">
                      <span>Double</span>
                      <input
                        name="price_double"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price_double}
                        onChange={handleChange}
                        placeholder="0"
                      />
                    </div>
                    <div className="sub-field">
                      <span>Triple</span>
                      <input
                        name="price_triple"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price_triple}
                        onChange={handleChange}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>Price (EUR) *</label>
                    <input
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Price Unit</label>
                    <select name="price_unit" value={form.price_unit} onChange={handleChange}>
                      <option value="">— Select —</option>
                      {priceUnits.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="form-group full-width">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Any additional details..."
                />
              </div>

            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-success">
              {item ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
