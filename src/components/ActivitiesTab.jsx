import { useState, useEffect } from 'react'

export default function ActivitiesTab({ itinerary, onSave }) {
  const [openMenuIdx, setOpenMenuIdx] = useState(null)
  const [editingIdx, setEditingIdx] = useState(null)
  const [editForm, setEditForm] = useState({})

  // Close ⋮ menu on outside click
  useEffect(() => {
    const close = () => setOpenMenuIdx(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  // ── Flat list: all activities across all days ─────────────────────────
  const allActivities = itinerary.flatMap((row, rowIndex) =>
    (row.activities || []).map((a, actIndex) => ({
      ...a,
      date: row.date,
      day: row.day,
      city: row.city,
      rowIndex,
      actIndex,
    }))
  ).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))

  // ── Handlers ──────────────────────────────────────────────────────────
  const updateActivity = (rowIndex, actIndex, changes) => {
    const updated = itinerary.map((row, ri) => {
      if (ri !== rowIndex) return row
      return {
        ...row,
        activities: row.activities.map((a, ai) =>
          ai === actIndex ? { ...a, ...changes } : a
        ),
      }
    })
    onSave(updated)
  }

  const deleteActivity = (item) => {
    const updated = itinerary.map((row, ri) => {
      if (ri !== item.rowIndex) return row
      return {
        ...row,
        activities: row.activities.filter((_, ai) => ai !== item.actIndex),
      }
    })
    onSave(updated)
    setOpenMenuIdx(null)
    if (editingIdx !== null) setEditingIdx(null)
  }

  const startEdit = (item, idx) => {
    setEditForm({ time: item.time || '09:00' })
    setEditingIdx(idx)
    setOpenMenuIdx(null)
  }

  const saveEdit = (item) => {
    updateActivity(item.rowIndex, item.actIndex, editForm)
    setEditingIdx(null)
  }

  const cancelEdit = () => { setEditingIdx(null); setEditForm({}) }

  // ── Helpers ───────────────────────────────────────────────────────────
  const fmtDate = (dateStr) => {
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  }

  return (
    <div className="activities-tab">
      {/* ── Header ── */}
      <div className="activities-tab-header">
        <div className="activities-tab-title-row">
          <h3 className="activities-tab-title">All Activities</h3>
          <span className="activities-tab-count">{allActivities.length} total</span>
        </div>
      </div>

      {/* ── Empty state ── */}
      {allActivities.length === 0 ? (
        <div className="activities-empty">
          No activities yet. Add activities in the Itinerary tab.
        </div>
      ) : (
        <div className="activities-list">
          {/* Column headers */}
          <div className="activities-list-header">
            <span className="at-col-datetime">Day & Time</span>
            <span className="at-col-city">City</span>
            <span className="at-col-activity">Activity</span>
            <span className="at-col-unit">Price Unit</span>
            <span className="at-col-cost">Cost</span>
            <span className="at-col-menu" />
          </div>

          {allActivities.map((item, idx) => (
            <div key={idx}>
              {/* Main row */}
              <div className="activities-row">
                {/* Day, date & time */}
                <div className="at-datetime">
                  <span className="at-day">Day {item.day} · {fmtDate(item.date)}</span>
                  <span className="at-time">{item.time}</span>
                </div>

                {/* City */}
                <div className="at-city">{item.city || '—'}</div>

                {/* Activity name */}
                <div className="at-activity">
                  <span className="at-activity-name">{item.name}</span>
                </div>

                {/* Price unit badge */}
                <div className="at-unit">
                  <span className={`itin-type-badge ${item.price_unit === 'per person' ? 'transfer' : 'transport'}`}>
                    {item.price_unit === 'per person' ? 'Per person' : 'Per group'}
                  </span>
                </div>

                {/* Cost */}
                <div className="at-cost">€{Number(item.cost).toFixed(0)}</div>

                {/* ⋮ Menu */}
                <div className="at-actions">
                  <button
                    className="at-menu-btn"
                    title="Actions"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMenuIdx(openMenuIdx === idx ? null : idx)
                    }}
                  >⋮</button>

                  {openMenuIdx === idx && (
                    <div className="at-menu" onClick={(e) => e.stopPropagation()}>
                      <button className="at-menu-item" onClick={() => startEdit(item, idx)}>
                        ✏️ Edit time
                      </button>
                      <button className="at-menu-item danger" onClick={() => deleteActivity(item)}>
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Inline edit form */}
              {editingIdx === idx && (
                <div className="at-inline-edit">
                  <div className="tr-edit-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <div>
                      <label className="tr-edit-label">Time</label>
                      <input
                        type="time"
                        className="tr-edit-input"
                        value={editForm.time}
                        onChange={(e) => setEditForm((f) => ({ ...f, time: e.target.value }))}
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
