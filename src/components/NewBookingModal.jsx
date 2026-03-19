import BookingForm from './BookingForm'

export default function NewBookingModal({ onClose, onCreated, providers }) {
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>New Booking</h2>
          <button className="modal-close" onClick={onClose} type="button">
            &times;
          </button>
        </div>
        <div className="modal-body">
          <BookingForm onSubmit={onCreated} providers={providers} />
        </div>
      </div>
    </div>
  )
}
