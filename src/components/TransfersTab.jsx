import { useState, useEffect } from 'react'

const STATUSES = [
  { value: 'all',        label: 'All' },
  { value: 'requested',  label: 'Requested' },
  { value: 'confirmed',  label: 'Confirmed' },
  { value: 'done',       label: 'Done' },
  { value: 'cancelled',  label: 'Cancelled' },
]

const STATUS_LABELS = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  done: 'Done',
  cancelled: 'Cancelled',
}

export default function TransfersTab({ booking, itinerary, onSave }) {
  const [filterStatus, setFilterStatus] = useState('all')
  const [openMenuIdx, setOpenMenuIdx] = useState(null)
  const [editingIdx, setEditingIdx] = useState(null)
  const [editForm, setEditForm] = useState({})

  // Close ⋮ menu when clicking anywhere outside
  useEffect(() => {
    const close = () => setOpenMenuIdx(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  // ── Flat list: aggregate transfers from all days ──────────────────────
  const allTransfers = itinerary.flatMap((row, dayIndex) =>
    (row.transfers || []).map((t, transferIndex) => ({
      ...t,
      date: row.date,
      day: row.day,
      city: row.city,
      dayIndex,
      transferIndex,
    }))
  ).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))

  const filtered = filterStatus === 'all'
    ? allTransfers
    : allTransfers.filter((t) => (t.status || 'requested') === filterStatus)

  // ── Update a transfer item in the itinerary ───────────────────────────
  const updateTransfer = (dayIndex, transferIndex, changes) => {
    const updated = itinerary.map((row, ri) => {
      if (ri !== dayIndex) return row
      return {
        ...row,
        transfers: row.transfers.map((t, ti) =>
          ti === transferIndex ? { ...t, ...changes } : t
        ),
      }
    })
    onSave(updated)
  }

  // ── Quick status actions ───────────────────────────────────────────────
  const markStatus = (item, status) => {
    updateTransfer(item.dayIndex, item.transferIndex, { status })
    setOpenMenuIdx(null)
  }

  const deleteTransfer = (dayIndex, transferIndex) => {
    const updated = itinerary.map((row, ri) => {
      if (ri !== dayIndex) return row
      return {
        ...row,
        transfers: row.transfers.filter((_, ti) => ti !== transferIndex),
      }
    })
    onSave(updated)
    setOpenMenuIdx(null)
  }

  // ── Inline edit ───────────────────────────────────────────────────────
  const startEdit = (item, idx) => {
    setEditForm({
      time: item.time || '',
      status: item.status || 'requested',
      driver_name: item.driver_name || '',
      driver_phone: item.driver_phone || '',
      notes: item.notes || '',
    })
    setEditingIdx(idx)
    setOpenMenuIdx(null)
  }

  const saveEdit = (item) => {
    updateTransfer(item.dayIndex, item.transferIndex, editForm)
    setEditingIdx(null)
  }

  const cancelEdit = () => {
    setEditingIdx(null)
    setEditForm({})
  }

  // ── Date formatter ────────────────────────────────────────────────────
  const fmtDate = (dateStr) => {
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  }

  // ── Count per status for filter badges ───────────────────────────────
  const countByStatus = (status) =>
    allTransfers.filter((t) => (t.status || 'requested') === status).length

  return (
    <div className="transfers-tab">
      {/* ── Header ── */}
      <div className="transfers-tab-header">
        <div className="transfers-tab-title-row">
          <h3 className="transfers-tab-title">All Transfers & Transport</h3>
          <span className="transfers-tab-count">{allTransfers.length} total</span>
        </div>

        {/* Filter buttons */}
        <div className="transfers-filter-bar">
          {STATUSES.map((s) => {
            const cnt = s.value === 'all' ? allTransfers.length : countByStatus(s.value)
            return (
              <button
                key={s.value}
                className={`transfers-filter-btn${filterStatus === s.value ? ' active' : ''}`}
                onClick={() => setFilterStatus(s.value)}
              >
                {s.label}
                {cnt > 0 && <span className="tf-filter-count">{cnt}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Empty state ── */}
      {allTransfers.length === 0 ? (
        <div className="transfers-empty">
          No transfers yet. Add transfers in the Itinerary tab.
        </div>
      ) : filtered.length === 0 ? (
        <div className="transfers-empty">
          No {filterStatus} transfers.
        </div>
      ) : (
        <div className="transfers-list">
          {/* Column headers */}
          <div className="transfers-list-header">
            <span className="tr-col-datetime">Date & Time</span>
            <span className="tr-col-info">Transfer / Route</span>
            <span className="tr-col-driver">Driver</span>
            <span className="tr-col-status">Status</span>
            <span className="tr-col-cost">Cost</span>
            <span className="tr-col-menu" />
          </div>

          {filtered.map((item, idx) => (
            <div key={idx}>
              {/* Main row */}
              <div className={`transfers-row${item.status === 'cancelled' ? ' cancelled' : ''}`}>
                {/* Date & time */}
                <div className="tr-datetime">
                  <span className="tr-date">Day {item.day} · {fmtDate(item.date)}</span>
                  <span className="tr-time">{item.time}</span>
                  {item.city && <span className="tr-city">{item.city}</span>}
                </div>

                {/* Name & type */}
                <div className="tr-info">
                  <span className="tr-name">{item.name}</span>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {item.pax_label && <span className="tr-meta">{item.pax_label}</span>}
                    <span className={`itin-type-badge ${item.type}`}>
                      {item.type === 'transfer' ? 'Transfer' : 'Bus'}
                    </span>
                  </div>
                </div>

                {/* Driver */}
                <div className="tr-driver">
                  {item.driver_name ? (
                    <>
                      <span className="tr-driver-name">👤 {item.driver_name}</span>
                      {item.driver_phone && (
                        <span className="tr-driver-phone">{item.driver_phone}</span>
                      )}
                    </>
                  ) : (
                    <span className="tr-driver-empty">—</span>
                  )}
                </div>

                {/* Status badge */}
                <div className="tr-status">
                  <span className={`itin-status-badge status-${item.status || 'requested'}`}>
                    {STATUS_LABELS[item.status || 'requested']}
                  </span>
                </div>

                {/* Cost */}
                <div className="tr-cost">€{Number(item.cost).toFixed(0)}</div>

                {/* ⋮ Menu */}
                <div className="tr-actions">
                  <button
                    className="tr-menu-btn"
                    title="Actions"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMenuIdx(openMenuIdx === idx ? null : idx)
                    }}
                  >⋮</button>

                  {openMenuIdx === idx && (
                    <div className="tr-menu" onClick={(e) => e.stopPropagation()}>
                      {item.status !== 'confirmed' && (
                        <button className="tr-menu-item" onClick={() => markStatus(item, 'confirmed')}>
                          ✅ Mark Confirmed
                        </button>
                      )}
                      {item.status !== 'done' && (
                        <button className="tr-menu-item" onClick={() => markStatus(item, 'done')}>
                          ✔ Mark Done
                        </button>
                      )}
                      <button className="tr-menu-item" onClick={() => startEdit(item, idx)}>
                        ✏️ Edit
                      </button>
                      {item.status !== 'cancelled' && (
                        <button
                          className="tr-menu-item danger"
                          onClick={() => markStatus(item, 'cancelled')}
                        >
                          ✕ Cancel
                        </button>
                      )}
                      {item.status === 'cancelled' && (
                        <button className="tr-menu-item" onClick={() => markStatus(item, 'requested')}>
                          ↺ Restore
                        </button>
                      )}
                      <button
                        className="tr-menu-item danger"
                        onClick={() => deleteTransfer(item.dayIndex, item.transferIndex)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Inline edit form */}
              {editingIdx === idx && (
                <div className="tr-inline-edit">
                  <div className="tr-edit-grid">
                    <div>
                      <label className="tr-edit-label">Time</label>
                      <input
                        type="time"
                        className="tr-edit-input"
                        value={editForm.time}
                        onChange={(e) => setEditForm((f) => ({ ...f, time: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="tr-edit-label">Status</label>
                      <select
                        className="tr-edit-input"
                        value={editForm.status}
                        onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                      >
                        {STATUSES.filter((s) => s.value !== 'all').map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="tr-edit-label">Driver name</label>
                      <input
                        className="tr-edit-input"
                        placeholder="Driver name"
                        value={editForm.driver_name}
                        onChange={(e) => setEditForm((f) => ({ ...f, driver_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="tr-edit-label">Driver phone</label>
                      <input
                        className="tr-edit-input"
                        placeholder="+212 6xx xxx xxx"
                        value={editForm.driver_phone}
                        onChange={(e) => setEditForm((f) => ({ ...f, driver_phone: e.target.value }))}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="tr-edit-label">Notes</label>
                      <textarea
                        className="tr-edit-input"
                        rows={2}
                        placeholder="Special instructions, pickup details…"
                        value={editForm.notes}
                        onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="tr-edit-actions">
                    <button className="btn btn-success" onClick={() => saveEdit(item)}>Save</button>
                    <button className="btn btn-outline" onClick={cancelEdit}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Notes display in view mode */}
              {editingIdx !== idx && item.notes && (
                <div className="tr-notes-row">📝 {item.notes}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
