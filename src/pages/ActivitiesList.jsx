import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { getNextRefId, loadReferenceData, saveReferenceData, loadCities } from '../lib/referenceData'
import ReferenceItemModal from '../components/ReferenceItemModal'
import Toast from '../components/Toast'

const slugify = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const fmtPrice = (v) =>
  v != null ? `€${Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : null

function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

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
  const [bookingCounts, setBookingCounts] = useState({})

  useEffect(() => {
    loadReferenceData().then((data) => { setAllItems(data); setLoadingItems(false) })
    loadCities().then((data) => setCities(data))
  }, [])

  // Fetch booking counts per activity name from itinerary_rows
  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase.from('itinerary_rows').select('rows').then(({ data }) => {
      if (!data) return
      const counts = {}
      data.forEach((record) => {
        const days = record.rows?.rows || []
        days.forEach((day) => {
          ;(day.activities || []).forEach((a) => {
            if (a.name) counts[a.name] = (counts[a.name] || 0) + 1
          })
        })
      })
      setBookingCounts(counts)
    })
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

  return (
    <>
      <div className="page-header">
        <h2>Activities</h2>
        <button className="btn btn-success" onClick={() => setModalItem({})}>+ Add Activity</button>
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

        {/* Cards */}
        <div className="hl-list">
          {loadingItems ? (
            [1,2,3,4,5].map((n) => (
              <div key={n} className="hl-card hl-card-skel">
                <div className="hl-card-main">
                  <div className="skel" style={{ height: 18, width: 200, borderRadius: 4, marginBottom: 6 }} />
                  <div className="skel" style={{ height: 13, width: 100, borderRadius: 4 }} />
                </div>
                <div className="hl-card-city"><div className="skel" style={{ height: 14, width: 80, borderRadius: 4 }} /></div>
                <div className="hl-card-prices"><div className="skel" style={{ height: 14, width: 80, borderRadius: 4 }} /></div>
                <div className="hl-card-contact"><div className="skel" style={{ height: 14, width: 90, borderRadius: 4 }} /></div>
                <div className="hl-card-count"><div className="skel" style={{ height: 20, width: 70, borderRadius: 999 }} /></div>
                <div className="hl-card-arrow" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="hl-empty">No activities match your filters.</div>
          ) : (
            filtered.map((item) => {
              const count = bookingCounts[item.name] || 0
              return (
              <div
                key={item.id}
                className="hl-card"
                onClick={() => navigate(`/activities/${slugify(item.name)}`)}
              >
                <div className="hl-card-main">
                  <div className="hl-card-name">{item.name}</div>
                  <div className="hl-card-badges">
                    {item.subcategory && <span className="bc-meta-chip">{item.subcategory}</span>}
                  </div>
                </div>

                <div className="hl-card-city">
                  {item.city
                    ? <><PinIcon />{item.city}</>
                    : <span className="hl-card-empty">—</span>}
                </div>

                <div className="hl-card-prices">
                  <span>{fmtPrice(item.price) || '—'}</span>
                  {item.price_unit && (
                    <div className="hl-card-price-unit">{item.price_unit}</div>
                  )}
                </div>

                <div className="hl-card-contact">
                  {item.contact_person
                    ? <><PersonIcon />{item.contact_person}</>
                    : <span className="hl-card-empty">No contact</span>}
                </div>

                <div className="hl-card-count">
                  {count > 0
                    ? <span className="hl-booking-badge hl-booking-badge--active">{count} booking{count !== 1 ? 's' : ''}</span>
                    : <span className="hl-booking-badge">unused</span>}
                </div>

                <div className="hl-card-actions">
                  <button
                    className="btn-icon btn-icon-danger"
                    title="Delete"
                    onClick={(e) => { e.stopPropagation(); handleDelete(item) }}
                  >&times;</button>
                  <span className="hl-card-arrow">›</span>
                </div>
              </div>
              )
            })
          )}
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
