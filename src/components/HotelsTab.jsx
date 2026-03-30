import { useState, useEffect, useMemo } from 'react'
import { loadReferenceData } from '../lib/referenceData'
import { fmtDate, fmtCost, fmtRooms } from '../lib/formatters'
import { HOTEL_STATUS_LABELS as STATUS_LABELS } from '../lib/constants'
import HotelMessageModal from './HotelMessageModal'

/* ── SVG Icons ── */
const sz = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }

const IconSend = () => (
  <svg {...sz}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
)
const IconRefresh = () => (
  <svg {...sz}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
)
const IconCheck = () => (
  <svg {...sz}><polyline points="20 6 9 17 4 12"/></svg>
)
const IconX = () => (
  <svg {...sz}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
)
const IconEdit = () => (
  <svg {...sz}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
)
const IconBan = () => (
  <svg {...sz}><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
)
const IconClipboard = () => (
  <svg {...sz}><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
)
const IconMail = () => (
  <svg {...sz}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>
)
const IconTrash = () => (
  <svg {...sz}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
)
const IconUndo = () => (
  <svg {...sz}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
)
const IconXCircle = () => (
  <svg {...sz}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
)

const HOTEL_STATUSES = [
  { value: 'all',       label: 'All' },
  { value: 'draft',     label: 'Draft' },
  { value: 'requested', label: 'Requested' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
]

// Status-changing event types (follow-up is informational, doesn't change status)
const STATUS_EVENTS = new Set(['requested', 'confirmed', 'declined', 'modified', 'cancelled'])

function getStatus(entry) {
  const timeline = entry.timeline || []
  if (timeline.length === 0) return 'draft'
  for (let i = timeline.length - 1; i >= 0; i--) {
    if (STATUS_EVENTS.has(timeline[i].type)) return timeline[i].type
  }
  return 'draft'
}

const genId = () => crypto.randomUUID()

function computeNights(checkin, checkout) {
  if (!checkin || !checkout) return 0
  const diff = Math.round((new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
}

const EMPTY_FORM = { refId: '', checkin: '', checkout: '' }

const TIMELINE_TYPES = [
  { value: 'requested',  label: 'Requested',  icon: <IconSend /> },
  { value: 'follow-up',  label: 'Follow-up',  icon: <IconRefresh /> },
  { value: 'confirmed',  label: 'Confirmed',  icon: <IconCheck /> },
  { value: 'declined',   label: 'Declined',   icon: <IconX /> },
  { value: 'modified',   label: 'Modified',    icon: <IconEdit /> },
  { value: 'cancelled',  label: 'Cancelled',   icon: <IconBan /> },
]

const TIMELINE_TYPE_LABELS = {
  requested: 'Requested',
  'follow-up': 'Follow-up',
  confirmed: 'Confirmed',
  declined: 'Declined',
  modified: 'Modified',
  cancelled: 'Cancelled',
}

const TIMELINE_METHODS = [
  { value: 'email',    label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'phone',    label: 'Phone' },
]

function createTimelineEvent(type, method = 'email', note = '', ref = '') {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    type,
    method,
    note,
    ...(ref ? { ref } : {}),
  }
}

function fmtTimeline(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  const day = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${day} ${time}`
}

const EMPTY_TL_FORM = { type: 'follow-up', method: 'email', note: '', ref: '' }

export default function HotelsTab({ booking, itinerary = [], hotels = [], onSaveHotels }) {
  const [refHotels, setRefHotels] = useState([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [openMenuId, setOpenMenuId] = useState(null)
  const [expandedTimelineId, setExpandedTimelineId] = useState(null)
  const [timelineForm, setTimelineForm] = useState(EMPTY_TL_FORM)
  const [showTimelineForm, setShowTimelineForm] = useState(null)
  const [messageModalHotel, setMessageModalHotel] = useState(null)

  // Load reference hotels
  useEffect(() => {
    loadReferenceData().then((items) => {
      setRefHotels(items.filter((r) => r.category === 'hotel'))
    })
  }, [])

  // Close menu on outside click
  useEffect(() => {
    const close = () => setOpenMenuId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  // No longer auto-populate full trip dates — dates are auto-filled based on hotel city

  // Group reference hotels by city for <optgroup>
  const hotelsByCity = useMemo(() => {
    return refHotels.reduce((acc, h) => {
      if (!acc[h.city]) acc[h.city] = []
      acc[h.city].push(h)
      return acc
    }, {})
  }, [refHotels])

  // ── Trip date bounds ─────────────────────────────────────────────────
  const tripStart = booking.check_in || ''
  const tripEnd = booking.check_out || ''

  // Split city appearances into contiguous blocks (handles gaps from other cities)
  const getCityBlocks = (city) => {
    if (!city || !itinerary.length) return []
    const cityRows = itinerary.filter((r) => r.city === city).sort((a, b) => a.date.localeCompare(b.date))
    if (cityRows.length === 0) return []

    const blocks = []
    let blockStart = cityRows[0]
    let blockEnd = cityRows[0]

    for (let i = 1; i < cityRows.length; i++) {
      const prev = new Date(blockEnd.date)
      const curr = new Date(cityRows[i].date)
      const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24))
      if (diffDays === 1) {
        blockEnd = cityRows[i]
      } else {
        blocks.push({ startRow: blockStart, endRow: blockEnd })
        blockStart = cityRows[i]
        blockEnd = cityRows[i]
      }
    }
    blocks.push({ startRow: blockStart, endRow: blockEnd })

    const lastItinDay = itinerary.reduce((max, r) => r.date > max ? r.date : max, itinerary[0]?.date || '')
    return blocks.map((b) => {
      const isLastDayOfTrip = b.endRow.date === lastItinDay
      let checkoutDate
      if (isLastDayOfTrip) {
        // Last day of trip = departure day, no overnight stay — checkout is that same day
        checkoutDate = b.endRow.date
      } else {
        // Mid-trip block: checkout = day after last city day
        const last = new Date(b.endRow.date)
        last.setDate(last.getDate() + 1)
        const mm = String(last.getMonth() + 1).padStart(2, '0')
        const dd = String(last.getDate()).padStart(2, '0')
        checkoutDate = `${last.getFullYear()}-${mm}-${dd}`
      }
      return {
        checkin: b.startRow.date,
        checkout: checkoutDate,
        dayIn: b.startRow.day,
        dayOut: isLastDayOfTrip ? b.endRow.day : b.endRow.day + 1,
      }
    })
  }

  // Find the first city block that doesn't already have a hotel covering it
  const getAvailableBlock = (city, excludeHotelId) => {
    const blocks = getCityBlocks(city)
    if (blocks.length === 0) return null
    const otherHotels = hotels.filter((h) => h.id !== excludeHotelId)
    return blocks.find((block) =>
      !otherHotels.some((h) => h.checkin === block.checkin && h.checkout === block.checkout)
    ) || blocks[0]
  }

  // Look up itinerary day number for a given date
  const getDayNum = (date) => {
    if (!date || !itinerary.length) return null
    const row = itinerary.find((r) => r.date === date)
    if (row) return row.day
    // For checkout dates (day after last night), find the previous day + 1
    const prev = new Date(date)
    prev.setDate(prev.getDate() - 1)
    const mm = String(prev.getMonth() + 1).padStart(2, '0')
    const dd = String(prev.getDate()).padStart(2, '0')
    const prevStr = `${prev.getFullYear()}-${mm}-${dd}`
    const prevRow = itinerary.find((r) => r.date === prevStr)
    return prevRow ? prevRow.day + 1 : null
  }

  // When a hotel is selected in the add form, auto-fill dates from its city
  const handleHotelSelect = (refId) => {
    const hotel = refHotels.find((h) => h.id === refId)
    if (hotel) {
      const block = getAvailableBlock(hotel.city)
      setAddForm((f) => ({
        ...f,
        refId,
        checkin: block?.checkin || f.checkin,
        checkout: block?.checkout || f.checkout,
      }))
    } else {
      setAddForm((f) => ({ ...f, refId }))
    }
  }

  // When a hotel is selected in the edit form, auto-fill dates from its city
  const handleEditHotelSelect = (refId) => {
    const hotel = refHotels.find((h) => h.id === refId)
    if (hotel) {
      const block = getAvailableBlock(hotel.city, editingId)
      setEditForm((f) => ({
        ...f,
        refId,
        checkin: block?.checkin || f.checkin,
        checkout: block?.checkout || f.checkout,
      }))
    } else {
      setEditForm((f) => ({ ...f, refId }))
    }
  }

  const s = Number(booking.single_rooms) || 0
  const d = Number(booking.double_rooms) || 0
  const t = Number(booking.triple_rooms) || 0
  const calcCostPerNight = (hotel) =>
    s * (hotel.price_single || 0) + d * (hotel.price_double || 0) + t * (hotel.price_triple || 0)

  const filtered = useMemo(() =>
    filterStatus === 'all'
      ? hotels
      : hotels.filter((h) => getStatus(h) === filterStatus),
    [hotels, filterStatus]
  )

  const countByStatus = (status) =>
    hotels.filter((h) => getStatus(h) === status).length

  const renderHotelOptions = () =>
    Object.entries(hotelsByCity).map(([city, cityHotels]) => (
      <optgroup key={city} label={city}>
        {cityHotels.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name} · {h.tier} (€{h.price_double}/night)
          </option>
        ))}
      </optgroup>
    ))

  // ── Add ──────────────────────────────────────────────────────────────
  const addHotel = () => {
    const { refId, checkin, checkout } = addForm
    if (!refId || !checkin || !checkout) return
    const nights = computeNights(checkin, checkout)
    if (nights <= 0) { alert('Check-out must be after check-in.'); return }
    const hotel = refHotels.find((h) => h.id === refId)
    if (!hotel) return
    const entry = {
      id: genId(),
      ref_id: hotel.id,
      name: hotel.name,
      tier: hotel.tier || null,
      cost_per_night: calcCostPerNight(hotel),
      price_single: hotel.price_single || 0,
      price_double: hotel.price_double || 0,
      price_triple: hotel.price_triple || 0,
      checkin,
      checkout,
      nights,
      timeline: [],
    }
    onSaveHotels([...hotels, entry])
    setShowAddForm(false)
    setAddForm(EMPTY_FORM)
  }

  // ── Edit ─────────────────────────────────────────────────────────────
  const startEdit = (entry) => {
    setEditForm({
      refId: entry.ref_id || '',
      checkin: entry.checkin || '',
      checkout: entry.checkout || '',
    })
    setEditingId(entry.id)
    setOpenMenuId(null)
  }

  const saveEdit = (entry) => {
    const nights = computeNights(editForm.checkin, editForm.checkout)
    if (nights <= 0) { alert('Check-out must be after check-in.'); return }
    const hotel = refHotels.find((h) => h.id === editForm.refId)
    const updated = hotels.map((h) =>
      h.id !== entry.id ? h : {
        ...h,
        ref_id: editForm.refId,
        name: hotel?.name || h.name,
        tier: hotel?.tier || h.tier,
        cost_per_night: hotel ? calcCostPerNight(hotel) : h.cost_per_night,
        price_single: hotel?.price_single || h.price_single || 0,
        price_double: hotel?.price_double || h.price_double || 0,
        price_triple: hotel?.price_triple || h.price_triple || 0,
        checkin: editForm.checkin,
        checkout: editForm.checkout,
        nights,
      }
    )
    onSaveHotels(updated)
    setEditingId(null)
  }

  // ── Status / Delete ───────────────────────────────────────────────────
  const markStatus = (entry, eventType) => {
    const note =
      eventType === 'confirmed' ? 'Marked as confirmed' :
      eventType === 'cancelled' ? 'Cancelled' :
      eventType === 'requested' ? 'Restored to requested' :
      'Status changed to ' + eventType
    const event = createTimelineEvent(eventType, 'email', note)
    onSaveHotels(hotels.map((h) =>
      h.id === entry.id
        ? { ...h, timeline: [...(h.timeline || []), event] }
        : h
    ))
    setOpenMenuId(null)
  }

  const deleteHotel = (entry) => {
    if (!window.confirm(`Remove "${entry.name}"? This cannot be undone.`)) return
    onSaveHotels(hotels.filter((h) => h.id !== entry.id))
    setOpenMenuId(null)
    if (editingId === entry.id) setEditingId(null)
  }

  // ── Timeline ──────────────────────────────────────────────────────────
  const addTimelineEvent = (entryId) => {
    const event = createTimelineEvent(timelineForm.type, timelineForm.method, timelineForm.note, timelineForm.ref)
    onSaveHotels(hotels.map((h) =>
      h.id === entryId
        ? { ...h, timeline: [...(h.timeline || []), event] }
        : h
    ))
    setTimelineForm(EMPTY_TL_FORM)
    setShowTimelineForm(null)
  }

  const removeTimelineEvent = (entryId, eventId) => {
    onSaveHotels(hotels.map((h) =>
      h.id === entryId
        ? { ...h, timeline: (h.timeline || []).filter((e) => e.id !== eventId) }
        : h
    ))
  }

  return (
    <div className="hotels-tab">

      {/* ── Header ── */}
      <div className="hotels-tab-header">
        <div className="hotels-tab-title-row">
          <h3 className="hotels-tab-title">All Hotels</h3>
          <span className="hotels-tab-count">{hotels.length} total</span>
          <button
            className="btn btn-primary"
            style={{ marginLeft: 'auto' }}
            onClick={() => { setShowAddForm(true); setEditingId(null) }}
          >
            + Add Hotel
          </button>
        </div>
        <div className="hotels-filter-bar">
          {HOTEL_STATUSES.map((s) => {
            const cnt = s.value === 'all' ? hotels.length : countByStatus(s.value)
            return (
              <button
                key={s.value}
                className={`hotels-filter-btn${filterStatus === s.value ? ' active' : ''}`}
                onClick={() => setFilterStatus(s.value)}
              >
                {s.label}
                {cnt > 0 && <span className="ht-filter-count">{cnt}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Add form ── */}
      {showAddForm && (
        <div className="tab-add-form">
          <div className="tab-add-form-title">Add Hotel</div>

          <div className="tab-add-field wide">
            <label>Hotel</label>
            <select
              className="tr-edit-input"
              value={addForm.refId}
              onChange={(e) => handleHotelSelect(e.target.value)}
            >
              <option value="">— Select hotel —</option>
              {renderHotelOptions()}
            </select>
          </div>

          <div className="tab-add-field">
            <label>Check-in {addForm.checkin && getDayNum(addForm.checkin) ? <span className="ht-day-badge">D{getDayNum(addForm.checkin)}</span> : ''}</label>
            <input
              type="date"
              className="tr-edit-input"
              value={addForm.checkin}
              min={tripStart}
              max={tripEnd}
              onChange={(e) => setAddForm((f) => ({ ...f, checkin: e.target.value }))}
            />
          </div>

          <div className="tab-add-field">
            <label>Check-out {addForm.checkout && getDayNum(addForm.checkout) ? <span className="ht-day-badge">D{getDayNum(addForm.checkout)}</span> : ''}</label>
            <input
              type="date"
              className="tr-edit-input"
              value={addForm.checkout}
              min={tripStart}
              max={tripEnd}
              onChange={(e) => setAddForm((f) => ({ ...f, checkout: e.target.value }))}
            />
          </div>

          {addForm.checkin && addForm.checkout && (
            <div className="tab-add-field">
              <label>Nights</label>
              <span className="tr-edit-input" style={{ display: 'flex', alignItems: 'center', background: 'var(--color-bg-alt)', color: 'var(--color-text-light)' }}>
                {computeNights(addForm.checkin, addForm.checkout)} nights
              </span>
            </div>
          )}

          <div className="tab-add-actions">
            <button
              className="btn btn-success"
              disabled={!addForm.refId || !addForm.checkin || !addForm.checkout}
              onClick={addHotel}
            >Save</button>
            <button className="btn btn-outline" onClick={() => { setShowAddForm(false); setAddForm(EMPTY_FORM) }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {hotels.length === 0 ? (
        <div className="hotels-empty">
          No hotels yet. Click <strong>+ Add Hotel</strong> to add a hotel with its check-in and check-out dates.
        </div>
      ) : filtered.length === 0 ? (
        <div className="hotels-empty">No {filterStatus} hotels.</div>
      ) : (
        <div className="hotels-list">
          <div className="hotels-list-header">
            <span />
            <span className="ht-col-hotel">Hotel</span>
            <span className="ht-col-dates">Check-in / Out</span>
            <span className="ht-col-nights">Nights</span>
            <span className="ht-col-rooms">Rooms</span>
            <span className="ht-col-status">Status</span>
            <span className="ht-col-ref">Ref</span>
            <span className="ht-col-cost">Cost</span>
            <span className="ht-col-activity">Status Log</span>
            <span className="ht-col-menu" />
          </div>

          {filtered.map((entry) => (
            <div key={entry.id}>
              <div className={`hotels-row${getStatus(entry) === 'cancelled' ? ' cancelled' : ''}`}>

                {/* Chevron toggle */}
                <button
                  className={`ht-chevron${expandedTimelineId === entry.id ? ' expanded' : ''}`}
                  onClick={() => setExpandedTimelineId(expandedTimelineId === entry.id ? null : entry.id)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>

                {/* Hotel name + tier */}
                <div className="ht-hotel">
                  <span className="ht-hotel-name">{entry.name}</span>
                  {entry.tier && <span className="ht-tier-badge">{entry.tier}</span>}
                </div>

                {/* Dates */}
                <div className="ht-dates">
                  <span className="ht-checkin-out">
                    {fmtDate(entry.checkin)}{getDayNum(entry.checkin) ? ` (D${getDayNum(entry.checkin)})` : ''} → {fmtDate(entry.checkout)}{getDayNum(entry.checkout) ? ` (D${getDayNum(entry.checkout)})` : ''}
                  </span>
                </div>

                {/* Nights */}
                <div className="ht-nights">{entry.nights}n</div>

                {/* Rooms */}
                <div className="ht-rooms">{fmtRooms(booking) || '—'}</div>

                {/* Status */}
                <div className="ht-status">
                  <span className={`itin-status-badge status-${getStatus(entry)}`}>
                    {STATUS_LABELS[getStatus(entry)]}
                  </span>
                </div>

                {/* Ref */}
                <div className="ht-ref">
                  {entry.confirmation_ref
                    ? <span className="ht-ref-value">{entry.confirmation_ref}</span>
                    : <span className="ht-ref-empty">—</span>}
                </div>

                {/* Cost */}
                <div className="ht-cost">
                  <span>{fmtCost(entry.cost_per_night)}/night</span>
                  <span className="ht-cost-total"> · {fmtCost(entry.cost_per_night * entry.nights)} total</span>
                </div>

                {/* Activity badge */}
                <button
                  className={`ht-activity-badge${(entry.timeline || []).length > 0 ? ' has-events' : ''}`}
                  onClick={() => setExpandedTimelineId(expandedTimelineId === entry.id ? null : entry.id)}
                >
                  {(entry.timeline || []).length > 0
                    ? `${(entry.timeline || []).length} event${(entry.timeline || []).length !== 1 ? 's' : ''}`
                    : 'No logs'}
                </button>

                {/* Actions */}
                <div className="ht-actions">
                  <button
                    className="ht-action-icon"
                    title="Generate Message"
                    onClick={(e) => { e.stopPropagation(); setMessageModalHotel(entry) }}
                  ><IconMail /></button>
                  <button
                    className="ht-menu-btn"
                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === entry.id ? null : entry.id) }}
                  >⋮</button>
                  {openMenuId === entry.id && (
                    <div className="ht-menu" onClick={(e) => e.stopPropagation()}>
                      {getStatus(entry) !== 'confirmed' && (
                        <button className="ht-menu-item" onClick={() => markStatus(entry, 'confirmed')}>
                          <IconCheck /> Mark Confirmed
                        </button>
                      )}
                      <button className="ht-menu-item" onClick={() => startEdit(entry)}>
                        <IconEdit /> Edit
                      </button>
                      {(getStatus(entry) === 'confirmed' || getStatus(entry) === 'cancelled') && (
                        <button className="ht-menu-item" onClick={() => markStatus(entry, 'requested')}>
                          <IconUndo /> Restore to Requested
                        </button>
                      )}
                      {getStatus(entry) !== 'cancelled' && (
                        <button className="ht-menu-item danger" onClick={() => markStatus(entry, 'cancelled')}>
                          <IconXCircle /> Cancel
                        </button>
                      )}
                      <button className="ht-menu-item danger" onClick={() => deleteHotel(entry)}>
                        <IconTrash /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Inline edit */}
              {editingId === entry.id && (
                <div className="ht-inline-edit">
                  <div className="tr-edit-grid">
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="tr-edit-label">Hotel</label>
                      <select
                        className="tr-edit-input"
                        value={editForm.refId}
                        onChange={(e) => handleEditHotelSelect(e.target.value)}
                      >
                        <option value="">— Keep current —</option>
                        {renderHotelOptions()}
                      </select>
                    </div>
                    <div>
                      <label className="tr-edit-label">Check-in {editForm.checkin && getDayNum(editForm.checkin) ? <span className="ht-day-badge">D{getDayNum(editForm.checkin)}</span> : ''}</label>
                      <input
                        type="date"
                        className="tr-edit-input"
                        value={editForm.checkin}
                        min={tripStart}
                        max={tripEnd}
                        onChange={(e) => setEditForm((f) => ({ ...f, checkin: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="tr-edit-label">Check-out {editForm.checkout && getDayNum(editForm.checkout) ? <span className="ht-day-badge">D{getDayNum(editForm.checkout)}</span> : ''}</label>
                      <input
                        type="date"
                        className="tr-edit-input"
                        value={editForm.checkout}
                        min={tripStart}
                        max={tripEnd}
                        onChange={(e) => setEditForm((f) => ({ ...f, checkout: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="tr-edit-actions">
                    <button className="btn btn-success" onClick={() => saveEdit(entry)}>Save</button>
                    <button className="btn btn-outline" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Timeline section */}
              {expandedTimelineId === entry.id && (
                <div className="ht-timeline">
                  <div className="ht-timeline-header">
                    <span className="ht-timeline-title">Status Log Timeline</span>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setShowTimelineForm(showTimelineForm === entry.id ? null : entry.id)
                        setTimelineForm(EMPTY_TL_FORM)
                      }}
                    >
                      + Log Status
                    </button>
                  </div>

                  {/* Inline add form */}
                  {showTimelineForm === entry.id && (
                    <div className="ht-timeline-form">
                      <div className="ht-tl-form-row">
                        <select
                          className="tr-edit-input"
                          value={timelineForm.type}
                          onChange={(e) => setTimelineForm((f) => ({ ...f, type: e.target.value }))}
                        >
                          {TIMELINE_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        <select
                          className="tr-edit-input"
                          value={timelineForm.method}
                          onChange={(e) => setTimelineForm((f) => ({ ...f, method: e.target.value }))}
                        >
                          {TIMELINE_METHODS.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                        <input
                          className="tr-edit-input"
                          placeholder="Note (optional)"
                          value={timelineForm.note}
                          onChange={(e) => setTimelineForm((f) => ({ ...f, note: e.target.value }))}
                        />
                        <input
                          className="tr-edit-input"
                          placeholder="Ref # (optional)"
                          value={timelineForm.ref}
                          onChange={(e) => setTimelineForm((f) => ({ ...f, ref: e.target.value }))}
                          style={{ maxWidth: 140 }}
                        />
                      </div>
                      <div className="ht-tl-form-actions">
                        <button className="btn btn-success btn-sm" onClick={() => addTimelineEvent(entry.id)}>
                          Save
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => setShowTimelineForm(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Event list */}
                  <div className="ht-timeline-events">
                    {(entry.timeline || []).length === 0 ? (
                      <div className="ht-timeline-empty">No status logged yet.</div>
                    ) : (
                      (entry.timeline || []).map((evt) => {
                        const typeInfo = TIMELINE_TYPES.find((t) => t.value === evt.type) || TIMELINE_TYPES[0]
                        return (
                          <div key={evt.id} className="ht-tl-event">
                            <span className="ht-tl-icon">{typeInfo.icon}</span>
                            <span className={`ht-tl-type ht-tl-type-${evt.type}`}>{typeInfo.label}</span>
                            <span className="ht-tl-method">{evt.method}</span>
                            {evt.note && <span className="ht-tl-note">{evt.note}</span>}
                            {evt.ref && <span className="ht-tl-ref">#{evt.ref}</span>}
                            <span className="ht-tl-date">{fmtTimeline(evt.date)}</span>
                            <button
                              className="ht-tl-delete"
                              title="Remove event"
                              onClick={() => removeTimelineEvent(entry.id, evt.id)}
                            >×</button>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Message Generator Modal */}
      {messageModalHotel && (
        <HotelMessageModal
          hotel={messageModalHotel}
          booking={booking}
          refHotel={refHotels.find((r) => r.id === messageModalHotel.ref_id) || null}
          onClose={() => setMessageModalHotel(null)}
          onLogActivity={(entryId, type, method, note) => {
            const event = createTimelineEvent(type, method, note)
            onSaveHotels(hotels.map((h) =>
              h.id === entryId
                ? { ...h, timeline: [...(h.timeline || []), event] }
                : h
            ))
          }}
        />
      )}
    </div>
  )
}
