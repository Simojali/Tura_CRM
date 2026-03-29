import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadReferenceData, saveReferenceData, loadCities } from '../lib/referenceData'
import ReferenceItemModal from '../components/ReferenceItemModal'
import Toast from '../components/Toast'

const slugify = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const fmtPrice = (v) =>
  v != null
    ? `€${Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : null

export default function HotelProfile() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [items, setItems] = useState([])
  const [hotel, setHotel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [cities, setCities] = useState([])
  const [toast, setToast] = useState(null)

  useEffect(() => {
    Promise.all([loadReferenceData(), loadCities()]).then(([data, cityList]) => {
      setItems(data)
      setCities(cityList)
      const found = data.find((i) => i.category === 'hotel' && slugify(i.name) === id)
      if (found) {
        setHotel(found)
      } else {
        setNotFound(true)
      }
      setLoading(false)
    })
  }, [id])

  const handleSave = async (data) => {
    const next = items.map((i) => (i.id === hotel.id ? { ...i, ...data } : i))
    await saveReferenceData(next)
    setItems(next)
    setHotel({ ...hotel, ...data })
    setEditModal(false)
    setToast({ message: 'Hotel updated', type: 'success' })
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
            <button className="crumb-link" onClick={() => navigate('/hotels')}>Hotels</button>
            <span className="crumb-sep">&rsaquo;</span>
            <span className="crumb-current">Not Found</span>
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/hotels')}>&larr; Back</button>
        </div>
        <div className="container" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-light)' }}>
          Hotel not found.
        </div>
      </>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div className="page-breadcrumb">
          <button className="crumb-link" onClick={() => navigate('/hotels')}>Hotels</button>
          <span className="crumb-sep">&rsaquo;</span>
          <span className="crumb-current">{hotel.name}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={() => setEditModal(true)}>Edit</button>
          <button className="btn btn-outline" onClick={() => navigate('/hotels')}>&larr; Back</button>
        </div>
      </div>

      <div className="container">
        {/* Hotel name + badges */}
        <div className="booking-card">
          <div className="bc-header">
            <div className="bc-header-left">
              <div className="bc-name">{hotel.name}</div>
              <div className="bc-meta-line">
                {hotel.city && <span className="bc-meta-chip">{hotel.city}</span>}
                {hotel.tier && <span className="ht-tier-badge">{hotel.tier}</span>}
                {hotel.subcategory && <span className="ref-cat-badge ref-cat-hotel">{hotel.subcategory}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div className="hp-cards-grid">

          {/* Pricing card */}
          <div className="booking-card">
            <div className="hp-card-body">
              <div className="hp-card-title">Pricing</div>
              <div className="hp-prices-grid">
                <div className="hp-price-item">
                  <div className="hp-price-label">Single</div>
                  <div className="hp-price-value">{fmtPrice(hotel.price_single) || '—'}</div>
                </div>
                <div className="hp-price-item">
                  <div className="hp-price-label">Double</div>
                  <div className="hp-price-value">{fmtPrice(hotel.price_double) || '—'}</div>
                </div>
                <div className="hp-price-item">
                  <div className="hp-price-label">Triple</div>
                  <div className="hp-price-value">{fmtPrice(hotel.price_triple) || '—'}</div>
                </div>
              </div>
              <div className="hp-field">
                <div className="hp-field-label">Price Unit</div>
                <div className="hp-field-value">{hotel.price_unit || <span className="hp-field-empty">Not set</span>}</div>
              </div>
              {hotel.notes && (
                <div className="hp-field">
                  <div className="hp-field-label">Notes</div>
                  <div className="hp-field-value">{hotel.notes}</div>
                </div>
              )}
            </div>
          </div>

          {/* Supplier / Contact card */}
          <div className="booking-card">
            <div className="hp-card-body">
              <div className="hp-card-title">Supplier / Contact</div>
              <div className="hp-field">
                <div className="hp-field-label">Contact Person</div>
                <div className="hp-field-value">
                  {hotel.contact_person || <span className="hp-field-empty">Not set</span>}
                </div>
              </div>
              <div className="hp-field">
                <div className="hp-field-label">Email</div>
                <div className="hp-field-value">
                  {hotel.contact_email
                    ? <a href={`mailto:${hotel.contact_email}`}>{hotel.contact_email}</a>
                    : <span className="hp-field-empty">Not set</span>}
                </div>
              </div>
              <div className="hp-field">
                <div className="hp-field-label">Phone / WhatsApp</div>
                <div className="hp-field-value">
                  {hotel.contact_phone
                    ? <a href={`tel:${hotel.contact_phone}`}>{hotel.contact_phone}</a>
                    : <span className="hp-field-empty">Not set</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Terms card */}
          <div className="booking-card">
            <div className="hp-card-body">
              <div className="hp-card-title">Payment Terms</div>
              <div className="hp-field">
                <div className="hp-field-label">Default Deposit</div>
                <div className="hp-field-value">
                  {hotel.default_deposit_pct != null
                    ? `${hotel.default_deposit_pct}%`
                    : <span className="hp-field-empty">Not set</span>}
                </div>
              </div>
              <div className="hp-field">
                <div className="hp-field-label">Payment Terms</div>
                <div className="hp-field-value">
                  {hotel.payment_terms || <span className="hp-field-empty">Not set</span>}
                </div>
              </div>
              <div className="hp-field">
                <div className="hp-field-label">Cancellation Policy</div>
                <div className="hp-field-value">
                  {hotel.cancellation_policy || <span className="hp-field-empty">Not set</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editModal && (
        <ReferenceItemModal
          item={hotel}
          cities={cities.map((c) => c.name)}
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
