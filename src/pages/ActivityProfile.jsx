import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadReferenceData, saveReferenceData } from '../lib/referenceData'
import ReferenceItemModal from '../components/ReferenceItemModal'
import Toast from '../components/Toast'

const slugify = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const fmtPrice = (v) =>
  v != null
    ? `€${Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : null

export default function ActivityProfile() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [items, setItems] = useState([])
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    loadReferenceData().then((data) => {
      setItems(data)
      const found = data.find((i) => i.category === 'activity' && slugify(i.name) === id)
      if (found) {
        setItem(found)
      } else {
        setNotFound(true)
      }
      setLoading(false)
    })
  }, [id])

  const handleSave = async (data) => {
    const next = items.map((i) => (i.id === item.id ? { ...i, ...data } : i))
    await saveReferenceData(next)
    setItems(next)
    setItem({ ...item, ...data })
    setEditModal(false)
    setToast({ message: 'Activity updated', type: 'success' })
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-light)' }}>
        Loading...
      </div>
    )
  }

  if (notFound) {
    return (
      <>
        <div className="page-header">
          <div className="page-breadcrumb">
            <button className="crumb-link" onClick={() => navigate('/activities')}>Activities</button>
            <span className="crumb-sep">&rsaquo;</span>
            <span className="crumb-current">Not Found</span>
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/activities')}>&larr; Back</button>
        </div>
        <div className="container" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-light)' }}>
          Activity not found.
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page-header">
        <div className="page-breadcrumb">
          <button className="crumb-link" onClick={() => navigate('/activities')}>Activities</button>
          <span className="crumb-sep">&rsaquo;</span>
          <span className="crumb-current">{item.name}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={() => setEditModal(true)}>Edit</button>
          <button className="btn btn-outline" onClick={() => navigate('/activities')}>&larr; Back</button>
        </div>
      </div>

      <div className="container">
        {/* Name + badges */}
        <div className="booking-card">
          <div className="bc-header">
            <div className="bc-header-left">
              <div className="bc-name">{item.name}</div>
              <div className="bc-meta-line">
                {item.subcategory && <span className="ref-cat-badge ref-cat-activity">{item.subcategory}</span>}
                {item.city && <span className="bc-meta-chip">{item.city}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div className="hp-cards-grid">

          {/* Pricing & Details */}
          <div className="booking-card">
            <div className="hp-card-body">
              <div className="hp-card-title">Pricing &amp; Details</div>

              <div className="hp-prices-grid">
                <div className="hp-price-item">
                  <div className="hp-price-label">Price</div>
                  <div className="hp-price-value">{fmtPrice(item.price) || '—'}</div>
                </div>
                {item.group_price != null && (
                  <div className="hp-price-item">
                    <div className="hp-price-label">Group Price</div>
                    <div className="hp-price-value">{fmtPrice(item.group_price)}</div>
                  </div>
                )}
              </div>

              <div className="hp-field">
                <div className="hp-field-label">Price Unit</div>
                <div className="hp-field-value">{item.price_unit || <span className="hp-field-empty">Not set</span>}</div>
              </div>

              {item.notes && (
                <div className="hp-field">
                  <div className="hp-field-label">Notes</div>
                  <div className="hp-field-value">{item.notes}</div>
                </div>
              )}
            </div>
          </div>

          {/* Supplier / Contact */}
          <div className="booking-card">
            <div className="hp-card-body">
              <div className="hp-card-title">Supplier / Contact</div>
              <div className="hp-field">
                <div className="hp-field-label">Contact Person</div>
                <div className="hp-field-value">
                  {item.contact_person || <span className="hp-field-empty">Not set</span>}
                </div>
              </div>
              <div className="hp-field">
                <div className="hp-field-label">Email</div>
                <div className="hp-field-value">
                  {item.contact_email
                    ? <a href={`mailto:${item.contact_email}`}>{item.contact_email}</a>
                    : <span className="hp-field-empty">Not set</span>}
                </div>
              </div>
              <div className="hp-field">
                <div className="hp-field-label">Phone / WhatsApp</div>
                <div className="hp-field-value">
                  {item.contact_phone
                    ? <a href={`tel:${item.contact_phone}`}>{item.contact_phone}</a>
                    : <span className="hp-field-empty">Not set</span>}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {editModal && (
        <ReferenceItemModal
          item={item}
          cities={[]}
          onClose={() => setEditModal(false)}
          onSave={handleSave}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </>
  )
}
