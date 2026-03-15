import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MOCK_BOOKINGS } from '../lib/mockData'
import { loadItinerary, saveItinerary, initItinerary } from '../lib/itineraryUtils'
import BookingSummaryCard from '../components/BookingSummaryCard'
import BookingForm from '../components/BookingForm'
import TripOverview from '../components/TripOverview'
import TransfersTab from '../components/TransfersTab'
import HotelsTab from '../components/HotelsTab'
import ActivitiesTab from '../components/ActivitiesTab'
import Toast from '../components/Toast'

const isSupabaseConfigured = !import.meta.env.VITE_SUPABASE_URL?.includes('your-project')

const normalizeBooking = (data) => ({
  ...data,
  check_in: data.check_in || '',
  check_out: data.check_out || '',
  single_rooms: data.single_rooms || 0,
  double_rooms: data.double_rooms || 0,
  triple_rooms: data.triple_rooms || 0,
  paid: data.paid ?? '',
  unite_price_eur: data.unite_price_eur ?? '',
  group_price_eur: data.group_price_eur ?? '',
  group_price_mad: data.group_price_mad ?? '',
  n_dias: data.n_dias ?? '',
  number_of_guests: data.number_of_guests ?? '',
  proveedor: data.proveedor || '',
  client_type: data.client_type || '',
  referencia_agencia: data.referencia_agencia || '',
  telefono: data.telefono || '',
  flight_number: data.flight_number || '',
  flight_hour: data.flight_hour || '',
  flight_return: data.flight_return || '',
  type_of_hotels: data.type_of_hotels || '',
  reserv_status: data.reserv_status || 'Pending',
  special_request: data.special_request || '',
})

