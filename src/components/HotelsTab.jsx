import { useState, useEffect } from 'react'

const HOTEL_STATUSES = [
  { value: 'all',        label: 'All' },
  { value: 'requested',  label: 'Requested' },
  { value: 'confirmed',  label: 'Confirmed' },
  { value: 'cancelled',  label: 'Cancelled' },
]

const STATUS_LABELS = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
}

export default function HotelsTab({ booking, itinerary, onSave }) {
  const [filterStatus, setFilterStatus] = useState('all')
  const [openMenuIdx, setOpenMenuIdx] = useState(null)
  const [editingIdx, setEditingIdx] = useState(null)
  const [editForm, setEditForm] = useState({})

  // Close ⋮ menu on outside click
  useEffect(() => {
    const close = () => setOpenMenuIdx(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  // ── Flat list: days that have a hotel ─────────────────────────────────
  const hotelRows = itinerary
    .map((row, rowIndex) => ({ ...row, rowIndex }))
    .filter((row) => row.hotel_id)

  const filtered = filterStatus === 'all'
    ? hotelRows
    : hotelRows.filter((row) => (row.hotel_status || 'requested') === filterStatus)

  // ── Update a hotel row ────────────────────────────────────────────────
  const updateHotel = (rowIndex, changes) => {
    const updated = itinerary.map((row, ri) =>
      ri === rowIndex ? { ...row, ...changes } : row
    )
    onSave(updated)
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
    })
    setOpenMenuIdx(null)
    if (editingIdx !== null) setEditingIdx(null)
  }

  // ── Inline edit ───────────────────────────────────────────────────────
  const startEdit = (item, idx) => {
    setEditForm({
      hotel_status: item.hotel_status || 'requested',
      hotel_confirmation_ref: item.hotel_confirmation_ref || '',
    })
    setEditingIdx(idx)
    setOpenMenuIdx(null)
  }

  const saveEdit = (item) => {
    updateHotel(item.rowIndex, editForm)
    setEditingIdx(null)
  }

  const cancelEdit = () => { setEditingIdx(null); setEditForm({}) }

  // ── Helpers ───────────────────────────────────────────────────────────
  const fmtDate = (dateStr) => {
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
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

  return (
    <div className="hotels-tab">
      {/* ── Header ── */}
      <div className="hotels-tab-header">
        <div className="hotels-tab-title-row">
          <h3 className="hotels-tab-title">All Hotels</h3>
          <span className="hotels-tab-count">{hotelRows.length} total</span>
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

      {/* ── Empty state ── */}
      {hotelRows.length === 0 ? (
        <div className="hotels-empty">
          No hotels yet. Add hotels in the Itinerary tab.
        </div>
      ) : filtered.length === 0 ? (
        <div className="hotels-empty">No {filterStatus} hotels.</div>
      ) : (
        <div className="hotels-list">
          {/* Column headers */}
          <div className="hotels-list-header">
            <span className="ht-col-datetime">Day & Date</span>
            <span className="ht-col-city">City</span>
            <span className="ht-col-hotel">Hotel</span>
            <span className="ht-col-rooms">Rooms</span>
            <span className="ht-col-status">Status</span>
            <span className="ht-col-ref">Ref</span>
            <span className="ht-col-cost">Cost/night</span>
            <span className="ht-col-menu" />
          </div>

          {filtered.map((item, idx) => (
            <div key={idx}>
              {/* Main row */}
              <div className={`hotels-row${item.hotel_status === 'cancelled' ? ' cancelled' : ''}`}>
                {/* Day & Date */}
                <div className="ht-datetime">
                  <span className="ht-day">Day {item.day} · {fmtDate(item.date)}</span>
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
          ))}
        </div>
      )}
    </div>
  )
}
