import { useState, useEffect } from 'react'
import { CITIES } from '../lib/referenceData'
import { computeDayCost } from '../lib/itineraryUtils'

export default function ItineraryTable({ booking, refItems, itinerary, onSave }) {
  const [editMode, setEditMode] = useState(false)
  const [rows, setRows] = useState(itinerary)

  // Sync rows when parent updates itinerary (e.g., on initial load)
  useEffect(() => {
    if (!editMode) setRows(itinerary)
  }, [itinerary]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reference data slices ──────────────────────────────────────────────
  const hotels = refItems.filter((r) => r.category === 'hotel')
  const transfers = refItems.filter((r) => r.category === 'transfer')
  const activities = refItems.filter((r) => r.category === 'activity')
  const transports = refItems.filter((r) => r.category === 'transport')

  const hotelsForCity = (city) => hotels.filter((h) => h.city === city)
  const transfersForCity = (city) => transfers.filter((t) => t.city === city)
  const activitiesForCity = (city) => activities.filter((a) => a.city === city)

  // ── Row update helpers ─────────────────────────────────────────────────
  const updateRow = (index, changes) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...changes } : r)))

  const handleCityChange = (index, city) => {
    updateRow(index, {
      city,
      hotel_id: null, hotel_name: null, hotel_cost: 0,
      transfer_id: null, transfer_name: null, transfer_cost: 0,
      upsells: [],
    })
  }

  const selectHotel = (index, hotelId) => {
    if (!hotelId) { updateRow(index, { hotel_id: null, hotel_name: null, hotel_cost: 0 }); return }
    const hotel = hotels.find((h) => h.id === hotelId)
    if (!hotel) return
    const s = Number(booking.single_rooms) || 0
    const d = Number(booking.double_rooms) || 0
    const t = Number(booking.triple_rooms) || 0
    const cost = s * (hotel.price_single || 0) + d * (hotel.price_double || 0) + t * (hotel.price_triple || 0)
    updateRow(index, { hotel_id: hotelId, hotel_name: hotel.name, hotel_cost: cost })
  }

  const selectTransfer = (index, transferId) => {
    if (!transferId) { updateRow(index, { transfer_id: null, transfer_name: null, transfer_cost: 0 }); return }
    const item = transfers.find((t) => t.id === transferId)
    if (!item) return
    updateRow(index, { transfer_id: transferId, transfer_name: item.name, transfer_cost: item.price || 0 })
  }

  const selectTransport = (index, transportId) => {
    if (!transportId) { updateRow(index, { transport_id: null, transport_name: null, transport_cost: 0 }); return }
    const item = transports.find((t) => t.id === transportId)
    if (!item) return
    updateRow(index, { transport_id: transportId, transport_name: item.name, transport_cost: item.price || 0 })
  }

  const addUpsell = (index, activityId) => {
    if (!activityId) return
    const activity = activities.find((a) => a.id === activityId)
    if (!activity) return
    if (rows[index].upsells.some((u) => u.id === activityId)) return
    const guests = Math.max(Number(booking.number_of_guests) || 1, 1)
    const cost = activity.price_unit === 'per person'
      ? (activity.price || 0) * guests
      : (activity.price || 0)
    updateRow(index, { upsells: [...rows[index].upsells, { id: activity.id, name: activity.name, cost, price_unit: activity.price_unit }] })
  }

  const removeUpsell = (rowIndex, activityId) =>
    updateRow(rowIndex, { upsells: rows[rowIndex].upsells.filter((u) => u.id !== activityId) })

  // ── Save / Cancel ──────────────────────────────────────────────────────
  const handleSave = () => { onSave(rows); setEditMode(false) }
  const handleCancel = () => { setRows(itinerary); setEditMode(false) }

  // ── Date formatter ─────────────────────────────────────────────────────
  const fmt = (dateStr) => {
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  }

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
        <div className="itinerary-table-wrapper">
          <table className="itinerary-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>City</th>
                <th>Hotel</th>
                <th>Activities</th>
                <th>Transfer</th>
                <th>Transport</th>
                <th>Day Cost</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {/* Date */}
                  <td className="itin-date">{fmt(row.date)}</td>

                  {/* Day # */}
                  <td className="day-label">Day {row.day}</td>

                  {/* City */}
                  <td>
                    {editMode ? (
                      <select
                        className="itin-select"
                        value={row.city}
                        onChange={(e) => handleCityChange(i, e.target.value)}
                      >
                        <option value="">— City —</option>
                        {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      row.city || <span className="itin-empty">—</span>
                    )}
                  </td>

                  {/* Hotel */}
                  <td>
                    {editMode ? (
                      <select
                        className="itin-select"
                        value={row.hotel_id || ''}
                        onChange={(e) => selectHotel(i, e.target.value)}
                        disabled={!row.city}
                      >
                        <option value="">— Hotel —</option>
                        {hotelsForCity(row.city).map((h) => (
                          <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                      </select>
                    ) : row.hotel_name ? (
                      <span>
                        {row.hotel_name}
                        <span className="itin-cost"> €{Number(row.hotel_cost).toFixed(0)}</span>
                      </span>
                    ) : <span className="itin-empty">—</span>}
                  </td>

                  {/* Activities / Upsells */}
                  <td>
                    {editMode ? (
                      <div className="upsell-edit">
                        <select
                          className="itin-select"
                          value=""
                          onChange={(e) => { addUpsell(i, e.target.value); e.target.value = '' }}
                          disabled={!row.city}
                        >
                          <option value="">+ Add activity</option>
                          {activitiesForCity(row.city).map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.price_unit === 'per person' ? `€${a.price}/pp` : `€${a.price}`})
                            </option>
                          ))}
                        </select>
                        {row.upsells.length > 0 && (
                          <div className="upsell-chips">
                            {row.upsells.map((u) => (
                              <span key={u.id} className="upsell-chip">
                                {u.name}
                                <button
                                  className="upsell-chip-remove"
                                  type="button"
                                  onClick={() => removeUpsell(i, u.id)}
                                >×</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : row.upsells.length > 0 ? (
                      <div className="upsell-chips">
                        {row.upsells.map((u) => (
                          <span key={u.id} className="upsell-chip view">
                            {u.name}
                            <span className="itin-cost"> €{Number(u.cost).toFixed(0)}</span>
                          </span>
                        ))}
                      </div>
                    ) : <span className="itin-empty">—</span>}
                  </td>

                  {/* Transfer */}
                  <td>
                    {editMode ? (
                      <select
                        className="itin-select"
                        value={row.transfer_id || ''}
                        onChange={(e) => selectTransfer(i, e.target.value)}
                        disabled={!row.city}
                      >
                        <option value="">— Transfer —</option>
                        {transfersForCity(row.city).map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}{t.pax_label ? ` (${t.pax_label})` : ''}
                          </option>
                        ))}
                      </select>
                    ) : row.transfer_name ? (
                      <span>
                        {row.transfer_name}
                        <span className="itin-cost"> €{Number(row.transfer_cost).toFixed(0)}</span>
                      </span>
                    ) : <span className="itin-empty">—</span>}
                  </td>

                  {/* Transport */}
                  <td>
                    {editMode ? (
                      <select
                        className="itin-select"
                        value={row.transport_id || ''}
                        onChange={(e) => selectTransport(i, e.target.value)}
                      >
                        <option value="">— Transport —</option>
                        {transports.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    ) : row.transport_name ? (
                      <span>
                        {row.transport_name}
                        <span className="itin-cost"> €{Number(row.transport_cost).toFixed(0)}</span>
                      </span>
                    ) : <span className="itin-empty">—</span>}
                  </td>

                  {/* Day Total */}
                  <td className="day-cost">€{computeDayCost(row).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