export default function BookingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [booking, setBooking] = useState(null)
  const [itinerary, setItinerary] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [showEditModal, setShowEditModal] = useState(searchParams.get('edit') === 'true')
  const [activeTab, setActiveTab] = useState('overview')

  // ── Tab counts (derived from itinerary) ─────────────────────────────
  const transferCount = itinerary.reduce((n, r) => n + (r.transfers?.length || 0), 0)
  const hotelCount    = itinerary.filter((r) => r.hotel_id).length
  const activityCount = itinerary.reduce((n, r) => n + (r.activities?.length || 0), 0)

  const TABS = [
    {
      key: 'overview', label: 'Overview',
      icon: (
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/>
        </svg>
      ),
    },
    {
      key: 'transfers', label: 'Transfers', count: transferCount,
      icon: (
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 17H3a2 2 0 01-2-2v-4l3-6h14l3 6v4a2 2 0 01-2 2h-2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/>
        </svg>
      ),
    },
    {
      key: 'hotels', label: 'Hotels', count: hotelCount,
      icon: (
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 21h18M9 21V9m6 12V9M3 9l9-6 9 6"/><rect x="9" y="13" width="6" height="4" rx="0.5"/>
        </svg>
      ),
    },
    {
      key: 'activities', label: 'Activities', count: activityCount,
      icon: (
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      ),
    },
  ]

  const fetchBooking = useCallback(async () => {
    setLoading(true)

    if (!isSupabaseConfigured) {
      const found = MOCK_BOOKINGS.find((b) => b.id === id)
      const b = found ? normalizeBooking(found) : null
      setBooking(b)
      if (b) {
        const saved = loadItinerary(id)
        setItinerary(saved || initItinerary(b))
      }
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching booking:', error)
      setToast({ message: 'Error loading booking', type: 'error' })
    } else {
      const b = normalizeBooking(data)
      setBooking(b)
      const saved = loadItinerary(id)
      setItinerary(saved || initItinerary(b))
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchBooking()
  }, [fetchBooking])

  // ── Shared itinerary save handler ──
  const handleItinerarySave = (rows) => {
    setItinerary(rows)
    saveItinerary(id, rows)
    setToast({ message: 'Itinerary saved', type: 'success' })
  }

  const handleSave = async (formData) => {
    if (!isSupabaseConfigured) {
      const b = normalizeBooking({ ...booking, ...formData })
      setBooking(b)
      const saved = loadItinerary(id)
      if (!saved) setItinerary(initItinerary(b))
      setShowEditModal(false)
      setToast({ message: 'Booking updated successfully', type: 'success' })
      return
    }

    const payload = {
      proveedor: formData.proveedor || null,
      client_type: formData.client_type || null,
      referencia_agencia: formData.referencia_agencia || null,
      client_name: formData.client_name,
      telefono: formData.telefono || null,
      check_in: formData.check_in || null,
      check_out: formData.check_out || null,
      number_of_guests: Number(formData.number_of_guests) || 0,
      n_dias: (() => {
        if (formData.check_in && formData.check_out) {
          const diff = (new Date(formData.check_out) - new Date(formData.check_in)) / (1000 * 60 * 60 * 24)
          return diff > 0 ? diff : null
        }
        return formData.n_dias === '' ? null : Number(formData.n_dias)
      })(),
      type_of_hotels: formData.type_of_hotels || null,
      single_rooms: Number(formData.single_rooms) || 0,
      double_rooms: Number(formData.double_rooms) || 0,
      triple_rooms: Number(formData.triple_rooms) || 0,
      flight_number: formData.flight_number || null,
      flight_hour: formData.flight_hour || null,
      flight_return: formData.flight_return || null,
      unite_price_eur: formData.unite_price_eur === '' ? null : Number(formData.unite_price_eur),
      group_price_eur: formData.group_price_eur === '' ? null : Number(formData.group_price_eur),
      group_price_mad: formData.group_price_mad === '' ? null : Number(formData.group_price_mad),
      paid: formData.paid === '' ? 0 : Number(formData.paid),
      reserv_status: formData.reserv_status,
      special_request: formData.special_request || null,
    }

    const { error } = await supabase
      .from('bookings')
      .update(payload)
      .eq('id', id)

    if (error) {
      console.error('Error updating booking:', error)
      setToast({ message: 'Error saving: ' + error.message, type: 'error' })
      throw error
    }

    setShowEditModal(false)
    setToast({ message: 'Booking updated successfully', type: 'success' })
    fetchBooking()
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) setShowEditModal(false)
  }

  return (
    <>
      <div className="page-header">
        <div className="page-breadcrumb">
          <button className="crumb-link" onClick={() => navigate('/')}>Bookings</button>
          <span className="crumb-sep">›</span>
          <span className="crumb-current">{booking?.client_name || '...'}</span>
        </div>
        <button className="btn btn-outline" onClick={() => navigate('/')}>
          &larr; Back
        </button>
      </div>

      <div className="container">
        {loading ? (
          <div className="loading">Loading booking...</div>
        ) : !booking ? (
          <div className="loading">Booking not found.</div>
        ) : (
          <>
            {/* ── Summary Card (always visible) ── */}
            <BookingSummaryCard
              booking={booking}
              onEdit={() => setShowEditModal(true)}
            />

            {/* ── Tab Bar ── */}
            <div className="bd-tabs">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  className={`bd-tab${activeTab === t.key ? ' active' : ''}`}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.icon}
                  {t.label}
                  {t.count > 0 && (
                    <span className="bd-tab-count">{t.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Tab Content ── */}
            {activeTab === 'overview' && (
              <TripOverview
                booking={booking}
                itinerary={itinerary}
                onSave={handleItinerarySave}
              />
            )}

            {activeTab === 'transfers' && (
              <TransfersTab
                booking={booking}
                itinerary={itinerary}
                onSave={handleItinerarySave}
              />
            )}

            {activeTab === 'hotels' && (
              <HotelsTab
                booking={booking}
                itinerary={itinerary}
                onSave={handleItinerarySave}
              />
            )}

            {activeTab === 'activities' && (
              <ActivitiesTab
                booking={booking}
                itinerary={itinerary}
                onSave={handleItinerarySave}
              />
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && booking && (
        <div className="modal-overlay" onClick={handleOverlayClick}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Booking</h2>
              <button
                className="modal-close"
                onClick={() => setShowEditModal(false)}
                type="button"
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <BookingForm
                initialData={booking}
                onSubmit={handleSave}
                isDetail
              />
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  )
}
