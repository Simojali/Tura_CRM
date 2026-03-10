import { useState, useEffect } from 'react'
import { computeTotals, getDefaultMarkup } from '../lib/itineraryUtils'
import { CLIENT_TYPES } from '../lib/constants'

export default function CostCalculations({ booking, itinerary }) {
  const [markup, setMarkup] = useState(() => getDefaultMarkup(booking.client_type))

  // Refresh default markup when client_type changes
  useEffect(() => {
    setMarkup(getDefaultMarkup(booking.client_type))
  }, [booking.client_type])

  const totals = computeTotals(itinerary, booking)
  const groupPrice = Number(booking.group_price_eur) || 0
  const suggestedPrice = totals.grandTotal * (1 + markup / 100)
  const pl = groupPrice - totals.grandTotal
  const marginPct = groupPrice > 0 ? (pl / groupPrice) * 100 : 0
  const isProfit = pl >= 0

  // Find client type label
  const clientTypeLabel = CLIENT_TYPES.find((ct) => ct.value === booking.client_type)?.label || '—'

  const fmt = (n) => `€${Number(n).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  return (
    <div className="cost-panel">
      <div className="cost-panel-header">
        <h3 className="cost-panel-title">Cost Analysis</h3>
        {booking.client_type && (
          <span className="cost-client-type">{clientTypeLabel} — default markup {getDefaultMarkup(booking.client_type)}%</span>
        )}
      </div>

      <div className="cost-grid">
        {/* ── Left: Cost Breakdown ── */}
        <div className="cost-col">
          <div className="cost-col-title">Cost Breakdown (NET)</div>

          <div className="cost-row">
            <span>Hotel costs</span>
            <span>{fmt(totals.hotelTotal)}</span>
          </div>
          <div className="cost-row">
            <span>Activities</span>
            <span>{fmt(totals.activityTotal)}</span>
          </div>
          <div className="cost-row">
            <span>Transfers & Transport</span>
            <span>{fmt(totals.transferTotal)}</span>
          </div>

          <div className="cost-divider" />

          <div className="cost-row cost-total">
            <span>Total Cost (NET)</span>
            <span>{fmt(totals.grandTotal)}</span>
          </div>
          <div className="cost-row cost-secondary">
            <span>Cost per Person</span>
            <span>{fmt(totals.costPerPerson)}</span>
          </div>
        </div>

        {/* ── Right: Pricing & Margin ── */}
        <div className="cost-col">
          <div className="cost-col-title">Pricing & Margin</div>

          <div className="cost-row">
            <span>Group Price (EUR)</span>
            <span>{groupPrice > 0 ? fmt(groupPrice) : <em style={{ color: 'var(--color-text-light)' }}>not set</em>}</span>
          </div>
          <div className="cost-row cost-row-input">
            <label htmlFor="markup-input">Markup %</label>
            <input
              id="markup-input"
              type="number"
              className="markup-input"
              value={markup}
              onChange={(e) => setMarkup(Number(e.target.value))}
              min="0"
              max="500"
              step="1"
            />
          </div>
          <div className="cost-row">
            <span>Suggested Price</span>
            <span className="cost-suggested">{fmt(suggestedPrice)}</span>
          </div>

          <div className="cost-divider" />

          <div className={`cost-row cost-total ${isProfit ? 'margin-positive' : 'margin-negative'}`}>
            <span>P / L</span>
            <span>{isProfit ? '+' : ''}{fmt(pl)}</span>
          </div>
          <div className={`cost-row ${isProfit ? 'margin-positive' : 'margin-negative'}`}>
            <span>Margin %</span>
            <span>{marginPct.toFixed(1)}%</span>
          </div>
          <div className="cost-status">
            {isProfit ? '✅ Profitable' : '⚠️ Loss'}
          </div>
        </div>
      </div>
    </div>
  )
}
