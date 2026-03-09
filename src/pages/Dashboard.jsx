import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { generateReferenciaRuta } from '../lib/constants'
import { MOCK_BOOKINGS } from '../lib/mockData'
import NewBookingModal from '../components/NewBookingModal'
import Toast from '../components/Toast'

const isSupabaseConfigured = !import.meta.env.VITE_SUPABASE_URL?.includes('your-project')

export default function Dashboard() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState(null)
  const navigate = useNavigate()

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    if (!isSupabaseConfigured) {
      setBookings(MOCK_BOOKINGS)
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching bookings:', error)
      setToast({ message: 'Error loading bookings', type: 'error' })
    } else {
      setBookings(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const handleCreateBooking = async (formData) => {
    // Get sequential number for referencia_ruta
    const { count } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })

    const seqNum = (count || 0) + 1
    const referencia_ruta = generateReferenciaRuta(formData.proveedor, seqNum)

    const payload = {
      ...formData,
      referencia_ruta,
      number_of_guests: Number(formData.number_of_guests) || 0,
      n_dias: formData.n_dias === '' ? null : Number(formData.n_dias),
      single_rooms: Number(formData.single_rooms) || 0,
      double_rooms: Number(formData.double_rooms) || 0,
      triple_rooms: Number(formData.triple_rooms) || 0,
      unite_price_eur: formData.unite_price_eur === '' ? null : Number(formData.unite_price_eur),
      group_price_eur: formData.group_price_eur === '' ? null : Number(formData.group_price_eur),
      group_price_mad: formData.group_price_mad === '' ? null : Number(formData.group_price_mad),
      paid: formData.paid === '' ? 0 : Number(formData.paid),
      check_in: formData.check_in || null,
      check_out: formData.check_out || null,
    }

    const { error } = await supabase.from('bookings').insert([payload])

    if (error) {
      console.error('Error creating booking:', error)
      setToast({ message: 'Error creating booking: ' + error.message, type: 'error' })
      throw error
    }

    setShowModal(false)
    setToast({ message: 'Booking created successfully', type: 'success' })
    fetchBookings()
  }

  const getStatusClass = (status) => {
    switch (status) {
      case 'Confirmed': return 'status-confirmed'
      case 'Pending': return 'status-pending'
      case 'Passed': return 'status-passed'
      default: return ''
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <>
      <div className="page-header">
        <h2>Bookings</h2>
        <button className="btn btn-success" onClick={() => setShowModal(true)}>
          + New Booking
        </button>
      </div>

      <div className="container">
        {loading ? (
          <div className="loading">Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="loading">No bookings yet. Click "+ New Booking" to get started.</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Route Ref.</th>
                  <th>Client</th>
                  <th>Provider</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Guests</th>
                  <th>Hotels</th>
                  <th>Group Price (EUR)</th>
                  <th>Paid</th>
                  <th>Remaining</th>
                  <th>Status</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} onClick={() => navigate(`/bookings/${b.id}`)}>
                    <td><strong>{b.referencia_ruta}</strong></td>
                    <td>{b.client_name}</td>
                    <td>{b.proveedor || '—'}</td>
                    <td>{formatDate(b.check_in)}</td>
                    <td>{formatDate(b.check_out)}</td>
                    <td>{b.number_of_guests}</td>
                    <td>{b.type_of_hotels || '—'}</td>
                    <td>{b.group_price_eur != null ? `${Number(b.group_price_eur).toFixed(2)}` : '—'}</td>
                    <td>{b.paid != null ? `${Number(b.paid).toFixed(2)}` : '—'}</td>
                    <td>
                      {b.group_price_eur != null
                        ? `${(Number(b.group_price_eur) - Number(b.paid || 0)).toFixed(2)}`
                        : '—'}
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusClass(b.reserv_status)}`}>
                        {b.reserv_status}
                      </span>
                    </td>
                    <td>{b.special_request ? b.special_request.slice(0, 40) + (b.special_request.length > 40 ? '...' : '') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <NewBookingModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreateBooking}
        />
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
