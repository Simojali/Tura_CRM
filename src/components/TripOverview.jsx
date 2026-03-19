import { CITIES as FALLBACK_CITIES } from '../lib/referenceData'
import { computeDayCost } from '../lib/itineraryUtils'
import { fmtDate, fmtDateLong, fmtCost, fmtRooms, nextDay, statusLabel } from '../lib/formatters'

export default function TripOverview({ booking, itinerary, contracts = [], hotels = [], cities: citiesProp, onSave }) {
  const CITIES = citiesProp || FALLBACK_CITIES

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

  // ── Merge activities + transfers + contract movements into one sorted timeline ─
  const buildTimeline = (row, rowIndex) => {
    const items = []
    ;(row.activities || []).forEach((a) => {
      items.push({
        kind: 'activity',
        time: a.time,
        name: a.name,
        cost: a.cost,
        priceUnit: a.price_unit,
        status: a.status || 'requested',
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
        pricingMode: t.pricing_mode,
        fromLocation: t.from_location,
        toLocation: t.to_location,
      })
    })
    // Include movements from transport contracts assigned to this day.
    // Only the first movement per contract shows the cost — subsequent ones stay price-free.
    contracts.forEach((c) => {
      const dayMovements = (c.movements || []).filter((m) => m.dayIdx === rowIndex)
      dayMovements.forEach((mov, idx) => {
        items.push({
          kind: 'transport',
          time: mov.time,
          name: c.name,
          cost: c.cost_per_day || 0,
          showCost: idx === 0,          // only first movement shows the price
          status: c.status,
          paxLabel: c.pax_label,
          pricingMode: c.pricing_mode,
          fromLocation: mov.from_location,
          toLocation: mov.to_location,
          driverName: c.driver_name,
        })
      })
    })
    return items.sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  }

  // ── Auto checkout date ────────────────────────────────────────────────
  const getAutoCheckout = (rowIndex) => {
    if (rowIndex + 1 < itinerary.length) return itinerary[rowIndex + 1].date
    return nextDay(itinerary[rowIndex]?.date) || ''
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
            const timeline = buildTimeline(row, i)
            const dayCost = computeDayCost(row, contracts, i, hotels)
            const hotelEntry = hotels.find((h) => row.date && row.date >= h.checkin && row.date < h.checkout)
            const displayHotel = hotelEntry
              ? { hotel_id: hotelEntry.ref_id, hotel_name: hotelEntry.name, hotel_tier: hotelEntry.tier, hotel_cost: hotelEntry.cost_per_night, hotel_status: hotelEntry.status, hotel_confirmation_ref: hotelEntry.confirmation_ref, hotel_checkin: hotelEntry.checkin, hotel_checkout: hotelEntry.checkout }
              : row
            const checkin = displayHotel.hotel_checkin || row.date || ''
            const checkout = displayHotel.hotel_checkout || getAutoCheckout(i)
            const rooms = fmtRooms(booking)

            return (
              <div key={i} className="to-day-card">
                {/* ── Day Header ── */}
                <div className="to-day-header">
                  <div className="to-day-header-left">
                    <span className="to-day-label">Day {row.day}</span>
                    <span className="to-day-date">{fmtDateLong(row.date)}</span>
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
                    <span className="itin-day-cost-badge">{fmtCost(dayCost)}</span>
                  )}
                </div>

                {/* ── Hotel Section ── */}
                <div className="to-hotel-section">
                  {displayHotel.hotel_id ? (
                    <div className="itin-hotel-card">
                      <div className="itin-hotel-name">
                        {displayHotel.hotel_name}
                        <span className={`itin-status-badge status-${displayHotel.hotel_status || 'requested'}`}>
                          {statusLabel(displayHotel.hotel_status)}
                        </span>
                      </div>
                      {displayHotel.hotel_tier && (
                        <div className="itin-hotel-tier">{displayHotel.hotel_tier}</div>
                      )}
                      <div className="itin-hotel-rooms">
                        {fmtDate(checkin)} → {fmtDate(checkout)}
                        {rooms && ` · ${rooms}`}
                        <span className="itin-item-cost" style={{ marginLeft: '0.5rem' }}>
                          {fmtCost(displayHotel.hotel_cost)}/night
                        </span>
                      </div>
                      {displayHotel.hotel_confirmation_ref && (
                        <div className="to-hotel-ref">Ref: {displayHotel.hotel_confirmation_ref}</div>
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
                          {item.driverName && (
                            <span className="itin-item-meta">👤 {item.driverName}</span>
                          )}
                        </div>
                        {(item.kind === 'transfer' || item.kind === 'transport') && (
                          <span className={`itin-type-badge ${item.kind}`}>
                            {item.kind === 'transfer' ? 'Transfer' : 'Transport'}
                          </span>
                        )}
                        {(item.kind === 'transfer' || item.kind === 'transport') && (
                          <span className={`itin-type-badge ${(item.pricingMode || 'private') === 'group' ? 'group-mode' : 'private-mode'}`}>
                            {(item.pricingMode || 'private') === 'group' ? 'Group' : 'Private'}
                          </span>
                        )}
                        {item.status && (
                          <span className={`itin-status-badge status-${item.status}`}>
                            {statusLabel(item.status)}
                          </span>
                        )}
                        {(item.kind !== 'transport' || item.showCost) && (
                          <span className="itin-item-cost">{fmtCost(item.cost)}</span>
                        )}
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

    </div>
  )
}
