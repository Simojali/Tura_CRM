import { useState, useEffect, useMemo } from 'react'
import { MOCK_REFERENCE_DATA } from '../lib/referenceData'
import { fmtDate, fmtCost } from '../lib/formatters'
import { TRANSFER_STATUS_LABELS as STATUS_LABELS } from '../lib/constants'

const refTransfers = MOCK_REFERENCE_DATA.filter((r) => r.category === 'transfer')
const refTransports = MOCK_REFERENCE_DATA.filter((r) => r.category === 'transport')

const STATUSES = [
  { value: 'all',        label: 'All' },
  { value: 'requested',  label: 'Requested' },
  { value: 'confirmed',  label: 'Confirmed' },
  { value: 'done',       label: 'Done' },
  { value: 'cancelled',  label: 'Cancelled' },
]

const EMPTY_ADD_FORM = {
  dayIdx: '', transferId: '', time: '09:00',
  status: 'requested', driverName: '', driverPhone: '',
  fromLocation: '', toLocation: '',
}

export default function TransfersTab({ booking: _booking, itinerary, onSave }) {
  const [filterStatus, setFilterStatus] = useState('all')
  const [openMenuIdx, setOpenMenuIdx] = useState(null)
  const [editingIdx, setEditingIdx] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM)

  // Close ⋮ menu when clicking anywhere outside
  useEffect(() => {
    const close = () => setOpenMenuIdx(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  // ── Flat list: aggregate transfers from all days ──────────────────────
  const allTransfers = useMemo(() =>
    itinerary.flatMap((row, dayIndex) =>
      (row.transfers || []).map((t, transferIndex) => ({
        ...t,
        date: row.date,
        day: row.day,
        city: row.city,
        dayIndex,
        transferIndex,
      }))
    ).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)),
    [itinerary]
  )

  const filtered = useMemo(() =>
    filterStatus === 'all'
      ? allTransfers
      : allTransfers.filter((t) => (t.status || 'requested') === filterStatus),
    [allTransfers, filterStatus]
  )

  // ── Update a transfer item in the itinerary ───────────────────────────
  const updateTransfer = (dayIndex, transferIndex, changes) => {
    const updated = itinerary.map((row, ri) => {
      if (ri !== dayIndex) return row
      return {
        ...row,
        transfers: row.transfers.map((t, ti) =>
          ti !== transferIndex ? t : { ...t, ...changes }
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

  const deleteTransfer = (dayIndex, transferIndex, transferName) => {
    if (!window.confirm(`Delete transfer "${transferName || 'this transfer'}"? This cannot be undone.`)) return
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

  // ── Add transfer / transport ──────────────────────────────────────────
  const addTransferItem = () => {
    const { dayIdx, transferId, time, status, driverName, driverPhone, fromLocation, toLocation } = addForm
    if (dayIdx === '' || !transferId) return
    const [category, refId] = transferId.split(':')
    const pool = category === 'transfer' ? refTransfers : refTransports
    const item = pool.find((r) => r.id === refId)
    if (!item) return
    const updated = itinerary.map((row, ri) => {
      if (ri !== Number(dayIdx)) return row
      return {
        ...row,
        transfers: [...(row.transfers || []), {
          id: refId,
          name: item.name,
          cost: item.price || 0,
          type: category,
          time,
          pax_label: item.pax_label || null,
          status,
          driver_name: driverName,
          driver_phone: driverPhone,
          from_location: fromLocation,
          to_location: toLocation,
          notes: '',
        }].sort((a, b) => a.time.localeCompare(b.time)),
      }
    })
    onSave(updated)
    setShowAddForm(false)
    setAddForm(EMPTY_ADD_FORM)
  }

  // ── Inline edit ───────────────────────────────────────────────────────
  const startEdit = (item, idx) => {
    setEditForm({
      time: item.time || '',
      status: item.status || 'requested',
      from_location: item.from_location || '',
      to_location: item.to_location || '',
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
          <button
            className="btn btn-primary"
            style={{ marginLeft: 'auto' }}
            onClick={() => { setShowAddForm(true); setEditingIdx(null) }}
          >
            + Add Transfer
          </button>
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

      {/* ── Add form ── */}
      {showAddForm && (() => {
        const selDay = addForm.dayIdx !== '' ? itinerary[Number(addForm.dayIdx)] : null
        const selCity = selDay?.city || ''
        const cityTransfers = selCity ? refTransfers.filter((r) => r.city === selCity) : []
        return (
          <div className="tab-add-form">
            <div className="tab-add-form-title">Add Transfer / Transport to Day</div>

            {/* Day */}
            <div className="tab-add-field">
              <label>Day</label>
              <select
                className="tr-edit-input"
                value={addForm.dayIdx}
                onChange={(e) => setAddForm((f) => ({ ...f, dayIdx: e.target.value, transferId: '' }))}
              >
                <option value="">— Select day —</option>
                {itinerary.map((row, i) => (
                  <option key={i} value={i}>
                    Day {row.day} · {fmtDate(row.date)}{row.city ? ` · ${row.city}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Time */}
            <div className="tab-add-field">
              <label>Time</label>
              <input
                type="time"
                className="tr-edit-input"
                value={addForm.time}
                onChange={(e) => setAddForm((f) => ({ ...f, time: e.target.value }))}
              />
            </div>

            {/* Transfer / Transport picker */}
            <div className="tab-add-field wide">
              <label>Transfer / Transport</label>
              <select
                className="tr-edit-input"
                value={addForm.transferId}
                disabled={addForm.dayIdx === ''}
                onChange={(e) => setAddForm((f) => ({ ...f, transferId: e.target.value }))}
              >
                <option value="">— Select transfer or transport —</option>
                {cityTransfers.length > 0 && (
                  <optgroup label={`Transfers — ${selCity}`}>
                    {cityTransfers.map((r) => (
                      <option key={`transfer:${r.id}`} value={`transfer:${r.id}`}>
                        {r.name}{r.pax_label ? ` (${r.pax_label})` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Transport (all routes)">
                  {refTransports.map((r) => (
                    <option key={`transport:${r.id}`} value={`transport:${r.id}`}>
                      {r.name}{r.pax_label ? ` (${r.pax_label})` : ''}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Route: From */}
            <div className="tab-add-field">
              <label>From (Pickup)</label>
              <input
                className="tr-edit-input"
                placeholder="e.g. Marrakech Airport"
                value={addForm.fromLocation}
                onChange={(e) => setAddForm((f) => ({ ...f, fromLocation: e.target.value }))}
              />
            </div>

            {/* Route: To */}
            <div className="tab-add-field">
              <label>To (Dropoff)</label>
              <input
                className="tr-edit-input"
                placeholder="e.g. Hotel Kenzi Menara"
                value={addForm.toLocation}
                onChange={(e) => setAddForm((f) => ({ ...f, toLocation: e.target.value }))}
              />
            </div>

            {/* Status */}
            <div className="tab-add-field">
              <label>Status</label>
              <select
                className="tr-edit-input"
                value={addForm.status}
                onChange={(e) => setAddForm((f) => ({ ...f, status: e.target.value }))}
              >
                {STATUSES.filter((s) => s.value !== 'all').map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Driver Name */}
            <div className="tab-add-field">
              <label>Driver Name</label>
              <input
                className="tr-edit-input"
                placeholder="Optional"
                value={addForm.driverName}
                onChange={(e) => setAddForm((f) => ({ ...f, driverName: e.target.value }))}
              />
            </div>

            {/* Driver Phone */}
            <div className="tab-add-field">
              <label>Driver Phone</label>
              <input
                className="tr-edit-input"
                placeholder="+212 6xx xxx xxx"
                value={addForm.driverPhone}
                onChange={(e) => setAddForm((f) => ({ ...f, driverPhone: e.target.value }))}
              />
            </div>

            <div className="tab-add-actions">
              <button
                className="btn btn-success"
                disabled={addForm.dayIdx === '' || !addForm.transferId}
                onClick={addTransferItem}
              >Save</button>
              <button className="btn btn-outline" onClick={() => {
                setShowAddForm(false)
                setAddForm(EMPTY_ADD_FORM)
              }}>Cancel</button>
            </div>
          </div>
        )
      })()}

      {/* ── Empty state ── */}
      {allTransfers.length === 0 ? (
        <div className="transfers-empty">
          No transfers yet. Click <strong>+ Add Transfer</strong> above to add transfers to any day.
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

                {/* Name, route & type */}
                <div className="tr-info">
                  <span className="tr-name">{item.name}</span>
                  {(item.from_location || item.to_location) && (
                    <span className="tr-route">
                      {item.from_location || '?'} → {item.to_location || '?'}
                    </span>
                  )}
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
                <div className="tr-cost">{fmtCost(item.cost)}</div>

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
                        onClick={() => deleteTransfer(item.dayIndex, item.transferIndex, item.name)}
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
                      <label className="tr-edit-label">From (Pickup)</label>
                      <input
                        className="tr-edit-input"
                        placeholder="e.g. Marrakech Airport"
                        value={editForm.from_location}
                        onChange={(e) => setEditForm((f) => ({ ...f, from_location: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="tr-edit-label">To (Dropoff)</label>
                      <input
                        className="tr-edit-input"
                        placeholder="e.g. Hotel Kenzi Menara"
                        value={editForm.to_location}
                        onChange={(e) => setEditForm((f) => ({ ...f, to_location: e.target.value }))}
                      />
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
