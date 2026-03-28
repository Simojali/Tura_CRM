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

export default function HotelsTab({ booking, itinerary = [], hotels = [], onSaveHotels }) {
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

  // No longer auto-populate full trip dates — dates are auto-filled based on hotel city

  // Group reference hotels by city for <optgroup>
  const hotelsByCity = useMemo(() => {
    return refHotels.reduce((acc, h) => {
      if (!acc[h.city]) acc[h.city] = []
      acc[h.city].push(h)
      return acc
    }, {})
  }, [refHotels])

  // ── Trip date bounds ─────────────────────────────────────────────────
  const tripStart = booking.check_in || ''
  const tripEnd = booking.check_out || ''

  // Split city appearances into contiguous blocks (handles gaps from other cities)
  const getCityBlocks = (city) => {
    if (!city || !itinerary.length) return []
    const cityRows = itinerary.filter((r) => r.city === city).sort((a, b) => a.date.localeCompare(b.date))
    if (cityRows.length === 0) return []

    const blocks = []
    let blockStart = cityRows[0]
    let blockEnd = cityRows[0]

    for (let i = 1; i < cityRows.length; i++) {
      const prev = new Date(blockEnd.date)
      const curr = new Date(cityRows[i].date)
      const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24))
      if (diffDays === 1) {
        blockEnd = cityRows[i]
      } else {
        blocks.push({ startRow: blockStart, endRow: blockEnd })
        blockStart = cityRows[i]
        blockEnd = cityRows[i]
      }
    }
    blocks.push({ startRow: blockStart, endRow: blockEnd })

    const lastItinDay = itinerary.reduce((max, r) => r.date > max ? r.date : max, itinerary[0]?.date || '')
    return blocks.map((b) => {
      const isLastDayOfTrip = b.endRow.date === lastItinDay
      let checkoutDate
      if (isLastDayOfTrip) {
        // Last day of trip = departure day, no overnight stay — checkout is that same day
        checkoutDate = b.endRow.date
      } else {
        // Mid-trip block: checkout = day after last city day
        const last = new Date(b.endRow.date)
        last.setDate(last.getDate() + 1)
        const mm = String(last.getMonth() + 1).padStart(2, '0')
        const dd = String(last.getDate()).padStart(2, '0')
        checkoutDate = `${last.getFullYear()}-${mm}-${dd}`
      }
      return {
        checkin: b.startRow.date,
        checkout: checkoutDate,
        dayIn: b.startRow.day,
        dayOut: isLastDayOfTrip ? b.endRow.day : b.endRow.day + 1,
      }
    })
  }

  // Find the first city block that doesn't already have a hotel covering it
  const getAvailableBlock = (city, excludeHotelId) => {
    const blocks = getCityBlocks(city)
    if (blocks.length === 0) return null
    const otherHotels = hotels.filter((h) => h.id !== excludeHotelId)
    return blocks.find((block) =>
      !otherHotels.some((h) => h.checkin === block.checkin && h.checkout === block.checkout)
    ) || blocks[0]
  }

  // Look up itinerary day number for a given date
  const getDayNum = (date) => {
    if (!date || !itinerary.length) return null
    const row = itinerary.find((r) => r.date === date)
    if (row) return row.day
    // For checkout dates (day after last night), find the previous day + 1
    const prev = new Date(date)
    prev.setDate(prev.getDate() - 1)
    const mm = String(prev.getMonth() + 1).padStart(2, '0')
    const dd = String(prev.getDate()).padStart(2, '0')
    const prevStr = `${prev.getFullYear()}-${mm}-${dd}`
    const prevRow = itinerary.find((r) => r.date === prevStr)
    return prevRow ? prevRow.day + 1 : null
  }

  // When a hotel is selected in the add form, auto-fill dates from its city
  const handleHotelSelect = (refId) => {
    const hotel = refHotels.find((h) => h.id === refId)
    if (hotel) {
      const block = getAvailableBlock(hotel.city)
      setAddForm((f) => ({
        ...f,
        refId,
        checkin: block?.checkin || f.checkin,
        checkout: block?.checkout || f.checkout,
      }))
    } else {
      setAddForm((f) => ({ ...f, refId }))
    }
  }

  // When a hotel is selected in the edit form, auto-fill dates from its city
  const handleEditHotelSelect = (refId) => {
    const hotel = refHotels.find((h) => h.id === refId)
    if (hotel) {
      const block = getAvailableBlock(hotel.city, editingId)
      setEditForm((f) => ({
        ...f,
        refId,
        checkin: block?.checkin || f.checkin,
        checkout: block?.checkout || f.checkout,
      }))
    } else {
      setEditForm((f) => ({ ...f, refId }))
    }
  }

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
      price_single: hotel.price_single || 0,
      price_double: hotel.price_double || 0,
      price_triple: hotel.price_triple || 0,
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
        price_single: hotel?.price_single || h.price_single || 0,
        price_double: hotel?.price_double || h.price_double || 0,
        price_triple: hotel?.price_triple || h.price_triple || 0,
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
              onChange={(e) => handleHotelSelect(e.target.value)}
            >
              <option value="">— Select hotel —</option>
              {renderHotelOptions()}
            </select>
          </div>

          <div className="tab-add-field">
            <label>Check-in {addForm.checkin && getDayNum(addForm.checkin) ? <span className="ht-day-badge">D{getDayNum(addForm.checkin)}</span> : ''}</label>
            <input
              type="date"
              className="tr-edit-input"
              value={addForm.checkin}
              min={tripStart}
              max={tripEnd}
              onChange={(e) => setAddForm((f) => ({ ...f, checkin: e.target.value }))}
            />
          </div>

          <div className="tab-add-field">
            <label>Check-out {addForm.checkout && getDayNum(addForm.checkout) ? <span className="ht-day-badge">D{getDayNum(addForm.checkout)}</span> : ''}</label>
            <input
              type="date"
              className="tr-edit-input"
              value={addForm.checkout}
              min={tripStart}
              max={tripEnd}
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
                    {fmtDate(entry.checkin)}{getDayNum(entry.checkin) ? ` (D${getDayNum(entry.checkin)})` : ''} → {fmtDate(entry.checkout)}{getDayNum(entry.checkout) ? ` (D${getDayNum(entry.checkout)})` : ''}
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
                        onChange={(e) => handleEditHotelSelect(e.target.value)}
                      >
                        <option value="">— Keep current —</option>
                        {renderHotelOptions()}
                      </select>
                    </div>
                    <div>
                      <label className="tr-edit-label">Check-in {editForm.checkin && getDayNum(editForm.checkin) ? <span className="ht-day-badge">D{getDayNum(editForm.checkin)}</span> : ''}</label>
                      <input
                        type="date"
                        className="tr-edit-input"
                        value={editForm.checkin}
                        min={tripStart}
                        max={tripEnd}
                        onChange={(e) => setEditForm((f) => ({ ...f, checkin: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="tr-edit-label">Check-out {editForm.checkout && getDayNum(editForm.checkout) ? <span className="ht-day-badge">D{getDayNum(editForm.checkout)}</span> : ''}</label>
                      <input
                        type="date"
                        className="tr-edit-input"
                        value={editForm.checkout}
                        min={tripStart}
                        max={tripEnd}
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
