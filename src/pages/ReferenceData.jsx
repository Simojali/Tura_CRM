import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { getNextRefId, TIERS, loadReferenceData, saveReferenceData, loadCities } from '../lib/referenceData'
import ReferenceItemModal from '../components/ReferenceItemModal'
import ManageCitiesModal from '../components/ManageCitiesModal'
import ManageProvidersModal from '../components/ManageProvidersModal'
import Toast from '../components/Toast'

const CATEGORY_TABS = [
  { key: 'all', label: 'All' },
  { key: 'hotel', label: 'Hotels' },
  { key: 'transfer', label: 'Transfers' },
  { key: 'activity', label: 'Activities' },
  { key: 'transport', label: 'Transport' },
]

const CATEGORY_LABELS = {
  hotel: 'Hotel',
  transfer: 'Transfer',
  activity: 'Activity',
  transport: 'Transport',
}

/* ── Column config per tab ─────────────────────────────────── */
const col = {
  name:     (label = 'Name') => ({ key: 'name', label, render: (item) => <strong>{item.name}</strong> }),
  category: { key: 'category', label: 'Category', render: (item) => (
    <span className={`ref-cat-badge ref-cat-${item.category}`}>{CATEGORY_LABELS[item.category]}</span>
  )},
  subcategory: (label = 'Subcategory') => ({ key: 'subcategory', label }),
  city:     { key: 'city', label: 'City' },
  tier:     { key: 'tier', label: 'Tier' },
  price:    (label = 'Price (EUR)') => ({ key: 'price', label, render: 'formatPrice', className: 'ref-price' }),
  capacity: (label = 'Seats') => ({ key: 'capacity', label }),
  notes:    { key: 'notes', label: 'Notes', className: 'ref-notes' },
}

const COLUMN_CONFIG = {
  all:      [col.name(),           col.category, col.subcategory(), col.city, col.price(),                         col.notes],
  hotel:    [col.name(),           col.subcategory('Type'), col.city, col.tier, col.price('Price (EUR) — S · D · T'), col.notes],
  transfer: [col.name('Route'),    col.subcategory('Type'), col.city, col.capacity(), col.price(),         col.notes],
  transport:[col.name('Vehicle / Route'), col.subcategory('Type'), col.capacity('Seats'), col.price(),     col.notes],
  activity: [col.name(),           col.subcategory('Type'), col.city, col.price(),                                  col.notes],
}

