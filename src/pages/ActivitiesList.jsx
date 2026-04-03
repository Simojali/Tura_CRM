import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { getNextRefId, loadReferenceData, saveReferenceData, loadCities } from '../lib/referenceData'
import ReferenceItemModal from '../components/ReferenceItemModal'
import Toast from '../components/Toast'

const slugify = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export default function ActivitiesList() {
  const navigate = useNavigate()
  const [allItems, setAllItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [search, setSearch] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [subcategoryFilter, setSubcategoryFilter] = useState('')
  const [modalItem, setModalItem] = useState(null)
  const [toast, setToast] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [cities, setCities] = useState([])

  useEffect(() => {
    loadReferenceData().then((data) => { setAllItems(data); setLoadingItems(false) })
    loadCities().then((data) => setCities(data))
  }, [])

  const activities = useMemo(() => allItems.filter((i) => i.category === 'activity'), [allItems])

  const filtered = useMemo(() => {
    let result = activities
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
    if (cityFilter) result = result.filter((i) => i.city === cityFilter)
    if (subcategoryFilter) result = result.filter((i) => i.subcategory === subcategoryFilter)
    return result
  }, [activities, search, cityFilter, subcategoryFilter])

  const availableCities = useMemo(() => {
    return [...new Set(activities.map((i) => i.city).filter(Boolean))].sort()
  }, [activities])

  const availableSubcategories = useMemo(() => {
    return [...new Set(activities.map((i) => i.subcategory).filter(Boolean))].sort()
  }, [activities])

  const handleSave = async (data) => {
    if (modalItem && modalItem.id) {
      const next = allItems.map((i) => (i.id === modalItem.id ? { ...i, ...data } : i))
      await saveReferenceData(next)
      setAllItems(next)
      setToast({ message: 'Activity updated', type: 'success' })
    } else {
      const newItem = { id: getNextRefId(), ...data }
      const next = [...allItems, newItem]
      await saveReferenceData(next)
      setAllItems(next)
      setToast({ message: 'Activity added', type: 'success' })
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
    setToast({ message: 'Activity deleted', type: 'success' })
    setDeleteConfirm(null)
  }

  const columns = [
    { key: 'name',        label: 'Name',       render: (item) => <strong>{item.name}</strong> },
    { key: 'subcategory', label: 'Type' },
    { key: 'city',        label: 'City' },
    { key: 'price',       label: 'Price (€)',  render: (item) => item.price != null ? `€${Number(item.price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—', className: 'ref-price' },
    { key: 'price_unit',  label: 'Unit' },
    { key: 'notes',       label: 'Notes',      className: 'ref-notes' },
  ]

  return (
    <>
      <div className="page-header">
        <h2>Activities</h2>
        <button className="btn btn-success" onClick={() => setModalItem({})}>
          + Add Activity
        </button>
      </div>

      <div className="container">
        <div className="ref-filters">
          <input
            className="ref-search"
            type="text"
            placeholder="Search by name, city, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="ref-filter-select" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
            <option value="">All Cities</option>
            {availableCities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="ref-filter-select" value={subcategoryFilter} onChange={(e) => setSubcategoryFilter(e.target.value)}>
            <option value="">All Types</option>
            {availableSubcategories.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

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
                [1,2,3,4,5].map((n) => (
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
                    No activities match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} onClick={() => navigate(`/activities/${slugify(item.name)}`)}>
                    {columns.map((c) => (
                      <td key={c.key} className={c.className || ''}>
                        {c.render ? c.render(item) : (item[c.key] || '—')}
                      </td>
                    ))}
                    <td>
                      <button
                        className="btn-icon btn-icon-danger"
                        title="Delete"
                        onClick={(e) => { e.stopPropagation(); handleDelete(item) }}
                      >&times;</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="ref-footer">
          {loadingItems ? 'Loading…' : `Showing ${filtered.length} of ${activities.length} activities`}
        </div>
      </div>

      {modalItem !== null && (
        <ReferenceItemModal
          item={modalItem.id ? modalItem : { category: 'activity' }}
          cities={cities.map((c) => c.name)}
          onClose={() => setModalItem(null)}
          onSave={handleSave}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Activity</h2>
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

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </>
  )
}
