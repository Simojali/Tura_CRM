import { useState, useEffect, useMemo } from 'react'
import { loadReferenceData } from '../lib/referenceData'
import { fmtDate, fmtCost } from '../lib/formatters'
import { TRANSFER_STATUS_LABELS as STATUS_LABELS } from '../lib/constants'

const STATUSES = [
  { value: 'all',       label: 'All' },
  { value: 'requested', label: 'Requested' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'done',      label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
]

const EMPTY_FLAT_FORM = {
  dayIdx: '', refId: '', time: '09:00',
  status: 'requested', driverName: '', driverPhone: '',
  fromLocation: '', toLocation: '',
}

const EMPTY_CONTRACT_FORM = {
  refId: '', daysHired: '', costPerDay: '',
  pricingMode: 'private',
  driverName: '', driverPhone: '',
  status: 'requested', notes: '',
}

const EMPTY_MOVEMENT_FORM = { dayIdx: '', time: '09:00', fromLocation: '', toLocation: '' }

function genId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
}

export default function TransfersTab({ booking, itinerary, contracts = [], onSave, onSaveContracts }) {
  const [refTransfers, setRefTransfers]   = useState([])
  const [refTransports, setRefTransports] = useState([])
  const [filterStatus,  setFilterStatus]  = useState('all')

  // Add form
  const [showAddForm, setShowAddForm] = useState(false)
  const [addType,     setAddType]     = useState('flat') // 'flat' | 'contract'
  const [flatForm,    setFlatForm]    = useState(EMPTY_FLAT_FORM)
  const [contractForm, setContractForm] = useState(EMPTY_CONTRACT_FORM)

  // Inline editing
  const [editingFlatKey,     setEditingFlatKey]     = useState(null) // 'dayIndex-transferIndex'
  const [editFlatForm,       setEditFlatForm]       = useState({})
  const [editingContractId,  setEditingContractId]  = useState(null)
  const [editContractForm,   setEditContractForm]   = useState({})
  const [editingMovementKey, setEditingMovementKey] = useState(null) // 'contractId-movementId'
  const [editMovementForm,   setEditMovementForm]   = useState({})

  // Add movement form (inside a contract)
  const [addingMovementFor,  setAddingMovementFor]  = useState(null) // contractId
  const [movementForm,       setMovementForm]       = useState(EMPTY_MOVEMENT_FORM)

  // Expanded contracts
  const [expanded, setExpanded] = useState(new Set())

  // Dots menus
  const [openFlatMenu,     setOpenFlatMenu]     = useState(null)
  const [openContractMenu, setOpenContractMenu] = useState(null)

  // Load reference data
  useEffect(() => {
    loadReferenceData().then((items) => {
      setRefTransfers(items.filter((r) => r.category === 'transfer'))
      setRefTransports(items.filter((r) => r.category === 'transport'))
    })
  }, [])

  // ── Pricing helper ─────────────────────────────────────────────────
  const guests = Math.max(Number(booking?.number_of_guests) || 1, 1)

  const calcCost = (ref, mode) => {
    if (!ref) return 0
    if (mode === 'group') {
      if (ref.group_price != null) return ref.group_price * guests
      if (ref.capacity) return (ref.price / ref.capacity) * guests
    }
    return ref.price || 0
  }

  // Close menus on outside click
  useEffect(() => {
    const close = () => { setOpenFlatMenu(null); setOpenContractMenu(null) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  // ── Flat transfers: flat list from all day rows ──────────────────────
  const allFlat = useMemo(() =>
    itinerary.flatMap((row, dayIndex) =>
      (row.transfers || []).map((t, transferIndex) => ({
        ...t, date: row.date, day: row.day, city: row.city, dayIndex, transferIndex,
      }))
    ).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)),
    [itinerary]
  )

  // ── Unified sorted list ─────────────────────────────────────────────
  // Each item: { kind: 'flat', ...} or { kind: 'contract', ...}
  const unifiedList = useMemo(() => {
    const flats = allFlat.map((t) => ({ kind: 'flat', sortKey: t.date + t.time, ...t }))
    const contractItems = contracts.map((c) => {
      const firstMov = [...(c.movements || [])].sort((a, b) => a.date?.localeCompare(b.date || '') || 0)[0]
      const sortKey = firstMov?.date ? firstMov.date + (firstMov.time || '00:00') : '9999'
      return { kind: 'contract', sortKey, ...c }
    })
    return [...flats, ...contractItems].sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  }, [allFlat, contracts])

  const filteredList = useMemo(() => {
    if (filterStatus === 'all') return unifiedList
    return unifiedList.filter((item) => (item.status || 'requested') === filterStatus)
  }, [unifiedList, filterStatus])

  const countByStatus = (status) => unifiedList.filter((i) => (i.status || 'requested') === status).length

  // ── Flat transfer CRUD ──────────────────────────────────────────────
  const updateFlat = (dayIndex, transferIndex, changes) => {
    const updated = itinerary.map((row, ri) => {
      if (ri !== dayIndex) return row
      return { ...row, transfers: row.transfers.map((t, ti) => ti !== transferIndex ? t : { ...t, ...changes }) }
    })
    onSave(updated)
  }

  const deleteFlat = (dayIndex, transferIndex, name) => {
    if (!window.confirm(`Delete "${name || 'this transfer'}"? This cannot be undone.`)) return
    const updated = itinerary.map((row, ri) => {
      if (ri !== dayIndex) return row
      return { ...row, transfers: row.transfers.filter((_, ti) => ti !== transferIndex) }
    })
    onSave(updated)
    setOpenFlatMenu(null)
  }

  const markFlatStatus = (item, status) => {
    updateFlat(item.dayIndex, item.transferIndex, { status })
    setOpenFlatMenu(null)
  }

  const addFlat = () => {
    const { dayIdx, refId, time, status, driverName, driverPhone, fromLocation, toLocation } = flatForm
    if (dayIdx === '' || !refId) return
    const [category, id] = refId.split(':')
    const pool = category === 'transfer' ? refTransfers : refTransports
    const item = pool.find((r) => r.id === id)
    if (!item) return
    const cost = item.price || 0
    const updated = itinerary.map((row, ri) => {
      if (ri !== Number(dayIdx)) return row
      return {
        ...row,
        transfers: [...(row.transfers || []), {
          id, name: item.name, cost, type: category,
          base_cost: item.price || 0,
          time, capacity: item.capacity || null, status,
          driver_name: driverName, driver_phone: driverPhone,
          from_location: fromLocation, to_location: toLocation, notes: '',
        }].sort((a, b) => a.time.localeCompare(b.time)),
      }
    })
    onSave(updated)
    setShowAddForm(false)
    setFlatForm(EMPTY_FLAT_FORM)
  }

  const startEditFlat = (item) => {
    setEditFlatForm({
      refId: item.id ? `${item.type || 'transfer'}:${item.id}` : '',
      time: item.time || '', status: item.status || 'requested',
      from_location: item.from_location || '', to_location: item.to_location || '',
      driver_name: item.driver_name || '', driver_phone: item.driver_phone || '',
      notes: item.notes || '',
    })
    setEditingFlatKey(`${item.dayIndex}-${item.transferIndex}`)
    setOpenFlatMenu(null)
  }

  const handleEditFlatRefChange = (refId) => {
    if (!refId) return
    const [category, id] = refId.split(':')
    const pool = category === 'transfer' ? refTransfers : refTransports
    const ref = pool.find((r) => r.id === id)
    if (!ref) return
    setEditFlatForm((f) => ({ ...f, refId }))
  }

  const saveEditFlat = (item) => {
    const { refId, ...rest } = editFlatForm
    const changes = { ...rest }
    // Always resolve the reference item and update name/cost/etc
    if (refId) {
      const [category, id] = refId.split(':')
      const pool = category === 'transfer' ? refTransfers : refTransports
      const ref = pool.find((r) => r.id === id)
      if (ref) {
        changes.id = id
        changes.name = ref.name
        changes.cost = ref.price || 0
        changes.base_cost = ref.price || 0
        changes.capacity = ref.capacity || null
        changes.type = category
      }
    }
    updateFlat(item.dayIndex, item.transferIndex, changes)
    setEditingFlatKey(null)
  }

  // ── Contract CRUD ───────────────────────────────────────────────────
  const addContract = () => {
    const { refId, daysHired, costPerDay, pricingMode, driverName, driverPhone, status, notes } = contractForm
    if (!refId || !daysHired) return
    const item = refTransports.find((r) => r.id === refId)
    if (!item) return
    const newContract = {
      id: genId(), ref_id: refId,
      name: item.name, capacity: item.capacity || null,
      cost_per_day: costPerDay !== '' ? Number(costPerDay) : calcCost(item, pricingMode),
      pricing_mode: pricingMode, base_cost: item.price || 0,
      group_price: item.group_price || null, capacity: item.capacity || null,
      days_hired: Number(daysHired),
      driver_name: driverName, driver_phone: driverPhone,
      status, notes, movements: [],
    }
    const updated = [...contracts, newContract]
    onSaveContracts(updated)
    setExpanded((prev) => new Set([...prev, newContract.id]))
    setShowAddForm(false)
    setContractForm(EMPTY_CONTRACT_FORM)
  }

  const deleteContract = (contractId, name) => {
    if (!window.confirm(`Delete transport contract "${name}"? This cannot be undone.`)) return
    onSaveContracts(contracts.filter((c) => c.id !== contractId))
    setOpenContractMenu(null)
  }

  const markContractStatus = (contractId, status) => {
    onSaveContracts(contracts.map((c) => c.id === contractId ? { ...c, status } : c))
    setOpenContractMenu(null)
  }

  const startEditContract = (c) => {
    setEditContractForm({
      ref_id: c.ref_id || '', name: c.name,
      cost_per_day: c.cost_per_day, days_hired: c.days_hired,
      pricing_mode: c.pricing_mode || 'private',
      driver_name: c.driver_name || '', driver_phone: c.driver_phone || '',
      status: c.status || 'requested', notes: c.notes || '',
    })
    setEditingContractId(c.id)
    setOpenContractMenu(null)
  }

  const handleEditContractRefChange = (refId) => {
    const ref = refTransports.find((r) => r.id === refId)
    if (!ref) return
    setEditContractForm((f) => ({
      ...f, ref_id: refId, name: ref.name,
      cost_per_day: calcCost(ref, f.pricing_mode),
    }))
  }

  const saveEditContract = (contractId) => {
    const { ref_id, ...rest } = editContractForm
    const changes = { ...rest }
    const c = contracts.find((x) => x.id === contractId)
    // Always resolve the reference item and update related fields
    if (ref_id) {
      const ref = refTransports.find((r) => r.id === ref_id)
      if (ref) {
        changes.ref_id = ref_id
        changes.name = ref.name
        changes.capacity = ref.capacity || null
        changes.base_cost = ref.price || 0
        changes.group_price = ref.group_price || null
        changes.capacity = ref.capacity || null
      }
    }
    // Recalculate cost_per_day if pricing_mode changed
    if (c && changes.pricing_mode !== (c.pricing_mode || 'private')) {
      const refData = ref_id ? refTransports.find((r) => r.id === ref_id) : null
      const ref = refData || { price: c.base_cost || c.cost_per_day, group_price: c.group_price, capacity: c.capacity }
      changes.cost_per_day = calcCost(ref, changes.pricing_mode)
    }
    onSaveContracts(contracts.map((x) => x.id === contractId ? { ...x, ...changes } : x))
    setEditingContractId(null)
  }

  // ── Movement CRUD ───────────────────────────────────────────────────
  const addMovement = (contractId) => {
    const { dayIdx, time, fromLocation, toLocation } = movementForm
    if (dayIdx === '') return
    const row = itinerary[Number(dayIdx)]
    const newMov = {
      id: genId(), dayIdx: Number(dayIdx),
      date: row?.date || '', time,
      from_location: fromLocation, to_location: toLocation,
    }
    onSaveContracts(contracts.map((c) => {
      if (c.id !== contractId) return c
      const movements = [...(c.movements || []), newMov]
        .sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.time.localeCompare(b.time))
      return { ...c, movements }
    }))
    setAddingMovementFor(null)
    setMovementForm(EMPTY_MOVEMENT_FORM)
  }

  const deleteMovement = (contractId, movementId) => {
    onSaveContracts(contracts.map((c) => {
      if (c.id !== contractId) return c
      return { ...c, movements: (c.movements || []).filter((m) => m.id !== movementId) }
    }))
  }

  const startEditMovement = (contractId, mov) => {
    setEditMovementForm({
      dayIdx: mov.dayIdx ?? '', time: mov.time || '',
      from_location: mov.from_location || '', to_location: mov.to_location || '',
    })
    setEditingMovementKey(`${contractId}-${mov.id}`)
  }

  const saveEditMovement = (contractId, movementId) => {
    const { dayIdx, time, from_location, to_location } = editMovementForm
    const row = itinerary[Number(dayIdx)]
    onSaveContracts(contracts.map((c) => {
      if (c.id !== contractId) return c
      const movements = (c.movements || []).map((m) =>
        m.id !== movementId ? m
          : { ...m, dayIdx: Number(dayIdx), date: row?.date || m.date, time, from_location, to_location }
      ).sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.time.localeCompare(b.time))
      return { ...c, movements }
    }))
    setEditingMovementKey(null)
  }

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const totalItems = allFlat.length + contracts.length

  // ── Derived reference data for add flat form ──────────────────────
  const selFlatDay = flatForm.dayIdx !== '' ? itinerary[Number(flatForm.dayIdx)] : null
  const selFlatCity = selFlatDay?.city || ''
  const cityTransfers = selFlatCity ? refTransfers.filter((r) => r.city === selFlatCity) : refTransfers

  // Pre-fill cost when transport ref is selected in contract form
  const handleContractRefChange = (refId) => {
    const item = refTransports.find((r) => r.id === refId)
    setContractForm((f) => ({
      ...f, refId,
      costPerDay: item ? String(Math.round(calcCost(item, f.pricingMode) * 100) / 100) : '',
    }))
  }

  // Recalculate cost when pricing mode changes on contract form
  const handleContractModeChange = (mode) => {
    setContractForm((f) => {
      const item = refTransports.find((r) => r.id === f.refId)
      const costPerDay = item ? String(Math.round(calcCost(item, mode) * 100) / 100) : f.costPerDay
      return { ...f, pricingMode: mode, costPerDay }
    })
  }

  return (
    <div className="transfers-tab">
      {/* ── Header ── */}
      <div className="transfers-tab-header">
        <div className="transfers-tab-title-row">
          <h3 className="transfers-tab-title">Transfers & Transport</h3>
          <span className="transfers-tab-count">{totalItems} total</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-primary"
              onClick={() => { setShowAddForm(true); setAddType('flat'); setEditingFlatKey(null); setEditingContractId(null) }}
            >
              + Transfer
            </button>
            <button
              className="btn btn-outline"
              onClick={() => { setShowAddForm(true); setAddType('contract'); setEditingFlatKey(null); setEditingContractId(null) }}
            >
              + Transport
            </button>
          </div>
        </div>

        {/* Status filter */}
        <div className="transfers-filter-bar">
          {STATUSES.map((s) => {
            const cnt = s.value === 'all' ? totalItems : countByStatus(s.value)
            return (
              <button
                key={s.value}
                className={`transfers-filter-btn${filterStatus === s.value ? ' active' : ''}`}
                onClick={() => setFilterStatus(s.value)}
              >
                {s.label}{cnt > 0 && <span className="tf-filter-count">{cnt}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Add Form ── */}
      {showAddForm && (
        <div className="tab-add-form">
          {addType === 'flat' ? (
            <>
              <div className="tab-add-form-title">Add Single Transfer / Service</div>
              <div className="tab-add-field">
                <label>Day</label>
                <select className="tr-edit-input" value={flatForm.dayIdx}
                  onChange={(e) => setFlatForm((f) => ({ ...f, dayIdx: e.target.value, refId: '' }))}>
                  <option value="">— Select day —</option>
                  {itinerary.map((row, i) => (
                    <option key={i} value={i}>Day {row.day} · {fmtDate(row.date)}{row.city ? ` · ${row.city}` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="tab-add-field">
                <label>Time</label>
                <input type="time" className="tr-edit-input" value={flatForm.time}
                  onChange={(e) => setFlatForm((f) => ({ ...f, time: e.target.value }))} />
              </div>
              <div className="tab-add-field wide">
                <label>Transfer</label>
                <select className="tr-edit-input" value={flatForm.refId} disabled={flatForm.dayIdx === ''}
                  onChange={(e) => setFlatForm((f) => ({ ...f, refId: e.target.value }))}>
                  <option value="">— Select —</option>
                  {cityTransfers.map((r) => (
                    <option key={`transfer:${r.id}`} value={`transfer:${r.id}`}>
                      {r.name}{r.capacity ? ` (${r.capacity} seats)` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {flatForm.refId && (
                <div className="tab-add-field">
                  <label>Cost Preview</label>
                  <span className="cost-preview">
                    {fmtCost((() => {
                      const [, id] = flatForm.refId.split(':')
                      const ref = [...refTransfers, ...refTransports].find((r) => r.id === id)
                      return ref?.price || 0
                    })())}
                  </span>
                </div>
              )}
              <div className="tab-add-field">
                <label>From (Pickup)</label>
                <input className="tr-edit-input" placeholder="e.g. Marrakech Airport" value={flatForm.fromLocation}
                  onChange={(e) => setFlatForm((f) => ({ ...f, fromLocation: e.target.value }))} />
              </div>
              <div className="tab-add-field">
                <label>To (Dropoff)</label>
                <input className="tr-edit-input" placeholder="e.g. Hotel Kenzi" value={flatForm.toLocation}
                  onChange={(e) => setFlatForm((f) => ({ ...f, toLocation: e.target.value }))} />
              </div>
              <div className="tab-add-field">
                <label>Status</label>
                <select className="tr-edit-input" value={flatForm.status}
                  onChange={(e) => setFlatForm((f) => ({ ...f, status: e.target.value }))}>
                  {STATUSES.filter((s) => s.value !== 'all').map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="tab-add-field">
                <label>Driver Name</label>
                <input className="tr-edit-input" placeholder="Optional" value={flatForm.driverName}
                  onChange={(e) => setFlatForm((f) => ({ ...f, driverName: e.target.value }))} />
              </div>
              <div className="tab-add-field">
                <label>Driver Phone</label>
                <input className="tr-edit-input" placeholder="+212 6xx xxx xxx" value={flatForm.driverPhone}
                  onChange={(e) => setFlatForm((f) => ({ ...f, driverPhone: e.target.value }))} />
              </div>
              <div className="tab-add-actions">
                <button className="btn btn-success" disabled={flatForm.dayIdx === '' || !flatForm.refId} onClick={addFlat}>Save</button>
                <button className="btn btn-outline" onClick={() => { setShowAddForm(false); setFlatForm(EMPTY_FLAT_FORM) }}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <div className="tab-add-form-title">Add Daily Transport</div>
              <div className="tab-add-field">
                <label>Pricing</label>
                <div className="pricing-mode-toggle">
                  <button type="button" className={`toggle-btn${contractForm.pricingMode === 'private' ? ' active' : ''}`}
                    onClick={() => handleContractModeChange('private')}>Private</button>
                  <button type="button" className={`toggle-btn${contractForm.pricingMode === 'group' ? ' active' : ''}`}
                    onClick={() => handleContractModeChange('group')}>Group</button>
                </div>
              </div>
              <div className="tab-add-field wide">
                <label>Transport Provider</label>
                <select className="tr-edit-input" value={contractForm.refId}
                  onChange={(e) => handleContractRefChange(e.target.value)}>
                  <option value="">— Select transport —</option>
                  {refTransports.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}{r.capacity ? ` (${r.capacity} seats)` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="tab-add-field">
                <label>Days Hired</label>
                <input type="number" className="tr-edit-input" placeholder="e.g. 6" min="1" value={contractForm.daysHired}
                  onChange={(e) => setContractForm((f) => ({ ...f, daysHired: e.target.value }))} />
              </div>
              <div className="tab-add-field">
                <label>Cost / Day (€)</label>
                <input type="number" className="tr-edit-input" placeholder="e.g. 150" min="0" value={contractForm.costPerDay}
                  onChange={(e) => setContractForm((f) => ({ ...f, costPerDay: e.target.value }))} />
              </div>
              <div className="tab-add-field">
                <label>Driver Name</label>
                <input className="tr-edit-input" placeholder="Optional" value={contractForm.driverName}
                  onChange={(e) => setContractForm((f) => ({ ...f, driverName: e.target.value }))} />
              </div>
              <div className="tab-add-field">
                <label>Driver Phone</label>
                <input className="tr-edit-input" placeholder="+212 6xx xxx xxx" value={contractForm.driverPhone}
                  onChange={(e) => setContractForm((f) => ({ ...f, driverPhone: e.target.value }))} />
              </div>
              <div className="tab-add-field">
                <label>Status</label>
                <select className="tr-edit-input" value={contractForm.status}
                  onChange={(e) => setContractForm((f) => ({ ...f, status: e.target.value }))}>
                  {STATUSES.filter((s) => s.value !== 'all').map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="tab-add-field wide">
                <label>Notes</label>
                <textarea className="tr-edit-input" rows={2} placeholder="Special instructions…" value={contractForm.notes}
                  onChange={(e) => setContractForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="tab-add-actions">
                <button className="btn btn-success" disabled={!contractForm.refId || !contractForm.daysHired} onClick={addContract}>Save</button>
                <button className="btn btn-outline" onClick={() => { setShowAddForm(false); setContractForm(EMPTY_CONTRACT_FORM) }}>Cancel</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Empty state ── */}
      {totalItems === 0 ? (
        <div className="transfers-empty">
          No transfers or transport yet. Click <strong>+ Add</strong> to get started.
        </div>
      ) : filteredList.length === 0 ? (
        <div className="transfers-empty">No {filterStatus} items.</div>
      ) : (
        <div className="transfers-list">
          {/* Column headers (for flat rows) */}
          <div className="transfers-list-header">
            <span className="tr-col-datetime">Date & Time</span>
            <span className="tr-col-info">Service / Route</span>
            <span className="tr-col-driver">Driver</span>
            <span className="tr-col-status">Status</span>
            <span className="tr-col-cost">Cost</span>
            <span className="tr-col-menu" />
          </div>

          {filteredList.map((item, idx) => {
            if (item.kind === 'flat') {
              const flatKey = `${item.dayIndex}-${item.transferIndex}`
              const isEditing = editingFlatKey === flatKey
              return (
                <div key={`flat-${idx}`}>
                  <div className={`transfers-row${item.status === 'cancelled' ? ' cancelled' : ''}`}>
                    <div className="tr-datetime">
                      <span className="tr-date">Day {item.day} · {fmtDate(item.date)}</span>
                      <span className="tr-time">{item.time}</span>
                      {item.city && <span className="tr-city">{item.city}</span>}
                    </div>
                    <div className="tr-info">
                      <span className="tr-name">{item.name}</span>
                      {(item.from_location || item.to_location) && (
                        <span className="tr-route">{item.from_location || '?'} → {item.to_location || '?'}</span>
                      )}
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {item.capacity && <span className="tr-meta">{item.capacity} seats</span>}
                        <span className="itin-type-badge transfer">Transfer</span>
                      </div>
                    </div>
                    <div className="tr-driver">
                      {item.driver_name
                        ? <><span className="tr-driver-name">👤 {item.driver_name}</span>{item.driver_phone && <span className="tr-driver-phone">{item.driver_phone}</span>}</>
                        : <span className="tr-driver-empty">—</span>}
                    </div>
                    <div className="tr-status">
                      <span className={`itin-status-badge status-${item.status || 'requested'}`}>
                        {STATUS_LABELS[item.status || 'requested']}
                      </span>
                    </div>
                    <div className="tr-cost">{fmtCost(item.cost)}</div>
                    <div className="tr-actions">
                      <button className="tr-menu-btn" onClick={(e) => { e.stopPropagation(); setOpenFlatMenu(openFlatMenu === flatKey ? null : flatKey); setOpenContractMenu(null) }}>⋮</button>
                      {openFlatMenu === flatKey && (
                        <div className="tr-menu" onClick={(e) => e.stopPropagation()}>
                          {item.status !== 'confirmed' && <button className="tr-menu-item" onClick={() => markFlatStatus(item, 'confirmed')}>✅ Mark Confirmed</button>}
                          {item.status !== 'done'      && <button className="tr-menu-item" onClick={() => markFlatStatus(item, 'done')}>✔ Mark Done</button>}
                          <button className="tr-menu-item" onClick={() => startEditFlat(item)}>✏️ Edit</button>
                          {item.status !== 'cancelled' && <button className="tr-menu-item danger" onClick={() => markFlatStatus(item, 'cancelled')}>✕ Cancel</button>}
                          {item.status === 'cancelled' && <button className="tr-menu-item" onClick={() => markFlatStatus(item, 'requested')}>↺ Restore</button>}
                          <button className="tr-menu-item danger" onClick={() => deleteFlat(item.dayIndex, item.transferIndex, item.name)}>🗑️ Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                  {isEditing && (
                    <div className="tr-inline-edit">
                      <div className="tr-edit-grid">
                        <div style={{ gridColumn: '1 / -1' }}><label className="tr-edit-label">Transfer / Service</label>
                          <select className="tr-edit-input" value={editFlatForm.refId || ''} onChange={(e) => handleEditFlatRefChange(e.target.value)}>
                            <option value="" disabled>— Select —</option>
                            {refTransfers.map((r) => (
                              <option key={`transfer:${r.id}`} value={`transfer:${r.id}`}>{r.name}{r.capacity ? ` (${r.capacity} seats)` : ''}</option>
                            ))}
                          </select>
                        </div>
                        <div><label className="tr-edit-label">Time</label><input type="time" className="tr-edit-input" value={editFlatForm.time} onChange={(e) => setEditFlatForm((f) => ({ ...f, time: e.target.value }))} /></div>
                        <div><label className="tr-edit-label">Status</label>
                          <select className="tr-edit-input" value={editFlatForm.status} onChange={(e) => setEditFlatForm((f) => ({ ...f, status: e.target.value }))}>
                            {STATUSES.filter((s) => s.value !== 'all').map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </div>
                        <div><label className="tr-edit-label">From (Pickup)</label><input className="tr-edit-input" value={editFlatForm.from_location} onChange={(e) => setEditFlatForm((f) => ({ ...f, from_location: e.target.value }))} /></div>
                        <div><label className="tr-edit-label">To (Dropoff)</label><input className="tr-edit-input" value={editFlatForm.to_location} onChange={(e) => setEditFlatForm((f) => ({ ...f, to_location: e.target.value }))} /></div>
                        <div><label className="tr-edit-label">Driver name</label><input className="tr-edit-input" value={editFlatForm.driver_name} onChange={(e) => setEditFlatForm((f) => ({ ...f, driver_name: e.target.value }))} /></div>
                        <div><label className="tr-edit-label">Driver phone</label><input className="tr-edit-input" value={editFlatForm.driver_phone} onChange={(e) => setEditFlatForm((f) => ({ ...f, driver_phone: e.target.value }))} /></div>
                        <div style={{ gridColumn: '1 / -1' }}><label className="tr-edit-label">Notes</label><textarea className="tr-edit-input" rows={2} value={editFlatForm.notes} onChange={(e) => setEditFlatForm((f) => ({ ...f, notes: e.target.value }))} /></div>
                      </div>
                      <div className="tr-edit-actions">
                        <button className="btn btn-success" onClick={() => saveEditFlat(item)}>Save</button>
                        <button className="btn btn-outline" onClick={() => setEditingFlatKey(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                  {editingFlatKey !== flatKey && item.notes && <div className="tr-notes-row">📝 {item.notes}</div>}
                </div>
              )
            }

            // kind === 'contract'
            const c = item
            const isExpandedC = expanded.has(c.id)
            const contractTotal = (Number(c.cost_per_day) || 0) * (Number(c.days_hired) || 0)
            const isEditingC = editingContractId === c.id
            return (
              <div key={`contract-${c.id}`} className="contract-card">
                {/* Contract header row */}
                <div className={`contract-header${c.status === 'cancelled' ? ' cancelled' : ''}`}>
                  <button className="contract-expand-btn" onClick={() => toggleExpand(c.id)} title={isExpandedC ? 'Collapse' : 'Expand'}>
                    {isExpandedC ? '▾' : '▸'}
                  </button>
                  <div className="contract-header-info">
                    <span className="contract-name">{c.name}</span>
                    {c.capacity && <span className="tr-meta">{c.capacity} seats</span>}
                    <span className="itin-type-badge transport">Transport</span>
                    <span className={`itin-type-badge ${(c.pricing_mode || 'private') === 'group' ? 'group-mode' : 'private-mode'}`}>{(c.pricing_mode || 'private') === 'group' ? 'Group' : 'Private'}</span>
                  </div>
                  <div className="contract-header-meta">
                    <span className="contract-days">{c.days_hired} {c.days_hired === 1 ? 'day' : 'days'}</span>
                    <span className="contract-rate">{fmtCost(c.cost_per_day)}/day</span>
                    <span className="contract-total">{fmtCost(contractTotal)} total</span>
                  </div>
                  {c.driver_name && (
                    <div className="tr-driver" style={{ flex: '0 0 auto' }}>
                      <span className="tr-driver-name">👤 {c.driver_name}</span>
                      {c.driver_phone && <span className="tr-driver-phone">{c.driver_phone}</span>}
                    </div>
                  )}
                  <div className="tr-status">
                    <span className={`itin-status-badge status-${c.status || 'requested'}`}>{STATUS_LABELS[c.status || 'requested']}</span>
                  </div>
                  <div className="tr-actions">
                    <button className="tr-menu-btn" onClick={(e) => { e.stopPropagation(); setOpenContractMenu(openContractMenu === c.id ? null : c.id); setOpenFlatMenu(null) }}>⋮</button>
                    {openContractMenu === c.id && (
                      <div className="tr-menu" onClick={(e) => e.stopPropagation()}>
                        {c.status !== 'confirmed' && <button className="tr-menu-item" onClick={() => markContractStatus(c.id, 'confirmed')}>✅ Mark Confirmed</button>}
                        {c.status !== 'done'      && <button className="tr-menu-item" onClick={() => markContractStatus(c.id, 'done')}>✔ Mark Done</button>}
                        <button className="tr-menu-item" onClick={() => startEditContract(c)}>✏️ Edit</button>
                        {c.status !== 'cancelled' && <button className="tr-menu-item danger" onClick={() => markContractStatus(c.id, 'cancelled')}>✕ Cancel</button>}
                        {c.status === 'cancelled' && <button className="tr-menu-item" onClick={() => markContractStatus(c.id, 'requested')}>↺ Restore</button>}
                        <button className="tr-menu-item danger" onClick={() => deleteContract(c.id, c.name)}>🗑️ Delete</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contract inline edit */}
                {isEditingC && (
                  <div className="tr-inline-edit">
                    <div className="tr-edit-grid">
                      <div style={{ gridColumn: '1 / -1' }}><label className="tr-edit-label">Transport</label>
                        <select className="tr-edit-input" value={editContractForm.ref_id || ''} onChange={(e) => handleEditContractRefChange(e.target.value)}>
                          <option value="" disabled>— Select transport —</option>
                          {refTransports.map((r) => (
                            <option key={r.id} value={r.id}>{r.name}{r.capacity ? ` (${r.capacity} seats)` : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div><label className="tr-edit-label">Pricing</label>
                        <div className="pricing-mode-toggle">
                          <button type="button" className={`toggle-btn${editContractForm.pricing_mode === 'private' ? ' active' : ''}`}
                            onClick={() => setEditContractForm((f) => ({ ...f, pricing_mode: 'private' }))}>Private</button>
                          <button type="button" className={`toggle-btn${editContractForm.pricing_mode === 'group' ? ' active' : ''}`}
                            onClick={() => setEditContractForm((f) => ({ ...f, pricing_mode: 'group' }))}>Group</button>
                        </div>
                      </div>
                      <div><label className="tr-edit-label">Days Hired</label><input type="number" className="tr-edit-input" min="1" value={editContractForm.days_hired} onChange={(e) => setEditContractForm((f) => ({ ...f, days_hired: e.target.value }))} /></div>
                      <div><label className="tr-edit-label">Cost / Day (€)</label><input type="number" className="tr-edit-input" min="0" value={editContractForm.cost_per_day} onChange={(e) => setEditContractForm((f) => ({ ...f, cost_per_day: e.target.value }))} /></div>
                      <div><label className="tr-edit-label">Driver Name</label><input className="tr-edit-input" value={editContractForm.driver_name} onChange={(e) => setEditContractForm((f) => ({ ...f, driver_name: e.target.value }))} /></div>
                      <div><label className="tr-edit-label">Driver Phone</label><input className="tr-edit-input" value={editContractForm.driver_phone} onChange={(e) => setEditContractForm((f) => ({ ...f, driver_phone: e.target.value }))} /></div>
                      <div><label className="tr-edit-label">Status</label>
                        <select className="tr-edit-input" value={editContractForm.status} onChange={(e) => setEditContractForm((f) => ({ ...f, status: e.target.value }))}>
                          {STATUSES.filter((s) => s.value !== 'all').map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}><label className="tr-edit-label">Notes</label><textarea className="tr-edit-input" rows={2} value={editContractForm.notes} onChange={(e) => setEditContractForm((f) => ({ ...f, notes: e.target.value }))} /></div>
                    </div>
                    <div className="tr-edit-actions">
                      <button className="btn btn-success" onClick={() => saveEditContract(c.id)}>Save</button>
                      <button className="btn btn-outline" onClick={() => setEditingContractId(null)}>Cancel</button>
                    </div>
                  </div>
                )}

                {c.notes && !isEditingC && <div className="tr-notes-row">📝 {c.notes}</div>}

                {/* Expanded movements */}
                {isExpandedC && (
                  <div className="contract-movements">
                    {(c.movements || []).length === 0 && addingMovementFor !== c.id && (
                      <div className="contract-movements-empty">No movements yet — add stops below.</div>
                    )}
                    {(c.movements || []).map((mov) => {
                      const movKey = `${c.id}-${mov.id}`
                      const isEditingMov = editingMovementKey === movKey
                      const movRow = itinerary[mov.dayIdx]
                      return (
                        <div key={mov.id} className="contract-movement-row">
                          {isEditingMov ? (
                            <div className="tr-inline-edit" style={{ margin: '0.25rem 0' }}>
                              <div className="tr-edit-grid">
                                <div><label className="tr-edit-label">Day</label>
                                  <select className="tr-edit-input" value={editMovementForm.dayIdx} onChange={(e) => setEditMovementForm((f) => ({ ...f, dayIdx: e.target.value }))}>
                                    <option value="">— Select day —</option>
                                    {itinerary.map((row, i) => <option key={i} value={i}>Day {row.day} · {fmtDate(row.date)}</option>)}
                                  </select>
                                </div>
                                <div><label className="tr-edit-label">Time</label><input type="time" className="tr-edit-input" value={editMovementForm.time} onChange={(e) => setEditMovementForm((f) => ({ ...f, time: e.target.value }))} /></div>
                                <div><label className="tr-edit-label">From</label><input className="tr-edit-input" value={editMovementForm.from_location} onChange={(e) => setEditMovementForm((f) => ({ ...f, from_location: e.target.value }))} /></div>
                                <div><label className="tr-edit-label">To</label><input className="tr-edit-input" value={editMovementForm.to_location} onChange={(e) => setEditMovementForm((f) => ({ ...f, to_location: e.target.value }))} /></div>
                              </div>
                              <div className="tr-edit-actions">
                                <button className="btn btn-success" onClick={() => saveEditMovement(c.id, mov.id)}>Save</button>
                                <button className="btn btn-outline" onClick={() => setEditingMovementKey(null)}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="mov-datetime">
                                <span className="tr-date">Day {(movRow?.day ?? (mov.dayIdx + 1))} · {fmtDate(mov.date)}</span>
                                <span className="tr-time">{mov.time}</span>
                              </div>
                              <div className="mov-route">
                                {mov.from_location || '?'} → {mov.to_location || '?'}
                              </div>
                              <div className="mov-actions">
                                <button className="mov-btn" title="Edit" onClick={() => startEditMovement(c.id, mov)}>✏️</button>
                                <button className="mov-btn danger" title="Delete" onClick={() => deleteMovement(c.id, mov.id)}>🗑️</button>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}

                    {/* Add movement form */}
                    {addingMovementFor === c.id ? (
                      <div className="add-movement-form">
                        <div className="tr-edit-grid">
                          <div><label className="tr-edit-label">Day</label>
                            <select className="tr-edit-input" value={movementForm.dayIdx} onChange={(e) => setMovementForm((f) => ({ ...f, dayIdx: e.target.value }))}>
                              <option value="">— Select day —</option>
                              {itinerary.map((row, i) => <option key={i} value={i}>Day {row.day} · {fmtDate(row.date)}{row.city ? ` · ${row.city}` : ''}</option>)}
                            </select>
                          </div>
                          <div><label className="tr-edit-label">Time</label><input type="time" className="tr-edit-input" value={movementForm.time} onChange={(e) => setMovementForm((f) => ({ ...f, time: e.target.value }))} /></div>
                          <div><label className="tr-edit-label">From (Pickup)</label><input className="tr-edit-input" placeholder="e.g. Hotel Kenzi" value={movementForm.fromLocation} onChange={(e) => setMovementForm((f) => ({ ...f, fromLocation: e.target.value }))} /></div>
                          <div><label className="tr-edit-label">To (Dropoff)</label><input className="tr-edit-input" placeholder="e.g. Ouarzazate" value={movementForm.toLocation} onChange={(e) => setMovementForm((f) => ({ ...f, toLocation: e.target.value }))} /></div>
                        </div>
                        <div className="tr-edit-actions">
                          <button className="btn btn-success" disabled={movementForm.dayIdx === ''} onClick={() => addMovement(c.id)}>Add Movement</button>
                          <button className="btn btn-outline" onClick={() => { setAddingMovementFor(null); setMovementForm(EMPTY_MOVEMENT_FORM) }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button className="add-movement-btn" onClick={() => { setAddingMovementFor(c.id); setMovementForm(EMPTY_MOVEMENT_FORM) }}>
                        + Add Movement
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
