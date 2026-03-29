import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { getNextRefId, TIERS, loadReferenceData, saveReferenceData, loadCities } from '../lib/referenceData'
import ReferenceItemModal from '../components/ReferenceItemModal'
import Toast from '../components/Toast'

const slugify = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export default function HotelsList() {
  const navigate = useNavigate()
  const [allItems, setAllItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [search, setSearch] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [modalItem, setModalItem] = useState(null)
  const [toast, setToast] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [cities, setCities] = useState([])

  useEffect(() => {
    loadReferenceData().then((data) => { setAllItems(data); setLoadingItems(false) })
    loadCities().then((data) => setCities(data))
  }, [])

  const hotels = useMemo(() => allItems.filter((i) => i.category === 'hotel'), [allItems])

  const filtered = useMemo(() => {
    let result = hotels

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.city && i.city.toLowerCase().includes(q)) ||
          (i.notes && i.notes.toLowerCase().includes(q)) ||
          (i.subcategory && i.subcategory.toLowerCase().includes(q)) ||
          (i.contact_person && i.contact_person.toLowerCase().includes(q))
      )
    }

    if (cityFilter) result = result.filter((i) => i.city === cityFilter)
    if (tierFilter) result = result.filter((i) => i.tier === tierFilter)

    return result
  }, [hotels, search, cityFilter, tierFilter])

  const availableCities = useMemo(() => {
    const c = [...new Set(hotels.map((i) => i.city).filter(Boolean))]
    return c.sort()
  }, [hotels])

  const handleSave = async (data) => {
    if (modalItem && modalItem.id) {
      const next = allItems.map((i) => (i.id === modalItem.id ? { ...i, ...data } : i))
      await saveReferenceData(next)
      setAllItems(next)
      setToast({ message: 'Hotel updated', type: 'success' })
    } else {
      const newItem = { id: getNextRefId(), ...data }
      const next = [...allItems, newItem]
      await saveReferenceData(next)
      setAllItems(next)
      setToast({ message: 'Hotel added', type: 'success' })
    }
    setModalItem(null)
  }

  const handleDelete = (item) => setDeleteConfirm(item)

  const confirmDelete = async () => {
    const deletingId = deleteConfirm.id
    if (isSupabaseConfigured) {
      await supabase.from('reference_items').delete().eq('id', deletingId)
    }
    const next = allItems.filter((i) => i.id !== deletingId)
    if (!isSupabaseConfigured) await saveReferenceData(next)
    setAllItems(next)
    setToast({ message: 'Hotel deleted', type: 'success' })
    setDeleteConfirm(null)
  }

  const formatPrice = (item) => {
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

  const columns = [
    { key: 'name', label: 'Name', render: (item) => <strong>{item.name}</strong> },
    { key: 'subcategory', label: 'Type' },
    { key: 'city', label: 'City' },
    { key: 'tier', label: 'Tier' },
    { key: 'contact_person', label: 'Contact', render: (item) => item.contact_person || '—' },
    { key: 'price', label: 'Price (EUR) — S · D · T', render: formatPrice, className: 'ref-price' },
    { key: 'notes', label: 'Notes', className: 'ref-notes' },
  ]

  return (
    <>
      <div className="page-header">
        <h2>Hotels</h2>
        <button className="btn btn-success" onClick={() => setModalItem({})}>
          + Add Hotel
        </button>
      </div>

      <div className="container">

        {/* Filters */}
        <div className="ref-filters">
          <input
            className="ref-search"
            type="text"
            placeholder="Search by name, city, contact..."
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
        </div>

        {/* Table */}
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
                  <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-light)' }}>
                    No hotels match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} onClick={() => navigate(`/hotels/${slugify(item.name)}`)}>
                    {columns.map((c) => (
                      <td key={c.key} className={c.className || ''}>
                        {c.render ? c.render(item) : (item[c.key] || '—')}
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

        <div className="ref-footer">
          {loadingItems ? 'Loading…' : `Showing ${filtered.length} of ${hotels.length} hotels`}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalItem !== null && (
        <ReferenceItemModal
          item={modalItem.id ? modalItem : { category: 'hotel' }}
          cities={cities.map((c) => c.name)}
          onClose={() => setModalItem(null)}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Hotel</h2>
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
