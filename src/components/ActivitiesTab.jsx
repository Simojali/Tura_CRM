import { useState, useEffect } from 'react'
import { MOCK_REFERENCE_DATA } from '../lib/referenceData'

const activities = MOCK_REFERENCE_DATA.filter((r) => r.category === 'activity')

// Group activities by city for <optgroup> display
const activitiesByCity = activities.reduce((acc, a) => {
  if (!acc[a.city]) acc[a.city] = []
  acc[a.city].push(a)
  return acc
}, {})

const actLabel = (a) =>
  `${a.name} (${a.price_unit === 'per person' ? `€${a.price}/pp` : `€${a.price}/group`})`

export default function ActivitiesTab({ booking, itinerary, onSave }) {
  const [openMenuIdx, setOpenMenuIdx] = useState(null)
  const [editingIdx, setEditingIdx] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ dayIdx: '', actId: '', time: '09:00' })

  // Close ⋮ menu on outside click
  useEffect(() => {
    const close = () => setOpenMenuIdx(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  // ── Cost calculation ───────────────────────────────────────────────────
  const guests = Math.max(Number(booking?.number_of_guests) || 1, 1)
  const calcActivityCost = (act) =>
    act.price_unit === 'per person' ? (act.price || 0) * guests : (act.price || 0)

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

  const addActivity = () => {
    const { dayIdx, actId, time } = addForm
    if (dayIdx === '' || !actId) return
    const act = activities.find((a) => a.id === actId)
    if (!act) return
    const cost = calcActivityCost(act)
    const updated = itinerary.map((row, ri) => {
      if (ri !== Number(dayIdx)) return row
      const current = row.activities || []
      if (current.some((a) => a.id === actId)) return row  // duplicate guard
      return {
        ...row,
        activities: [...current, { id: act.id, name: act.name, cost, price_unit: act.price_unit, time }]
          .sort((a, b) => a.time.localeCompare(b.time)),
      }
    })
    onSave(updated)
    setShowAddForm(false)
    setAddForm({ dayIdx: '', actId: '', time: '09:00' })
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
    setEditForm({ time: item.time || '09:00', actId: item.id || '' })
    setEditingIdx(idx)
    setOpenMenuIdx(null)
  }

  const saveEdit = (item) => {
    const act = activities.find((a) => a.id === editForm.actId)
    const changes = { time: editForm.time }
    if (act && editForm.actId !== item.id) {
      const cost = calcActivityCost(act)
      Object.assign(changes, { id: act.id, name: act.name, cost, price_unit: act.price_unit })
    }
    updateActivity(item.rowIndex, item.actIndex, changes)
    setEditingIdx(null)
  }

  const cancelEdit = () => { setEditingIdx(null); setEditForm({}) }

  // ── Helpers ───────────────────────────────────────────────────────────
  const fmtDate = (dateStr) => {
    if (!dateStr) return ''
    const [y, m, day] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  }

  // Activity options for add form: filter by day's city or show all grouped
  const selectedDayForAdd = addForm.dayIdx !== '' ? itinerary[Number(addForm.dayIdx)] : null
  const addFormCity = selectedDayForAdd?.city || ''

  const renderActivityOptions = (filterCity) => {
    const cityActs = filterCity ? activities.filter((a) => a.city === filterCity) : []
    if (cityActs.length > 0) {
      return cityActs.map((a) => <option key={a.id} value={a.id}>{actLabel(a)}</option>)
    }
    // No city set, or city has no activities → show all grouped by city
    return Object.entries(activitiesByCity).map(([city, acts]) => (
      <optgroup key={city} label={city}>
        {acts.map((a) => <option key={a.id} value={a.id}>{actLabel(a)}</option>)}
      </optgroup>
    ))
  }

  return (
    <div className="activities-tab">

      {/* ── Header ── */}
      <div className="activities-tab-header">
        <div className="activities-tab-title-row">
          <h3 className="activities-tab-title">All Activities</h3>
          <span className="activities-tab-count">{allActivities.length} total</span>
          <button
            className="btn btn-primary"
            style={{ marginLeft: 'auto' }}
            onClick={() => { setShowAddForm(true); setEditingIdx(null) }}
          >
            + Add Activity
          </button>
        </div>
      </div>

      {/* ── Add form ── */}
      {showAddForm && (
        <div className="tab-add-form">
          <div className="tab-add-form-title">Add Activity to Day</div>

          {/* Day */}
          <div className="tab-add-field">
            <label>Day</label>
            <select
              className="tr-edit-input"
              value={addForm.dayIdx}
              onChange={(e) => setAddForm((f) => ({ ...f, dayIdx: e.target.value, actId: '' }))}
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

          {/* Activity */}
          <div className="tab-add-field wide">
            <label>Activity</label>
            <select
              className="tr-edit-input"
              value={addForm.actId}
              disabled={addForm.dayIdx === ''}
              onChange={(e) => setAddForm((f) => ({ ...f, actId: e.target.value }))}
            >
              <option value="">— Select activity —</option>
              {renderActivityOptions(addFormCity)}
            </select>
          </div>

          <div className="tab-add-actions">
            <button
              className="btn btn-success"
              disabled={addForm.dayIdx === '' || !addForm.actId}
              onClick={addActivity}
            >Save</button>
            <button className="btn btn-outline" onClick={() => {
              setShowAddForm(false)
              setAddForm({ dayIdx: '', actId: '', time: '09:00' })
            }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {allActivities.length === 0 ? (
        <div className="activities-empty">
          No activities yet. Click <strong>+ Add Activity</strong> above to add activities to any day.
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
                        ✏️ Edit
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
                  <div className="tr-edit-grid">
                    {/* Activity picker */}
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="tr-edit-label">Activity</label>
                      <select
                        className="tr-edit-input"
                        value={editForm.actId}
                        onChange={(e) => setEditForm((f) => ({ ...f, actId: e.target.value }))}
                      >
                        <option value="">— Keep current activity —</option>
                        {item.city ? (
                          activities
                            .filter((a) => a.city === item.city)
                            .map((a) => <option key={a.id} value={a.id}>{actLabel(a)}</option>)
                        ) : (
                          Object.entries(activitiesByCity).map(([city, cityActs]) => (
                            <optgroup key={city} label={city}>
                              {cityActs.map((a) => <option key={a.id} value={a.id}>{actLabel(a)}</option>)}
                            </optgroup>
                          ))
                        )}
                      </select>
                    </div>
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
