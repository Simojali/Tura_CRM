import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MOCK_REFERENCE_DATA, getNextRefId, CITIES, TIERS } from '../lib/referenceData'
import ReferenceItemModal from '../components/ReferenceItemModal'
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

export default function ReferenceData() {
  const [searchParams] = useSearchParams()
  const [items, setItems] = useState(MOCK_REFERENCE_DATA)
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'all')
  const [search, setSearch] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [modalItem, setModalItem] = useState(null) // null = closed, {} = new, {id,...} = edit
  const [toast, setToast] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

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

  const handleSave = (data) => {
    if (modalItem && modalItem.id) {
      // Edit
      setItems((prev) =>
        prev.map((i) => (i.id === modalItem.id ? { ...i, ...data } : i))
      )
      setToast({ message: 'Item updated', type: 'success' })
    } else {
      // Add
      const newItem = { id: getNextRefId(), ...data }
      setItems((prev) => [...prev, newItem])
      setToast({ message: 'Item added', type: 'success' })
    }
    setModalItem(null)
  }

  const handleDelete = (item) => {
    setDeleteConfirm(item)
  }

  const confirmDelete = () => {
    setItems((prev) => prev.filter((i) => i.id !== deleteConfirm.id))
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
    return `${p}${unit}`
  }

  return (
    <>
      <div className="page-header">
        <h2>Reference Data</h2>
        <button className="btn btn-success" onClick={() => setModalItem({})}>
          + Add Item
        </button>
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
        <div className="table-wrapper">
          <table className="ref-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Subcategory</th>
                <th>City</th>
                <th>Tier</th>
                <th>Price (EUR) — S · D · T for hotels</th>
                <th>Pax</th>
                <th>Notes</th>
                <th style={{ width: '70px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-light)' }}>
                    No items match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} onClick={() => setModalItem(item)}>
                    <td><strong>{item.name}</strong></td>
                    <td>
                      <span className={`ref-cat-badge ref-cat-${item.category}`}>
                        {CATEGORY_LABELS[item.category]}
                      </span>
                    </td>
                    <td>{item.subcategory || '—'}</td>
                    <td>{item.city || '—'}</td>
                    <td>{item.tier || '—'}</td>
                    <td className="ref-price">{formatPrice(item)}</td>
                    <td>{item.pax_label || '—'}</td>
                    <td className="ref-notes">{item.notes || '—'}</td>
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

        <div className="ref-footer">
          Showing {filtered.length} of {items.length} items
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalItem !== null && (
        <ReferenceItemModal
          item={modalItem.id ? modalItem : null}
          onClose={() => setModalItem(null)}
          onSave={handleSave}
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
