import { useState, useEffect } from 'react'
import { CITIES } from '../lib/referenceData'
import { computeDayCost } from '../lib/itineraryUtils'

export default function ItineraryTable({ booking, refItems, itinerary, onSave }) {
  const [editMode, setEditMode] = useState(false)
  const [rows, setRows] = useState(itinerary)
  const [selectedDay, setSelectedDay] = useState(0)
  const [openSections, setOpenSections] = useState({ hotel: true, activities: true, transfers: true })

  // Pending add-item state for edit mode
  const [pendingActivity, setPendingActivity] = useState({ id: '', time: '09:00' })
  const [pendingTransfer, setPendingTransfer] = useState({ id: '', time: '09:00' })

  // Sync rows when parent updates itinerary
  useEffect(() => {
    if (!editMode) setRows(itinerary)
  }, [itinerary]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep selectedDay in bounds when rows change
  useEffect(() => {
    if (selectedDay >= rows.length && rows.length > 0) setSelectedDay(0)
  }, [rows.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reference data slices ──────────────────────────────────────────────
  const hotels    = refItems.filter((r) => r.category === 'hotel')
  const transfers = refItems.filter((r) => r.category === 'transfer')
  const activities = refItems.filter((r) => r.category === 'activity')
  const transports = refItems.filter((r) => r.category === 'transport')

  const hotelsForCity     = (city) => hotels.filter((h) => h.city === city)
  const transfersForCity  = (city) => transfers.filter((t) => t.city === city)
  const activitiesForCity = (city) => activities.filter((a) => a.city === city)

  // ── Row update helper ──────────────────────────────────────────────────
  const updateRow = (index, changes) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...changes } : r)))

  // ── City change (clears hotel + activities + transfers for that day) ───
  const handleCityChange = (index, city) => {
    updateRow(index, {
      city,
      hotel_id: null, hotel_name: null, hotel_tier: null, hotel_cost: 0,
      activities: [],
      transfers: [],
    })
  }

  // ── Hotel ──────────────────────────────────────────────────────────────
  const selectHotel = (index, hotelId) => {
    if (!hotelId) {
      updateRow(index, { hotel_id: null, hotel_name: null, hotel_tier: null, hotel_cost: 0 })
      return
    }
    const hotel = hotels.find((h) => h.id === hotelId)
    if (!hotel) return
    const s = Number(booking.single_rooms) || 0
    const d = Number(booking.double_rooms) || 0
    const t = Number(booking.triple_rooms) || 0
    const cost = s * (hotel.price_single || 0) + d * (hotel.price_double || 0) + t * (hotel.price_triple || 0)
    updateRow(index, { hotel_id: hotelId, hotel_name: hotel.name, hotel_tier: hotel.tier || null, hotel_cost: cost })
  }

  // ── Activities ─────────────────────────────────────────────────────────
  const addActivity = (index) => {
    const { id, time } = pendingActivity
    if (!id) return
    const activity = activities.find((a) => a.id === id)
    if (!activity) return
    const current = rows[index].activities || []
    if (current.some((a) => a.id === id)) return
    const guests = Math.max(Number(booking.number_of_guests) || 1, 1)
    const cost = activity.price_unit === 'per person'
      ? (activity.price || 0) * guests
      : (activity.price || 0)
    const updated = [...current, { id: activity.id, name: activity.name, cost, price_unit: activity.price_unit, time }]
      .sort((a, b) => a.time.localeCompare(b.time))
    updateRow(index, { activities: updated })
    setPendingActivity({ id: '', time: '09:00' })
  }

  const removeActivity = (rowIndex, activityId) =>
    updateRow(rowIndex, { activities: rows[rowIndex].activities.filter((a) => a.id !== activityId) })

  // ── Transfers & Transport ──────────────────────────────────────────────
  const addTransfer = (index) => {
    const { id, time } = pendingTransfer
    if (!id) return
    const [category, refId] = id.split(':')
    const pool = category === 'transfer' ? transfers : transports
    const item = pool.find((t) => t.id === refId)
    if (!item) return
    const current = rows[index].transfers || []
    const updated = [
      ...current,
      {
        id: refId,
        name: item.name,
        cost: item.price || 0,
        type: category,
        time,
        pax_label: item.pax_label || null,
      },
    ].sort((a, b) => a.time.localeCompare(b.time))
    updateRow(index, { transfers: updated })
    setPendingTransfer({ id: '', time: '09:00' })
  }

  const removeTransfer = (rowIndex, transferIdx) => {
    const updated = rows[rowIndex].transfers.filter((_, i) => i !== transferIdx)
    updateRow(rowIndex, { transfers: updated })
  }

  // ── Section toggle ─────────────────────────────────────────────────────
  const toggleSection = (key) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))

  // ── Save / Cancel ──────────────────────────────────────────────────────
  const handleSave = () => { onSave(rows); setEditMode(false) }
  const handleCancel = () => { setRows(itinerary); setEditMode(false) }

  // ── Date formatter ─────────────────────────────────────────────────────
  const fmtLong = (dateStr) => {
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  const fmtShort = (dateStr) => {
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  }

  const row = rows[selectedDay]

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="itinerary-section">
      <div className="itinerary-header">
        <h3 className="itinerary-title">Day-by-Day Itinerary</h3>
        <div className="itinerary-header-actions">
          {editMode ? (
            <>
              <button className="btn btn-success" onClick={handleSave}>Save Itinerary</button>
              <button className="btn btn-outline" onClick={handleCancel}>Cancel</button>
            </>
          ) : (
            <button className="btn btn-outline itinerary-edit-btn" onClick={() => setEditMode(true)}>
              ✏️ Edit Itinerary
            </button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="itinerary-empty">
          No days defined yet. Set a Check-in date and number of days on the booking to build an itinerary.
        </div>
      ) : (
        <div className="itinerary-layout">
          {/* ── Left: Day List ── */}
          <div className="itinerary-day-list">
            {rows.map((r, i) => (
              <button
                key={i}
                className={`itinerary-day-card${i === selectedDay ? ' active' : ''}`}
                onClick={() => setSelectedDay(i)}
              >
                <span className="idc-day">Day {r.day}</span>
                <span className="idc-date">{fmtShort(r.date)}</span>
                {r.city && <span className="idc-city">{r.city}</span>}
                <div className="idc-dots">
                  {(r.hotel_id || r.activities.length > 0 || r.transfers.length > 0) && (
                    <>
                      {r.hotel_id    && <span className="idc-dot dot-hotel" title="Hotel" />}
                      {r.activities.length > 0 && <span className="idc-dot dot-activity" title="Activities" />}
                      {r.transfers.length  > 0 && <span className="idc-dot dot-transfer" title="Transfers" />}
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* ── Right: Day Detail ── */}
          {row && (
            <div className="itinerary-day-detail">
              {/* Header */}
              <div className="itin-detail-header">
                <div className="itin-detail-left">
                  <span className="itin-detail-date">{fmtLong(row.date)}</span>
                  {editMode ? (
                    <select
                      className="itin-city-select"
                      value={row.city}
                      onChange={(e) => handleCityChange(selectedDay, e.target.value)}
                    >
                      <option value="">— City —</option>
                      {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    row.city
                      ? <span className="itin-detail-city">{row.city}</span>
                      : <span className="itin-detail-city muted">No city selected</span>
                  )}
                </div>
                <span className="itin-day-cost-badge">
                  Day total: €{computeDayCost(row).toFixed(0)}
                </span>
              </div>

              {/* ── Hotel Section ── */}
              <div className="itin-section">
                <button className="itin-section-header" onClick={() => toggleSection('hotel')}>
                  <span className="itin-section-icon">🏨</span>
                  <span className="itin-section-title">Hotel</span>
                  <span className="itin-section-count">{row.hotel_id ? 1 : 0}</span>
                  <span className={`itin-section-chevron${openSections.hotel ? ' open' : ''}`}>›</span>
                </button>
                <div className={`itin-section-body${openSections.hotel ? ' open' : ''}`}>
                  <div className="itin-section-inner">
                    {editMode ? (
                      <div className="itin-add-row">
                        <select
                          className="itin-field-select"
                          value={row.hotel_id || ''}
                          onChange={(e) => selectHotel(selectedDay, e.target.value)}
                          disabled={!row.city}
                        >
                          <option value="">— Select hotel —</option>
                          {hotelsForCity(row.city).map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.name}{h.tier ? ` · ${h.tier}` : ''}
                            </option>
                          ))}
                        </select>
                        {!row.city && <span className="itin-hint">Select a city first</span>}
                      </div>
                    ) : null}

                    {row.hotel_id ? (
                      <div className="itin-hotel-card">
                        <div className="itin-hotel-name">
                          {row.hotel_name}
                          {editMode && (
                            <button
                              className="itin-remove-btn"
                              onClick={() => selectHotel(selectedDay, '')}
                            >×</button>
                          )}
                        </div>
                        {row.hotel_tier && <div className="itin-hotel-tier">{row.hotel_tier}</div>}
                        <div className="itin-hotel-rooms">
                          {[
                            Number(booking.single_rooms) > 0 && `${booking.single_rooms}× Single`,
                            Number(booking.double_rooms) > 0 && `${booking.double_rooms}× Double`,
                            Number(booking.triple_rooms) > 0 && `${booking.triple_rooms}× Triple`,
                          ].filter(Boolean).join(' · ')}
                          <span className="itin-item-cost"> €{Number(row.hotel_cost).toFixed(0)}/night</span>
                        </div>
                      </div>
                    ) : !editMode ? (
                      <div className="itin-empty-section">No hotel selected</div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* ── Activities Section ── */}
              <div className="itin-section">
                <button className="itin-section-header" onClick={() => toggleSection('activities')}>
                  <span className="itin-section-icon">🎯</span>
                  <span className="itin-section-title">Activities</span>
                  <span className="itin-section-count">{row.activities.length}</span>
                  <span className={`itin-section-chevron${openSections.activities ? ' open' : ''}`}>›</span>
                </button>
                <div className={`itin-section-body${openSections.activities ? ' open' : ''}`}>
                  <div className="itin-section-inner">
                    {row.activities.map((a, ai) => (
                      <div key={ai} className="itin-timeline-item">
                        <span className="itin-time-badge">{a.time}</span>
                        <div className="itin-item-info">
                          <span className="itin-item-name">{a.name}</span>
                          <span className="itin-item-meta">{a.price_unit}</span>
                        </div>
                        <span className="itin-item-cost">€{Number(a.cost).toFixed(0)}</span>
                        {editMode && (
                          <button className="itin-remove-btn" onClick={() => removeActivity(selectedDay, a.id)}>×</button>
                        )}
                      </div>
                    ))}

                    {row.activities.length === 0 && !editMode && (
                      <div className="itin-empty-section">No activities</div>
                    )}

                    {editMode && (
                      <div className="itin-add-row">
                        <input
                          type="time"
                          className="itin-time-input"
                          value={pendingActivity.time}
                          onChange={(e) => setPendingActivity((p) => ({ ...p, time: e.target.value }))}
                        />
                        <select
                          className="itin-field-select"
                          value={pendingActivity.id}
                          onChange={(e) => setPendingActivity((p) => ({ ...p, id: e.target.value }))}
                          disabled={!row.city}
                        >
                          <option value="">— Add activity —</option>
                          {activitiesForCity(row.city).map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.price_unit === 'per person' ? `€${a.price}/pp` : `€${a.price}`})
                            </option>
                          ))}
                        </select>
                        <button
                          className="itin-add-btn"
                          onClick={() => addActivity(selectedDay)}
                          disabled={!pendingActivity.id}
                        >+ Add</button>
                        {!row.city && <span className="itin-hint">Select a city first</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Transfers & Transport Section ── */}
              <div className="itin-section">
                <button className="itin-section-header" onClick={() => toggleSection('transfers')}>
                  <span className="itin-section-icon">🚌</span>
                  <span className="itin-section-title">Transfers & Transport</span>
                  <span className="itin-section-count">{row.transfers.length}</span>
                  <span className={`itin-section-chevron${openSections.transfers ? ' open' : ''}`}>›</span>
                </button>
                <div className={`itin-section-body${openSections.transfers ? ' open' : ''}`}>
                  <div className="itin-section-inner">
                    {row.transfers.map((t, ti) => (
                      <div key={ti} className="itin-timeline-item">
                        <span className="itin-time-badge">{t.time}</span>
                        <div className="itin-item-info">
                          <span className="itin-item-name">{t.name}</span>
                          {t.pax_label && <span className="itin-item-meta">{t.pax_label}</span>}
                        </div>
                        <span className={`itin-type-badge ${t.type}`}>
                          {t.type === 'transfer' ? 'Transfer' : 'Bus'}
                        </span>
                        <span className="itin-item-cost">€{Number(t.cost).toFixed(0)}</span>
                        {editMode && (
                          <button className="itin-remove-btn" onClick={() => removeTransfer(selectedDay, ti)}>×</button>
                        )}
                      </div>
                    ))}

                    {row.transfers.length === 0 && !editMode && (
                      <div className="itin-empty-section">No transfers or transport</div>
                    )}

                    {editMode && (
                      <div className="itin-add-row">
                        <input
                          type="time"
                          className="itin-time-input"
                          value={pendingTransfer.time}
                          onChange={(e) => setPendingTransfer((p) => ({ ...p, time: e.target.value }))}
                        />
                        <select
                          className="itin-field-select"
                          value={pendingTransfer.id}
                          onChange={(e) => setPendingTransfer((p) => ({ ...p, id: e.target.value }))}
                        >
                          <option value="">— Add transfer / transport —</option>
                          {row.city && transfersForCity(row.city).length > 0 && (
                            <optgroup label={`Transfers — ${row.city}`}>
                              {transfersForCity(row.city).map((t) => (
                                <option key={`transfer:${t.id}`} value={`transfer:${t.id}`}>
                                  {t.name}{t.pax_label ? ` (${t.pax_label})` : ''}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          <optgroup label="Transport (all routes)">
                            {transports.map((t) => (
                              <option key={`transport:${t.id}`} value={`transport:${t.id}`}>
                                {t.name}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                        <button
                          className="itin-add-btn"
                          onClick={() => addTransfer(selectedDay)}
                          disabled={!pendingTransfer.id}
                        >+ Add</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
