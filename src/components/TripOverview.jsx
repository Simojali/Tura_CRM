import { CITIES } from '../lib/referenceData'
import { computeDayCost } from '../lib/itineraryUtils'
import CostCalculations from './CostCalculations'

export default function TripOverview({ booking, itinerary, onSave }) {

  // ── City change: clears hotel / activities / transfers for that day ───
  const handleCityChange = (index, city) => {
    const row = itinerary[index]
    const hasData = row.hotel_id || (row.activities || []).length > 0 || (row.transfers || []).length > 0
    if (hasData && city !== row.city) {
      if (!window.confirm(`Changing city will clear the hotel, activities, and transfers for Day ${row.day}. Continue?`)) return
    }
    const updated = itinerary.map((r, i) =>
      i !== index ? r : {
        ...r,
        city,
        hotel_id: null, hotel_name: null, hotel_tier: null, hotel_cost: 0,
        hotel_status: 'requested', hotel_confirmation_ref: '',
        hotel_checkin: '', hotel_checkout: '',
        activities: [],
        transfers: [],
      }
    )
    onSave(updated)
  }

  // ── Merge activities + transfers into one sorted timeline ─────────────
  const buildTimeline = (row) => {
    const items = []
    ;(row.activities || []).forEach((a) => {
      items.push({
        kind: 'activity',
        time: a.time,
        name: a.name,
        cost: a.cost,
        priceUnit: a.price_unit,
      })
    })
    ;(row.transfers || []).forEach((t) => {
      items.push({
        kind: t.type || 'transfer',
        time: t.time,
        name: t.name,
        cost: t.cost,
        status: t.status,
        paxLabel: t.pax_label,
        fromLocation: t.from_location,
        toLocation: t.to_location,
      })
    })
    return items.sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  }

  // ── Auto checkout date ────────────────────────────────────────────────
  const getAutoCheckout = (rowIndex) => {
    if (rowIndex + 1 < itinerary.length) return itinerary[rowIndex + 1].date
    const dateStr = itinerary[rowIndex]?.date
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('-').map(Number)
    const next = new Date(y, m - 1, d + 1)
    return [
      next.getFullYear(),
      String(next.getMonth() + 1).padStart(2, '0'),
      String(next.getDate()).padStart(2, '0'),
    ].join('-')
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  const fmtDate = (dateStr) => {
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  }

  const fmtLong = (dateStr) => {
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const roomSummary = () => {
    const parts = []
    if (Number(booking.single_rooms) > 0) parts.push(`${booking.single_rooms}× Single`)
    if (Number(booking.double_rooms) > 0) parts.push(`${booking.double_rooms}× Double`)
    if (Number(booking.triple_rooms) > 0) parts.push(`${booking.triple_rooms}× Triple`)
    return parts.join(' · ') || ''
  }

  const statusLabel = (s) => {
    const str = s || 'requested'
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="trip-overview">
      {itinerary.length === 0 ? (
        <div className="to-empty">
          No days defined yet. Set a check-in date and number of days on the booking to get started.
        </div>
      ) : (
        <div className="to-day-cards">
          {itinerary.map((row, i) => {
            const timeline = buildTimeline(row)
            const dayCost = computeDayCost(row)
            const checkin = row.hotel_checkin || row.date || ''
            const checkout = row.hotel_checkout || getAutoCheckout(i)
            const rooms = roomSummary()

            return (
              <div key={i} className="to-day-card">
                {/* ── Day Header ── */}
                <div className="to-day-header">
                  <div className="to-day-header-left">
                    <span className="to-day-label">Day {row.day}</span>
                    <span className="to-day-date">{fmtLong(row.date)}</span>
                    <select
                      className="itin-city-select"
                      value={row.city}
                      onChange={(e) => handleCityChange(i, e.target.value)}
                    >
                      <option value="">— City —</option>
                      {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {dayCost > 0 && (
                    <span className="itin-day-cost-badge">€{dayCost.toFixed(0)}</span>
                  )}
                </div>

                {/* ── Hotel Section ── */}
                <div className="to-hotel-section">
                  {row.hotel_id ? (
                    <div className="itin-hotel-card">
                      <div className="itin-hotel-name">
                        {row.hotel_name}
                        <span className={`itin-status-badge status-${row.hotel_status || 'requested'}`}>
                          {statusLabel(row.hotel_status)}
                        </span>
                      </div>
                      {row.hotel_tier && (
                        <div className="itin-hotel-tier">{row.hotel_tier}</div>
                      )}
                      <div className="itin-hotel-rooms">
                        {fmtDate(checkin)} → {fmtDate(checkout)}
                        {rooms && ` · ${rooms}`}
                        <span className="itin-item-cost" style={{ marginLeft: '0.5rem' }}>
                          €{Number(row.hotel_cost).toFixed(0)}/night
                        </span>
                      </div>
                      {row.hotel_confirmation_ref && (
                        <div className="to-hotel-ref">Ref: {row.hotel_confirmation_ref}</div>
                      )}
                    </div>
                  ) : (
                    <div className="itin-empty-section">No hotel assigned</div>
                  )}
                </div>

                {/* ── Timeline Section (activities + transfers merged) ── */}
                <div className="to-timeline-section">
                  {timeline.length > 0 ? (
                    timeline.map((item, ti) => (
                      <div key={ti} className="itin-timeline-item">
                        <span className="itin-time-badge">{item.time}</span>
                        <span className="to-kind-icon">
                          {item.kind === 'activity' ? '⚡' : '🚗'}
                        </span>
                        <div className="itin-item-info">
                          <span className="itin-item-name">{item.name}</span>
                          {(item.fromLocation || item.toLocation) && (
                            <span className="itin-item-meta">
                              {item.fromLocation || '?'} → {item.toLocation || '?'}
                            </span>
                          )}
                          {item.paxLabel && (
                            <span className="itin-item-meta">{item.paxLabel}</span>
                          )}
                        </div>
                        {(item.kind === 'transfer' || item.kind === 'transport') && (
                          <span className={`itin-type-badge ${item.kind}`}>
                            {item.kind === 'transfer' ? 'Transfer' : 'Bus'}
                          </span>
                        )}
                        {item.status && (
                          <span className={`itin-status-badge status-${item.status}`}>
                            {statusLabel(item.status)}
                          </span>
                        )}
                        <span className="itin-item-cost">€{Number(item.cost).toFixed(0)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="itin-empty-section">No activities or transfers</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Cost Analysis at the bottom ── */}
      <CostCalculations booking={booking} itinerary={itinerary} />
    </div>
  )
}
