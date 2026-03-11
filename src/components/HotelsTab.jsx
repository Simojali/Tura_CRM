import { useState, useEffect } from 'react'
import { MOCK_REFERENCE_DATA } from '../lib/referenceData'

const HOTEL_STATUSES = [
  { value: 'all',       label: 'All' },
  { value: 'requested', label: 'Requested' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_LABELS = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
}

const hotels = MOCK_REFERENCE_DATA.filter((r) => r.category === 'hotel')

// Group hotels by city for <optgroup> display
const hotelsByCity = hotels.reduce((acc, h) => {
  if (!acc[h.city]) acc[h.city] = []
  acc[h.city].push(h)
  return acc
}, {})

const EMPTY_ADD_FORM = { dayIdx: '', hotelId: '', status: 'requested', confirmRef: '', checkin: '', checkout: '' }

export default function HotelsTab({ booking, itinerary, onSave }) {
  const [filterStatus, setFilterStatus] = useState('all')
  const [openMenuIdx, setOpenMenuIdx] = useState(null)
  const [editingIdx, setEditingIdx] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM)

  // Close ⋮ menu on outside click
  useEffect(() => {
    const close = () => setOpenMenuIdx(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  // ── Room counts + cost calculation ────────────────────────────────────
  const s = Number(booking.single_rooms) || 0
  const d = Number(booking.double_rooms) || 0
  const t = Number(booking.triple_rooms) || 0
  const calcHotelCost = (hotel) =>
    s * (hotel.price_single || 0) + d * (hotel.price_double || 0) + t * (hotel.price_triple || 0)

  // ── Auto-compute checkout: next day in itinerary, or +1 day ──────────
  const getAutoCheckout = (rowIndex) => {
    if (rowIndex + 1 < itinerary.length) return itinerary[rowIndex + 1].date
    const dateStr = itinerary[rowIndex]?.date
    if (!dateStr) return ''
    const [y, m, dy] = dateStr.split('-').map(Number)
    const next = new Date(y, m - 1, dy + 1)
    return [
      next.getFullYear(),
      String(next.getMonth() + 1).padStart(2, '0'),
      String(next.getDate()).padStart(2, '0'),
    ].join('-')
  }

  // ── Resolved checkin/checkout for display (stored or auto-computed) ───
  const resolveCheckin  = (item) => item.hotel_checkin  || item.date || ''
  const resolveCheckout = (item) => item.hotel_checkout || getAutoCheckout(item.rowIndex)

  // ── Flat list: days that have a hotel ─────────────────────────────────
  const hotelRows = itinerary
    .map((row, rowIndex) => ({ ...row, rowIndex }))
    .filter((row) => row.hotel_id)

  const filtered = filterStatus === 'all'
    ? hotelRows
    : hotelRows.filter((row) => (row.hotel_status || 'requested') === filterStatus)

  // Days without a hotel (for Add form day picker)
  const availableDays = itinerary
    .map((row, i) => ({ i, row }))
    .filter(({ row }) => !row.hotel_id)

  // ── Update a hotel row ────────────────────────────────────────────────
  const updateHotel = (rowIndex, changes) => {
    const updated = itinerary.map((row, ri) =>
      ri === rowIndex ? { ...row, ...changes } : row
    )
    onSave(updated)
  }

  // ── Add hotel ─────────────────────────────────────────────────────────
  const addHotel = () => {
    const { dayIdx, hotelId, status, confirmRef, checkin, checkout } = addForm
    if (dayIdx === '' || !hotelId) return
    const hotel = hotels.find((h) => h.id === hotelId)
    if (!hotel) return
    const cost = calcHotelCost(hotel)
    const updated = itinerary.map((row, ri) =>
      ri !== Number(dayIdx) ? row : {
        ...row,
        hotel_id: hotelId,
        hotel_name: hotel.name,
        hotel_tier: hotel.tier || null,
        hotel_cost: cost,
        hotel_status: status,
        hotel_confirmation_ref: confirmRef,
        hotel_checkin: checkin,
        hotel_checkout: checkout,
      }
    )
    onSave(updated)
    setShowAddForm(false)
    setAddForm(EMPTY_ADD_FORM)
  }

  // ── Quick actions ──────────────────────────────────────────────────────
  const markStatus = (item, status) => {
    updateHotel(item.rowIndex, { hotel_status: status })
    setOpenMenuIdx(null)
  }

  const deleteHotel = (item) => {
    updateHotel(item.rowIndex, {
      hotel_id: null, hotel_name: null, hotel_tier: null, hotel_cost: 0,
      hotel_status: undefined, hotel_confirmation_ref: '',
      hotel_checkin: '', hotel_checkout: '',
    })
    setOpenMenuIdx(null)
    if (editingIdx !== null) setEditingIdx(null)
  }

  // ── Inline edit ───────────────────────────────────────────────────────
  const startEdit = (item, idx) => {
    setEditForm({
      hotelId: item.hotel_id || '',
      hotel_status: item.hotel_status || 'requested',
      hotel_confirmation_ref: item.hotel_confirmation_ref || '',
      hotel_checkin: resolveCheckin(item),
      hotel_checkout: resolveCheckout(item),
    })
    setEditingIdx(idx)
    setOpenMenuIdx(null)
  }

  const saveEdit = (item) => {
    const hotel = hotels.find((h) => h.id === editForm.hotelId)
    const changes = {
      hotel_status: editForm.hotel_status,
      hotel_confirmation_ref: editForm.hotel_confirmation_ref,
      hotel_checkin: editForm.hotel_checkin,
      hotel_checkout: editForm.hotel_checkout,
    }
    if (hotel && editForm.hotelId !== item.hotel_id) {
      const cost = calcHotelCost(hotel)
      Object.assign(changes, {
        hotel_id: hotel.id,
        hotel_name: hotel.name,
        hotel_tier: hotel.tier || null,
        hotel_cost: cost,
      })
    }
    updateHotel(item.rowIndex, changes)
    setEditingIdx(null)
  }

  const cancelEdit = () => { setEditingIdx(null); setEditForm({}) }

  // ── Helpers ───────────────────────────────────────────────────────────
  const fmtDate = (dateStr) => {
    if (!dateStr) return ''
    const [y, m, day] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  }

  const countByStatus = (status) =>
    hotelRows.filter((row) => (row.hotel_status || 'requested') === status).length

  const roomSummary = () => {
    const parts = []
    if (Number(booking.single_rooms) > 0) parts.push(`${booking.single_rooms}× Single`)
    if (Number(booking.double_rooms) > 0) parts.push(`${booking.double_rooms}× Double`)
    if (Number(booking.triple_rooms) > 0) parts.push(`${booking.triple_rooms}× Triple`)
    return parts.join(' · ') || '—'
  }

  // Hotel options for add / edit forms
  const selectedDayForAdd = addForm.dayIdx !== '' ? itinerary[Number(addForm.dayIdx)] : null
  const addFormCity = selectedDayForAdd?.city || ''

  const renderHotelOptions = (filterCity) => {
    if (filterCity) {
      return hotels
        .filter((h) => h.city === filterCity)
        .map((h) => (
          <option key={h.id} value={h.id}>
            {h.name} · {h.tier} (€{h.price_double}/night)
          </option>
        ))
    }
    // No city — show all grouped
    return Object.entries(hotelsByCity).map(([city, cityHotels]) => (
      <optgroup key={city} label={city}>
        {cityHotels.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name} · {h.tier} (€{h.price_double}/night)
          </option>
        ))}
      </optgroup>
    ))
  }

  return (
    <div className="hotels-tab">

      {/* ── Header ── */}
      <div className="hotels-tab-header">
        <div className="hotels-tab-title-row">
          <h3 className="hotels-tab-title">All Hotels</h3>
          <span className="hotels-tab-count">{hotelRows.length} total</span>
          <button
            className="btn btn-primary"
            style={{ marginLeft: 'auto' }}
            disabled={availableDays.length === 0}
            onClick={() => { setShowAddForm(true); setEditingIdx(null) }}
          >
            + Add Hotel
          </button>
        </div>
        <div className="hotels-filter-bar">
          {HOTEL_STATUSES.map((s) => {
            const cnt = s.value === 'all' ? hotelRows.length : countByStatus(s.value)
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
          <div className="tab-add-form-title">Add Hotel to Day</div>

          {/* Day */}
          <div className="tab-add-field">
            <label>Day</label>
            <select
              className="tr-edit-input"
              value={addForm.dayIdx}
              onChange={(e) => {
                const idx = e.target.value
                const checkin  = idx !== '' ? (itinerary[Number(idx)]?.date || '') : ''
                const checkout = idx !== '' ? getAutoCheckout(Number(idx)) : ''
                setAddForm((f) => ({ ...f, dayIdx: idx, hotelId: '', checkin, checkout }))
              }}
            >
              <option value="">— Select day —</option>
              {availableDays.map(({ i, row }) => (
                <option key={i} value={i}>
                  Day {row.day} · {fmtDate(row.date)}{row.city ? ` · ${row.city}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Check-in */}
          <div className="tab-add-field">
            <label>Check-in</label>
            <input
              type="date"
              className="tr-edit-input"
              value={addForm.checkin}
              onChange={(e) => setAddForm((f) => ({ ...f, checkin: e.target.value }))}
            />
          </div>

          {/* Check-out */}
          <div className="tab-add-field">
            <label>Check-out</label>
            <input
              type="date"
              className="tr-edit-input"
              value={addForm.checkout}
              onChange={(e) => setAddForm((f) => ({ ...f, checkout: e.target.value }))}
            />
          </div>

          {/* Hotel */}
          <div className="tab-add-field wide">
            <label>Hotel</label>
            <select
              className="tr-edit-input"
              value={addForm.hotelId}
              disabled={addForm.dayIdx === ''}
              onChange={(e) => setAddForm((f) => ({ ...f, hotelId: e.target.value }))}
            >
              <option value="">— Select hotel —</option>
              {renderHotelOptions(addFormCity)}
            </select>
          </div>

          {/* Status */}
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

          {/* Confirmation Ref (only if confirmed) */}
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
              disabled={addForm.dayIdx === '' || !addForm.hotelId}
              onClick={addHotel}
            >Save</button>
            <button className="btn btn-outline" onClick={() => {
              setShowAddForm(false)
              setAddForm(EMPTY_ADD_FORM)
            }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {hotelRows.length === 0 ? (
        <div className="hotels-empty">
          No hotels yet. Click <strong>+ Add Hotel</strong> above to assign a hotel to a day.
        </div>
      ) : filtered.length === 0 ? (
        <div className="hotels-empty">No {filterStatus} hotels.</div>
      ) : (
        <div className="hotels-list">
          {/* Column headers */}
          <div className="hotels-list-header">
            <span className="ht-col-dates">Check-in / Out</span>
            <span className="ht-col-city">City</span>
            <span className="ht-col-hotel">Hotel</span>
            <span className="ht-col-rooms">Rooms</span>
            <span className="ht-col-status">Status</span>
            <span className="ht-col-ref">Ref</span>
            <span className="ht-col-cost">Cost/night</span>
            <span className="ht-col-menu" />
          </div>

          {filtered.map((item, idx) => {
            const checkin  = resolveCheckin(item)
            const checkout = resolveCheckout(item)
            return (
              <div key={idx}>
                {/* Main row */}
                <div className={`hotels-row${item.hotel_status === 'cancelled' ? ' cancelled' : ''}`}>
                  {/* Check-in / Check-out */}
                  <div className="ht-dates">
                    <span className="ht-checkin-out">
                      {fmtDate(checkin)} → {fmtDate(checkout)}
                    </span>
                    <span className="ht-day-label">Day {item.day}</span>
                  </div>

                  {/* City */}
                  <div className="ht-city">{item.city || '—'}</div>

                  {/* Hotel name + tier */}
                  <div className="ht-hotel">
                    <span className="ht-hotel-name">{item.hotel_name}</span>
                    {item.hotel_tier && (
                      <span className="ht-tier-badge">{item.hotel_tier}</span>
                    )}
                  </div>

                  {/* Rooms */}
                  <div className="ht-rooms">{roomSummary()}</div>

                  {/* Status */}
                  <div className="ht-status">
                    <span className={`itin-status-badge status-${item.hotel_status || 'requested'}`}>
                      {STATUS_LABELS[item.hotel_status || 'requested']}
                    </span>
                  </div>

                  {/* Confirmation ref */}
                  <div className="ht-ref">
                    {item.hotel_confirmation_ref
                      ? <span className="ht-ref-value">{item.hotel_confirmation_ref}</span>
                      : <span className="ht-ref-empty">—</span>}
                  </div>

                  {/* Cost */}
                  <div className="ht-cost">€{Number(item.hotel_cost).toFixed(0)}</div>

                  {/* ⋮ Menu */}
                  <div className="ht-actions">
                    <button
                      className="ht-menu-btn"
                      title="Actions"
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMenuIdx(openMenuIdx === idx ? null : idx)
                      }}
                    >⋮</button>

                    {openMenuIdx === idx && (
                      <div className="ht-menu" onClick={(e) => e.stopPropagation()}>
                        {item.hotel_status !== 'confirmed' && (
                          <button className="ht-menu-item" onClick={() => markStatus(item, 'confirmed')}>
                            ✅ Mark Confirmed
                          </button>
                        )}
                        <button className="ht-menu-item" onClick={() => startEdit(item, idx)}>
                          ✏️ Edit
                        </button>
                        {item.hotel_status === 'confirmed' && (
                          <button className="ht-menu-item" onClick={() => markStatus(item, 'requested')}>
                            ↺ Reset to Requested
                          </button>
                        )}
                        {item.hotel_status !== 'cancelled' && (
                          <button className="ht-menu-item danger" onClick={() => markStatus(item, 'cancelled')}>
                            ✕ Cancel
                          </button>
                        )}
                        {item.hotel_status === 'cancelled' && (
                          <button className="ht-menu-item" onClick={() => markStatus(item, 'requested')}>
                            ↺ Restore
                          </button>
                        )}
                        <button className="ht-menu-item danger" onClick={() => deleteHotel(item)}>
                          🗑️ Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline edit form */}
                {editingIdx === idx && (
                  <div className="ht-inline-edit">
                    <div className="tr-edit-grid">
                      {/* Hotel picker */}
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label className="tr-edit-label">Hotel</label>
                        <select
                          className="tr-edit-input"
                          value={editForm.hotelId}
                          onChange={(e) => setEditForm((f) => ({ ...f, hotelId: e.target.value }))}
                        >
                          <option value="">— Keep current hotel —</option>
                          {Object.entries(hotelsByCity).map(([city, cityHotels]) => (
                            <optgroup key={city} label={city}>
                              {cityHotels.map((h) => (
                                <option key={h.id} value={h.id}>
                                  {h.name} · {h.tier} (€{h.price_double}/night)
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      {/* Check-in */}
                      <div>
                        <label className="tr-edit-label">Check-in</label>
                        <input
                          type="date"
                          className="tr-edit-input"
                          value={editForm.hotel_checkin}
                          onChange={(e) => setEditForm((f) => ({ ...f, hotel_checkin: e.target.value }))}
                        />
                      </div>
                      {/* Check-out */}
                      <div>
                        <label className="tr-edit-label">Check-out</label>
                        <input
                          type="date"
                          className="tr-edit-input"
                          value={editForm.hotel_checkout}
                          onChange={(e) => setEditForm((f) => ({ ...f, hotel_checkout: e.target.value }))}
                        />
                      </div>
                      {/* Status */}
                      <div>
                        <label className="tr-edit-label">Status</label>
                        <select
                          className="tr-edit-input"
                          value={editForm.hotel_status}
                          onChange={(e) => setEditForm((f) => ({ ...f, hotel_status: e.target.value }))}
                        >
                          {HOTEL_STATUSES.filter((s) => s.value !== 'all').map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                      {/* Confirmation Ref */}
                      <div>
                        <label className="tr-edit-label">Confirmation Ref</label>
                        <input
                          className="tr-edit-input"
                          placeholder="Supplier confirmation number"
                          value={editForm.hotel_confirmation_ref}
                          onChange={(e) => setEditForm((f) => ({ ...f, hotel_confirmation_ref: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="tr-edit-actions">
                      <button className="btn btn-success" onClick={() => saveEdit(item)}>Save</button>
                      <button className="btn btn-outline" onClick={cancelEdit}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
