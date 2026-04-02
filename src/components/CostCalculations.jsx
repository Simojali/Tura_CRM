import { useState, useEffect } from 'react'
import { computeTotals, getDefaultMarkup } from '../lib/itineraryUtils'
import { CLIENT_TYPES } from '../lib/constants'

export default function CostCalculations({ booking, itinerary, contracts = [], hotels = [], onUpdateBooking }) {
  const [markup, setMarkup] = useState(() => getDefaultMarkup(booking.client_type))

  // Refresh default markup when client_type changes
  useEffect(() => {
    setMarkup(getDefaultMarkup(booking.client_type))
  }, [booking.client_type])

  const totals = computeTotals(itinerary, booking, contracts, hotels)
  const hasRoomBreakdown = totals.roomBreakdown && totals.roomBreakdown.length > 0
  const groupPrice = Number(booking.group_price_eur) || 0
  const suggestedPrice = hasRoomBreakdown
    ? totals.roomBreakdown.reduce((sum, row) => sum + row.totalPerPerson * (1 + markup / 100) * row.guests, 0)
    : totals.grandTotal * (1 + markup / 100)

  // Mode based on booking status
  const status = (booking.booking_status || 'Quotation').toLowerCase()
  const isQuotation = status === 'quotation' || status === ''

  // P/L: Quotation compares against suggested price, Confirmed against locked group price
  const comparePrice = isQuotation ? suggestedPrice : groupPrice
  const pl = comparePrice - totals.grandTotal
  const marginPct = comparePrice > 0 ? (pl / comparePrice) * 100 : 0
  const isProfit = pl >= 0

  const guests = Number(booking.number_of_guests) || 1

  // Find client type label
  const clientTypeLabel = CLIENT_TYPES.find((ct) => ct.value === booking.client_type)?.label || '—'

  const fmt = (n) => `€${Number(n).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  // Calculate group price from suggested price
  const calcGroupPrice = () => Math.round(suggestedPrice)

  // Calculate unit price (twin-share base)
  const calcUnitPrice = () => {
    if (!hasRoomBreakdown) return Math.round(totals.costPerPerson * (1 + markup / 100))
    const doubleRow = totals.roomBreakdown.find((r) => r.type === 'Double')
    const baseRow = doubleRow || totals.roomBreakdown[0]
    return Math.round(baseRow.totalPerPerson * (1 + markup / 100))
  }

  const handleConfirmPrices = () => {
    const calculatedGroup = calcGroupPrice()
    const calculatedUnit = calcUnitPrice()
    const msg = `Lock prices and confirm booking?\n\nGroup Price: €${calculatedGroup.toLocaleString()}\nUnit Price (twin-share): €${calculatedUnit.toLocaleString()}\n\nThis will change the status to Confirmed.`
    if (!window.confirm(msg)) return
    onUpdateBooking({
      booking_status: 'Confirmed',
      group_price_eur: calculatedGroup,
      unite_price_eur: calculatedUnit,
    })
  }

  const handleRevertToQuotation = () => {
    if (!window.confirm('Revert to Quotation? This will unlock the prices for editing.')) return
    onUpdateBooking({ booking_status: 'Quotation' })
  }

  return (
    <div className="cost-panel">
      {/* ── Header ── */}
      <div className="cost-panel-header">
        <h3 className="cost-panel-title">Cost Analysis</h3>
        {isQuotation ? (
          <span className="cost-mode-badge cost-mode-quotation"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> Quotation — adjust markup and confirm</span>
        ) : (
          <span className="cost-mode-badge cost-mode-locked"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Prices Locked</span>
        )}
        {booking.client_type && (
          <span className="cost-client-type">{clientTypeLabel} — default markup {getDefaultMarkup(booking.client_type)}%</span>
        )}
      </div>

      {/* ── Section 1: Cost Breakdown ── */}
      <div className="cost-section">
        <div className="cost-section-title">Cost Breakdown (NET)</div>
        <div className="cost-markup-row">
          <div className="cost-markup-result">
            <span className="cost-markup-label">Hotels</span>
            <span className="cost-markup-value-sm">{fmt(totals.hotelTotal)}</span>
          </div>
          <div className="cost-markup-result">
            <span className="cost-markup-label">Activities</span>
            <span className="cost-markup-value-sm">{fmt(totals.activityTotal)}</span>
          </div>
          <div className="cost-markup-result">
            <span className="cost-markup-label">Transfers & Transport</span>
            <span className="cost-markup-value-sm">{fmt(totals.transferTotal)}</span>
          </div>
          <div className="cost-breakdown-total">
            <span className="cost-markup-label">Total Cost (NET)</span>
            <span className="cost-markup-value">{fmt(totals.grandTotal)}</span>
            <span className="cost-breakdown-sub">{fmt(totals.costPerPerson)} / person</span>
          </div>
        </div>
      </div>

      {/* ── Section 2: Markup & Pricing ── */}
      <div className="cost-section">
        <div className="cost-section-title">Markup & Pricing</div>
        <div className="cost-markup-row">
          {isQuotation ? (
            <>
              <div className="cost-markup-field">
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
              <div className="cost-markup-result">
                <span className="cost-markup-label">Suggested Selling Price</span>
                <span className="cost-markup-value">{fmt(suggestedPrice)}</span>
              </div>
              <div className="cost-markup-result">
                <span className="cost-markup-label">Per Person (avg)</span>
                <span className="cost-markup-value-sm">{fmt(suggestedPrice / guests)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="cost-markup-result">
                <span className="cost-markup-label">Locked Group Price</span>
                <span className="cost-markup-value">{groupPrice > 0 ? fmt(groupPrice) : '—'}</span>
              </div>
              <div className="cost-markup-result">
                <span className="cost-markup-label">Markup used</span>
                <span className="cost-markup-value-sm">{markup}%</span>
              </div>
            </>
          )}
          <div className={`cost-pl-badge ${isProfit ? 'cost-pl-profit' : 'cost-pl-loss'}`}>
            <span>{isQuotation ? 'Expected P/L' : 'P/L'}</span>
            <strong>{isProfit ? '+' : ''}{fmt(pl)}</strong>
            <span className="cost-pl-margin">{marginPct.toFixed(1)}% margin</span>
          </div>
        </div>
      </div>

      {/* ── Section 3: Per-Room-Type Breakdown ── */}
      {hasRoomBreakdown && (
        <div className="cost-section">
          <div className="cost-section-title">Per-Person Pricing by Room Type</div>
          <div className="cost-room-breakdown-info">
            Shared costs (activities + transfers + transport): {fmt(totals.sharedTotal)} ÷ {guests} guests = <strong>{fmt(totals.sharedPerPerson)}</strong> / person
          </div>
          <table className="cost-room-table">
            <thead>
              <tr>
                <th>Room Type</th>
                <th>Guests</th>
                <th>Hotel / Person</th>
                <th>Shared / Person</th>
                <th>Cost / Person</th>
                <th>Selling / Person</th>
              </tr>
            </thead>
            <tbody>
              {totals.roomBreakdown.map((row) => (
                <tr key={row.type}>
                  <td className="cost-room-type">{row.type}</td>
                  <td>{row.guests}</td>
                  <td>{fmt(row.hotelPerPerson)}</td>
                  <td>{fmt(totals.sharedPerPerson)}</td>
                  <td className="cost-room-total">{fmt(row.totalPerPerson)}</td>
                  <td className="cost-room-selling">{fmt(row.totalPerPerson * (1 + markup / 100))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {totals.roomBreakdown.length > 1 && (() => {
            const base = totals.roomBreakdown.find((r) => r.type === 'Double')
            const single = totals.roomBreakdown.find((r) => r.type === 'Single')
            if (base && single) {
              const supplement = single.totalPerPerson - base.totalPerPerson
              return (
                <div className="cost-room-supplement">
                  Single supplement: <strong>{fmt(supplement)}</strong> / person
                  {markup > 0 && <> (selling: <strong>{fmt(supplement * (1 + markup / 100))}</strong>)</>}
                </div>
              )
            }
            return null
          })()}
        </div>
      )}

      {/* ── Section 4: Action Button ── */}
      {onUpdateBooking && (
        <div className="cost-actions">
          {isQuotation ? (
            <button
              className="btn btn-success cost-confirm-btn"
              onClick={handleConfirmPrices}
              disabled={totals.grandTotal <= 0}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Confirm & Lock Prices
            </button>
          ) : (
            <button
              className="btn btn-outline cost-revert-btn"
              onClick={handleRevertToQuotation}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg> Revert to Quotation
            </button>
          )}
        </div>
      )}
    </div>
  )
}
