import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MOCK_BOOKINGS } from '../lib/mockData'
import BookingSummaryCard from '../components/BookingSummaryCard'
import BookingForm from '../components/BookingForm'
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
  referencia_agencia: data.referencia_agencia || '',
  telefono: data.telefono || '',
  flight_number: data.flight_number || '',
  flight_hour: data.flight_hour || '',
  flight_return: data.flight_return || '',
  factura: data.factura || '',
  type_of_hotels: data.type_of_hotels || '',
  reserv_status: data.reserv_status || 'Pending',
  special_request: data.special_request || '',
})

export default function BookingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const fetchBooking = useCallback(async () => {
    setLoading(true)

    if (!isSupabaseConfigured) {
      const found = MOCK_BOOKINGS.find((b) => b.id === id)
      setBooking(found ? normalizeBooking(found) : null)
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
      setBooking(normalizeBooking(data))
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchBooking()
  }, [fetchBooking])

  const handleSave = async (formData) => {
    if (!isSupabaseConfigured) {
      setBooking(normalizeBooking({ ...booking, ...formData }))
      setShowEditModal(false)
      setToast({ message: 'Booking updated successfully', type: 'success' })
      return
    }

    const payload = {
      proveedor: formData.proveedor || null,
      referencia_agencia: formData.referencia_agencia || null,
      client_name: formData.client_name,
      telefono: formData.telefono || null,
      check_in: formData.check_in || null,
      check_out: formData.check_out || null,
      number_of_guests: Number(formData.number_of_guests) || 0,
      n_dias: formData.n_dias === '' ? null : Number(formData.n_dias),
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
      factura: formData.factura || null,
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
        <div className="detail-header"></div>

        {loading ? (
          <div className="loading">Loading booking...</div>
        ) : !booking ? (
          <div className="loading">Booking not found.</div>
        ) : (
          <BookingSummaryCard
            booking={booking}
            onEdit={() => setShowEditModal(true)}
          />
        )}

        {/* Itinerary section will go here */}
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