export default function ReferenceData() {
  const [searchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'all')
  const [search, setSearch] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [modalItem, setModalItem] = useState(null) // null = closed, {} = new, {id,...} = edit
  const [toast, setToast] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [manageOpen, setManageOpen] = useState(false)
  const [showCitiesModal, setShowCitiesModal] = useState(false)
  const [showProvidersModal, setShowProvidersModal] = useState(false)
  const [cities, setCities] = useState([])

  // Load reference data + cities on mount
  useEffect(() => {
    loadReferenceData().then((data) => { setItems(data); setLoadingItems(false) })
    loadCities().then((data) => setCities(data))
  }, [])

  // Sync tab when sidebar link changes the URL
  useEffect(() => {
    const tab = searchParams.get('tab')
    setActiveTab(tab || 'all')
    setCityFilter('')
    setTierFilter('')
  }, [searchParams])

  // Filter items
  const filtered = useMemo(() => {
    let result = items

    if (activeTab !== 'all') {
      result = result.filter((i) => i.category === activeTab)
    }

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.city && i.city.toLowerCase().includes(q)) ||
          (i.notes && i.notes.toLowerCase().includes(q)) ||
          (i.subcategory && i.subcategory.toLowerCase().includes(q))
      )
    }

    if (cityFilter) {
      result = result.filter((i) => i.city === cityFilter)
    }

    if (tierFilter) {
      result = result.filter((i) => i.tier === tierFilter)
    }

    return result
  }, [items, activeTab, search, cityFilter, tierFilter])

  // Tab counts
  const counts = useMemo(() => {
    const c = { all: items.length }
    for (const cat of ['hotel', 'transfer', 'activity', 'transport']) {
      c[cat] = items.filter((i) => i.category === cat).length
    }
    return c
  }, [items])

  // Available cities for the current filter
  const availableCities = useMemo(() => {
    const subset = activeTab === 'all' ? items : items.filter((i) => i.category === activeTab)
    const cities = [...new Set(subset.map((i) => i.city).filter(Boolean))]
    return cities.sort()
  }, [items, activeTab])

  const showTierFilter = activeTab === 'all' || activeTab === 'hotel'

  const handleSave = async (data) => {
    if (modalItem && modalItem.id) {
      // Edit
      const next = items.map((i) => (i.id === modalItem.id ? { ...i, ...data } : i))
      await saveReferenceData(next)
      setItems(next)
      setToast({ message: 'Item updated', type: 'success' })
    } else {
      // Add
      const newItem = { id: getNextRefId(), ...data }
      const next = [...items, newItem]
      await saveReferenceData(next)
      setItems(next)
      setToast({ message: 'Item added', type: 'success' })
    }
    setModalItem(null)
  }

  const handleDelete = (item) => {
    setDeleteConfirm(item)
  }

  const confirmDelete = async () => {
    const deletingId = deleteConfirm.id
    if (isSupabaseConfigured) {
      await supabase.from('reference_items').delete().eq('id', deletingId)
    }
    const next = items.filter((i) => i.id !== deletingId)
    if (!isSupabaseConfigured) await saveReferenceData(next)
    setItems(next)
    setToast({ message: 'Item deleted', type: 'success' })
    setDeleteConfirm(null)
  }

  const formatPrice = (item) => {
    if (item.category === 'hotel') {
      const fmt = (v) => v != null ? Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—'
      return (
        <span className="ref-price-rooms">
          <span><span className="room-type-label">S</span> {fmt(item.price_single)}</span>
          <span className="room-price-sep">·</span>
          <span><span className="room-type-label">D</span> {fmt(item.price_double)}</span>
          <span className="room-price-sep">·</span>
          <span><span className="room-type-label">T</span> {fmt(item.price_triple)}</span>
        </span>
      )
    }
    const p = Number(item.price).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
    const unit = item.price_unit ? ` / ${item.price_unit}` : ''
    const base = `${p}${unit}`
    if (item.group_price != null) {
      const gp = Number(item.group_price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
      return <span>{base} <span className="ref-group-price">(Group: {gp}/pp)</span></span>
    }
    return base
  }

  return (
    <>
      <div className="page-header">
        <h2>Reference Data</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div className="manage-dropdown">
            <button className="btn btn-outline" onClick={() => setManageOpen(!manageOpen)}>
              Manage &#9662;
            </button>
            {manageOpen && (
              <div className="manage-dropdown-menu">
                <button onClick={() => { setManageOpen(false); setShowCitiesModal(true) }}>Manage Cities</button>
                <button onClick={() => { setManageOpen(false); setShowProvidersModal(true) }}>Manage Providers</button>
              </div>
            )}
          </div>
          <button className="btn btn-success" onClick={() => setModalItem({})}>
            + Add Item
          </button>
        </div>
      </div>

      <div className="container">

        {/* Category tabs */}
        <div className="ref-tabs">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`ref-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.key)
                setCityFilter('')
                setTierFilter('')
              }}
            >
              {tab.label}
              <span className="ref-tab-count">{counts[tab.key]}</span>
            </button>
          ))}
        </div>

        {/* Filters row */}
        <div className="ref-filters">
          <input
            className="ref-search"
            type="text"
            placeholder="Search by name, city, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="ref-filter-select"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
          >
            <option value="">All Cities</option>
            {availableCities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {showTierFilter && (
            <select
              className="ref-filter-select"
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
            >
              <option value="">All Tiers</option>
              {TIERS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* Table */}
        {(() => {
          const columns = COLUMN_CONFIG[activeTab] || COLUMN_CONFIG.all
          const colCount = columns.length + 1 // +1 for action column
          return (
            <div className="table-wrapper">
              <table className="ref-table">
                <thead>
                  <tr>
                    {columns.map((c) => <th key={c.key}>{c.label}</th>)}
                    <th style={{ width: '70px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {loadingItems ? (
                    [1,2,3,4,5,6,7,8].map((n) => (
                      <tr key={n} style={{ pointerEvents: 'none' }}>
                        {columns.map((c, i) => (
                          <td key={i}><div className="skel skel-td" style={{ width: 60 + Math.random() * 40 }} /></td>
                        ))}
                        <td></td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={colCount} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-light)' }}>
                        No items match your filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item) => (
                      <tr key={item.id} onClick={() => setModalItem(item)}>
                        {columns.map((c) => (
                          <td key={c.key} className={c.className || ''}>
                            {c.render
                              ? (c.render === 'formatPrice' ? formatPrice(item) : c.render(item))
                              : (item[c.key] || '—')}
                          </td>
                        ))}
                        <td>
                          <button
                            className="btn-icon btn-icon-danger"
                            title="Delete"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(item)
                            }}
                          >
                            &times;
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )
        })()}

        <div className="ref-footer">
          {loadingItems ? 'Loading…' : `Showing ${filtered.length} of ${items.length} items`}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalItem !== null && (
        <ReferenceItemModal
          item={modalItem.id ? modalItem : null}
          cities={cities.map((c) => c.name)}
          onClose={() => setModalItem(null)}
          onSave={handleSave}
        />
      )}

      {/* Manage Cities Modal */}
      {showCitiesModal && (
        <ManageCitiesModal
          onClose={() => setShowCitiesModal(false)}
          onUpdate={(list) => setCities(list)}
        />
      )}

      {/* Manage Providers Modal */}
      {showProvidersModal && (
        <ManageProvidersModal
          onClose={() => setShowProvidersModal(false)}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Item</h2>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </>
  )
}
