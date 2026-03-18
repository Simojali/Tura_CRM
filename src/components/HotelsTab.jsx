import { useState, useEffect, useMemo } from 'react'
import { loadReferenceData } from '../lib/referenceData'
import { fmtDate, fmtCost, fmtRooms } from '../lib/formatters'
import { HOTEL_STATUS_LABELS as STATUS_LABELS } from '../lib/constants'

const HOTEL_STATUSES = [
  { value: 'all',       label: 'All' },
  { value: 'requested', label: 'Requested' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const genId = () => crypto.randomUUID()

function computeNights(checkin, checkout) {
  if (!checkin || !checkout) return 0
  const diff = Math.round((new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
}

const EMPTY_FORM = { refId: '', checkin: '', checkout: '', status: 'requested', confirmRef: '' }

export default function HotelsTab({ booking, hotels = [], onSaveHotels }) {
  const [refHotels, setRefHotels] = useState([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [openMenuId, setOpenMenuId] = useState(null)

  // Load reference hotels
  useEffect(() => {
    loadReferenceData().then((items) => {
      setRefHotels(items.filter((r) => r.category === 'hotel'))
    })
  }, [])

  // Close menu on outside click
  useEffect(() => {
    const close = () => setOpenMenuId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  // Auto-populate checkin/checkout from booking dates
  useEffect(() => {
    if (showAddForm) {
      setAddForm((f) => ({
        ...f,
        checkin: f.checkin || booking.check_in || '',
        checkout: f.checkout || booking.check_out || '',
      }))
    }
  }, [showAddForm, booking.check_in, booking.check_out])

  // Group reference hotels by city for <optgroup>
  const hotelsByCity = useMemo(() => {
    return refHotels.reduce((acc, h) => {
      if (!acc[h.city]) acc[h.city] = []
      acc[h.city].push(h)
      return acc
    }, {})
  }, [refHotels])

  const s = Number(booking.single_rooms) || 0
  const d = Number(booking.double_rooms) || 0
  const t = Number(booking.triple_rooms) || 0
  const calcCostPerNight = (hotel) =>
    s * (hotel.price_single || 0) + d * (hotel.price_double || 0) + t * (hotel.price_triple || 0)

  const filtered = useMemo(() =>
    filterStatus === 'all'
      ? hotels
      : hotels.filter((h) => (h.status || 'requested') === filterStatus),
    [hotels, filterStatus]
  )

  const countByStatus = (status) =>
    hotels.filter((h) => (h.status || 'requested') === status).length

  const renderHotelOptions = () =>
    Object.entries(hotelsByCity).map(([city, cityHotels]) => (
      <optgroup key={city} label={city}>
        {cityHotels.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name} · {h.tier} (€{h.price_double}/night)
          </option>
        ))}
      </optgroup>
    ))

  // ── Add ──────────────────────────────────────────────────────────────
  const addHotel = () => {
    const { refId, checkin, checkout, status, confirmRef } = addForm
    if (!refId || !checkin || !checkout) return
    const nights = computeNights(checkin, checkout)
    if (nights <= 0) { alert('Check-out must be after check-in.'); return }
    const hotel = refHotels.find((h) => h.id === refId)
    if (!hotel) return
    const entry = {
      id: genId(),
      ref_id: hotel.id,
      name: hotel.name,
      tier: hotel.tier || null,
      cost_per_night: calcCostPerNight(hotel),
      checkin,
      checkout,
      nights,
      status,
      confirmation_ref: confirmRef,
    }
    onSaveHotels([...hotels, entry])
    setShowAddForm(false)
    setAddForm(EMPTY_FORM)
  }

  // ── Edit ─────────────────────────────────────────────────────────────
  const startEdit = (entry) => {
    setEditForm({
      refId: entry.ref_id || '',
      checkin: entry.checkin || '',
      checkout: entry.checkout || '',
      status: entry.status || 'requested',
      confirmRef: entry.confirmation_ref || '',
    })
    setEditingId(entry.id)
    setOpenMenuId(null)
  }

  const saveEdit = (entry) => {
    const nights = computeNights(editForm.checkin, editForm.checkout)
    if (nights <= 0) { alert('Check-out must be after check-in.'); return }
    const hotel = refHotels.find((h) => h.id === editForm.refId)
    const updated = hotels.map((h) =>
      h.id !== entry.id ? h : {
        ...h,
        ref_id: editForm.refId,
        name: hotel?.name || h.name,
        tier: hotel?.tier || h.tier,
        cost_per_night: hotel ? calcCostPerNight(hotel) : h.cost_per_night,
        checkin: editForm.checkin,
        checkout: editForm.checkout,
        nights,
        status: editForm.status,
        confirmation_ref: editForm.confirmRef,
      }
    )
    onSaveHotels(updated)
    setEditingId(null)
  }

  // ── Status / Delete ───────────────────────────────────────────────────
  const markStatus = (entry, status) => {
    onSaveHotels(hotels.map((h) => h.id === entry.id ? { ...h, status } : h))
    setOpenMenuId(null)
  }

  const deleteHotel = (entry) => {
    if (!window.confirm(`Remove "${entry.name}"? This cannot be undone.`)) return
    onSaveHotels(hotels.filter((h) => h.id !== entry.id))
    setOpenMenuId(null)
    if (editingId === entry.id) setEditingId(null)
  }

  return (
    <div className="hotels-tab">

      {/* ── Header ── */}
      <div className="hotels-tab-header">
        <div className="hotels-tab-title-row">
          <h3 className="hotels-tab-title">All Hotels</h3>
          <span className="hotels-tab-count">{hotels.length} total</span>
          <button
            className="btn btn-primary"
            style={{ marginLeft: 'auto' }}
            onClick={() => { setShowAddForm(true); setEditingId(null) }}
          >
            + Add Hotel
          </button>
        </div>
        <div className="hotels-filter-bar">
          {HOTEL_STATUSES.map((s) => {
            const cnt = s.value === 'all' ? hotels.length : countByStatus(s.value)
            return (
              <button
                key={s.value}
                className={`hotels-filter-btn${filterStatus === s.value ? ' active' : ''}`}
                onClick={() => setFilterStatus(s.value)}
              >
                {s.label}
                {cnt > 0 && <span className="ht-filter-count">{cnt}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Add form ── */}
      {showAddForm && (
        <div className="tab-add-form">
          <div className="tab-add-form-title">Add Hotel</div>

          <div className="tab-add-field wide">
            <label>Hotel</label>
            <select
              className="tr-edit-input"
              value={addForm.refId}
              onChange={(e) => setAddForm((f) => ({ ...f, refId: e.target.value }))}
            >
              <option value="">— Select hotel —</option>
              {renderHotelOptions()}
            </select>
          </div>

          <div className="tab-add-field">
            <label>Check-in</label>
            <input
              type="date"
              className="tr-edit-input"
              value={addForm.checkin}
              onChange={(e) => setAddForm((f) => ({ ...f, checkin: e.target.value }))}
            />
          </div>

          <div className="tab-add-field">
            <label>Check-out</label>
            <input
              type="date"
              className="tr-edit-input"
              value={addForm.checkout}
              onChange={(e) => setAddForm((f) => ({ ...f, checkout: e.target.value }))}
            />
          </div>

          {addForm.checkin && addForm.checkout && (
            <div className="tab-add-field">
              <label>Nights</label>
              <span className="tr-edit-input" style={{ display: 'flex', alignItems: 'center', background: 'var(--color-bg-alt)', color: 'var(--color-text-light)' }}>
                {computeNights(addForm.checkin, addForm.checkout)} nights
              </span>
            </div>
          )}

          <div className="tab-add-field">
            <label>Status</label>
            <select
              className="tr-edit-input"
              value={addForm.status}
              onChange={(e) => setAddForm((f) => ({ ...f, status: e.target.value }))}
            >
              {HOTEL_STATUSES.filter((s) => s.value !== 'all').map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {addForm.status === 'confirmed' && (
            <div className="tab-add-field">
              <label>Confirmation Ref</label>
              <input
                className="tr-edit-input"
                placeholder="Supplier confirmation number"
                value={addForm.confirmRef}
                onChange={(e) => setAddForm((f) => ({ ...f, confirmRef: e.target.value }))}
              />
            </div>
          )}

          <div className="tab-add-actions">
            <button
              className="btn btn-success"
              disabled={!addForm.refId || !addForm.checkin || !addForm.checkout}
              onClick={addHotel}
            >Save</button>
            <button className="btn btn-outline" onClick={() => { setShowAddForm(false); setAddForm(EMPTY_FORM) }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {hotels.length === 0 ? (
        <div className="hotels-empty">
          No hotels yet. Click <strong>+ Add Hotel</strong> to add a hotel with its check-in and check-out dates.
        </div>
      ) : filtered.length === 0 ? (
        <div className="hotels-empty">No {filterStatus} hotels.</div>
      ) : (
        <div className="hotels-list">
          <div className="hotels-list-header">
            <span className="ht-col-hotel">Hotel</span>
            <span className="ht-col-dates">Check-in / Out</span>
            <span className="ht-col-nights">Nights</span>
            <span className="ht-col-rooms">Rooms</span>
            <span className="ht-col-status">Status</span>
            <span className="ht-col-ref">Ref</span>
            <span className="ht-col-cost">Cost</span>
            <span className="ht-col-menu" />
          </div>

          {filtered.map((entry) => (
            <div key={entry.id}>
              <div className={`hotels-row${entry.status === 'cancelled' ? ' cancelled' : ''}`}>

                {/* Hotel name + tier */}
                <div className="ht-hotel">
                  <span className="ht-hotel-name">{entry.name}</span>
                  {entry.tier && <span className="ht-tier-badge">{entry.tier}</span>}
                </div>

                {/* Dates */}
                <div className="ht-dates">
                  <span className="ht-checkin-out">
                    {fmtDate(entry.checkin)} → {fmtDate(entry.checkout)}
                  </span>
                </div>

                {/* Nights */}
                <div className="ht-nights">{entry.nights}n</div>

                {/* Rooms */}
                <div className="ht-rooms">{fmtRooms(booking) || '—'}</div>

                {/* Status */}
                <div className="ht-status">
                  <span className={`itin-status-badge status-${entry.status || 'requested'}`}>
                    {STATUS_LABELS[entry.status || 'requested']}
                  </span>
                </div>

                {/* Ref */}
                <div className="ht-ref">
                  {entry.confirmation_ref
                    ? <span className="ht-ref-value">{entry.confirmation_ref}</span>
                    : <span className="ht-ref-empty">—</span>}
                </div>

                {/* Cost */}
                <div className="ht-cost">
                  <span>{fmtCost(entry.cost_per_night)}/night</span>
                  <span className="ht-cost-total"> · {fmtCost(entry.cost_per_night * entry.nights)} total</span>
                </div>

                {/* ⋮ Menu */}
                <div className="ht-actions">
                  <button
                    className="ht-menu-btn"
                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === entry.id ? null : entry.id) }}
                  >⋮</button>
                  {openMenuId === entry.id && (
                    <div className="ht-menu" onClick={(e) => e.stopPropagation()}>
                      {entry.status !== 'confirmed' && (
                        <button className="ht-menu-item" onClick={() => markStatus(entry, 'confirmed')}>
                          ✅ Mark Confirmed
                        </button>
                      )}
                      <button className="ht-menu-item" onClick={() => startEdit(entry)}>
                        ✏️ Edit
                      </button>
                      {entry.status === 'confirmed' && (
                        <button className="ht-menu-item" onClick={() => markStatus(entry, 'requested')}>
                          ↺ Reset to Requested
                        </button>
                      )}
                      {entry.status !== 'cancelled' && (
                        <button className="ht-menu-item danger" onClick={() => markStatus(entry, 'cancelled')}>
                          ✕ Cancel
                        </button>
                      )}
                      {entry.status === 'cancelled' && (
                        <button className="ht-menu-item" onClick={() => markStatus(entry, 'requested')}>
                          ↺ Restore
                        </button>
                      )}
                      <button className="ht-menu-item danger" onClick={() => deleteHotel(entry)}>
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Inline edit */}
              {editingId === entry.id && (
                <div className="ht-inline-edit">
                  <div className="tr-edit-grid">
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="tr-edit-label">Hotel</label>
                      <select
                        className="tr-edit-input"
                        value={editForm.refId}
                        onChange={(e) => setEditForm((f) => ({ ...f, refId: e.target.value }))}
                      >
                        <option value="">— Keep current —</option>
                        {renderHotelOptions()}
                      </select>
                    </div>
                    <div>
                      <label className="tr-edit-label">Check-in</label>
                      <input
                        type="date"
                        className="tr-edit-input"
                        value={editForm.checkin}
                        onChange={(e) => setEditForm((f) => ({ ...f, checkin: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="tr-edit-label">Check-out</label>
                      <input
                        type="date"
                        className="tr-edit-input"
                        value={editForm.checkout}
                        onChange={(e) => setEditForm((f) => ({ ...f, checkout: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="tr-edit-label">Status</label>
                      <select
                        className="tr-edit-input"
                        value={editForm.status}
                        onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                      >
                        {HOTEL_STATUSES.filter((s) => s.value !== 'all').map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="tr-edit-label">Confirmation Ref</label>
                      <input
                        className="tr-edit-input"
                        placeholder="Supplier confirmation number"
                        value={editForm.confirmRef}
                        onChange={(e) => setEditForm((f) => ({ ...f, confirmRef: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="tr-edit-actions">
                    <button className="btn btn-success" onClick={() => saveEdit(entry)}>Save</button>
                    <button className="btn btn-outline" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
