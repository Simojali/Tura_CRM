import { useState, useMemo } from 'react'
import { fmtDateLong, fmtRooms } from '../lib/formatters'

const TEMPLATE_TYPES = [
  { value: 'request',      labelEN: 'Booking Request',       labelFR: 'Demande de Reservation' },
  { value: 'follow-up',    labelEN: 'Follow-up',             labelFR: 'Relance' },
  { value: 'confirmation', labelEN: 'Confirmation Receipt',   labelFR: 'Accuse de Confirmation' },
  { value: 'cancellation', labelEN: 'Cancellation',           labelFR: 'Annulation' },
  { value: 'modification', labelEN: 'Modification Request',   labelFR: 'Demande de Modification' },
]

function generateMessage(type, lang, hotel, booking, refHotel) {
  const hotelName = hotel.name || 'the hotel'
  const checkin = fmtDateLong(hotel.checkin) || '—'
  const checkout = fmtDateLong(hotel.checkout) || '—'
  const nights = hotel.nights || 0
  const rooms = fmtRooms(booking) || '—'
  const guests = booking.number_of_guests || booking.pax || '—'
  const clientName = booking.client_name || '—'
  const bookingRef = booking.booking_reference || booking.id?.slice(0, 8) || '—'
  const confirmRef = hotel.confirmation_ref || '—'
  const contactPerson = refHotel?.contact_person || ''
  const specialRequest = booking.special_request || ''

  const greeting = contactPerson
    ? (lang === 'en' ? `Dear ${contactPerson},` : `Cher(e) ${contactPerson},`)
    : (lang === 'en' ? 'Dear Sir/Madam,' : 'Madame, Monsieur,')

  const sign = lang === 'en'
    ? 'Best regards,\nRuta Tours'
    : 'Cordialement,\nRuta Tours'

  if (type === 'request') {
    if (lang === 'en') {
      return `${greeting}

I would like to request a reservation at ${hotelName} with the following details:

- Client: ${clientName}
- Booking Reference: ${bookingRef}
- Check-in: ${checkin}
- Check-out: ${checkout}
- Duration: ${nights} night(s)
- Rooms: ${rooms}
- Number of guests: ${guests}${specialRequest ? `\n- Special request: ${specialRequest}` : ''}

Could you please confirm availability and rates?

${sign}`
    }
    return `${greeting}

Je souhaite effectuer une reservation au ${hotelName} avec les details suivants :

- Client : ${clientName}
- Reference de reservation : ${bookingRef}
- Arrivee : ${checkin}
- Depart : ${checkout}
- Duree : ${nights} nuit(s)
- Chambres : ${rooms}
- Nombre de personnes : ${guests}${specialRequest ? `\n- Demande speciale : ${specialRequest}` : ''}

Pourriez-vous confirmer la disponibilite et les tarifs ?

${sign}`
  }

  if (type === 'follow-up') {
    if (lang === 'en') {
      return `${greeting}

I am following up on my previous booking request for ${hotelName}.

- Client: ${clientName}
- Booking Reference: ${bookingRef}
- Check-in: ${checkin}
- Check-out: ${checkout}
- Rooms: ${rooms}

Could you please provide an update on availability and confirmation?

${sign}`
    }
    return `${greeting}

Je me permets de relancer ma demande de reservation au ${hotelName}.

- Client : ${clientName}
- Reference : ${bookingRef}
- Arrivee : ${checkin}
- Depart : ${checkout}
- Chambres : ${rooms}

Pourriez-vous me donner une mise a jour concernant la disponibilite et la confirmation ?

${sign}`
  }

  if (type === 'confirmation') {
    if (lang === 'en') {
      return `${greeting}

Thank you for confirming the reservation at ${hotelName}.

- Client: ${clientName}
- Booking Reference: ${bookingRef}
- Confirmation Reference: ${confirmRef}
- Check-in: ${checkin}
- Check-out: ${checkout}
- Duration: ${nights} night(s)
- Rooms: ${rooms}

We acknowledge the confirmation and look forward to the stay.

${sign}`
    }
    return `${greeting}

Merci d'avoir confirme la reservation au ${hotelName}.

- Client : ${clientName}
- Reference de reservation : ${bookingRef}
- Reference de confirmation : ${confirmRef}
- Arrivee : ${checkin}
- Depart : ${checkout}
- Duree : ${nights} nuit(s)
- Chambres : ${rooms}

Nous accusons reception de la confirmation.

${sign}`
  }

  if (type === 'cancellation') {
    if (lang === 'en') {
      return `${greeting}

We regret to inform you that we need to cancel the following reservation at ${hotelName}:

- Client: ${clientName}
- Booking Reference: ${bookingRef}
- Confirmation Reference: ${confirmRef}
- Check-in: ${checkin}
- Check-out: ${checkout}
- Rooms: ${rooms}

Please confirm the cancellation at your earliest convenience.

${sign}`
    }
    return `${greeting}

Nous avons le regret de vous informer que nous devons annuler la reservation suivante au ${hotelName} :

- Client : ${clientName}
- Reference de reservation : ${bookingRef}
- Reference de confirmation : ${confirmRef}
- Arrivee : ${checkin}
- Depart : ${checkout}
- Chambres : ${rooms}

Merci de confirmer l'annulation dans les meilleurs delais.

${sign}`
  }

  if (type === 'modification') {
    if (lang === 'en') {
      return `${greeting}

We would like to request a modification to the existing reservation at ${hotelName}:

- Client: ${clientName}
- Booking Reference: ${bookingRef}
- Confirmation Reference: ${confirmRef}
- Current Check-in: ${checkin}
- Current Check-out: ${checkout}
- Current Rooms: ${rooms}

Requested changes:
- [Please specify the changes needed]

Could you please confirm if this modification is possible?

${sign}`
    }
    return `${greeting}

Nous souhaitons modifier la reservation existante au ${hotelName} :

- Client : ${clientName}
- Reference de reservation : ${bookingRef}
- Reference de confirmation : ${confirmRef}
- Arrivee actuelle : ${checkin}
- Depart actuel : ${checkout}
- Chambres actuelles : ${rooms}

Modifications souhaitees :
- [Veuillez preciser les modifications]

Pourriez-vous confirmer si cette modification est possible ?

${sign}`
  }

  return ''
}

const TEMPLATE_TO_TIMELINE = {
  request: 'requested',
  'follow-up': 'follow-up',
  confirmation: 'confirmed',
  cancellation: 'cancelled',
  modification: 'modified',
}

export default function HotelMessageModal({ hotel, booking, refHotel, onClose, onLogActivity }) {
  const [lang, setLang] = useState('en')
  const [templateType, setTemplateType] = useState('request')
  const [edited, setEdited] = useState(false)
  const [manualText, setManualText] = useState('')
  const [copied, setCopied] = useState(false)
  const [method, setMethod] = useState('email')
  const [logged, setLogged] = useState(false)

  const generatedText = useMemo(
    () => generateMessage(templateType, lang, hotel, booking, refHotel),
    [templateType, lang, hotel, booking, refHotel]
  )

  const displayText = edited ? manualText : generatedText

  const handleTextChange = (val) => {
    setManualText(val)
    setEdited(true)
  }

  const handleTemplateChange = (val) => {
    setTemplateType(val)
    setEdited(false)
  }

  const handleLangChange = (val) => {
    setLang(val)
    setEdited(false)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const ta = document.createElement('textarea')
      ta.value = displayText
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const currentTemplate = TEMPLATE_TYPES.find((t) => t.value === templateType)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content msg-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Generate Message</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {/* Hotel info summary */}
          <div className="msg-hotel-info">
            <strong>{hotel.name}</strong>
            <span className="msg-hotel-dates">
              {fmtDateLong(hotel.checkin)} - {fmtDateLong(hotel.checkout)} ({hotel.nights}n)
            </span>
            {refHotel?.contact_person && (
              <span className="msg-contact-info">
                Contact: {refHotel.contact_person}
                {refHotel.contact_email && ` · ${refHotel.contact_email}`}
                {refHotel.contact_phone && ` · ${refHotel.contact_phone}`}
              </span>
            )}
          </div>

          {/* Controls row */}
          <div className="msg-controls">
            <div className="msg-lang-toggle">
              <button
                className={`msg-lang-btn${lang === 'en' ? ' active' : ''}`}
                onClick={() => handleLangChange('en')}
              >
                English
              </button>
              <button
                className={`msg-lang-btn${lang === 'fr' ? ' active' : ''}`}
                onClick={() => handleLangChange('fr')}
              >
                Francais
              </button>
            </div>

            <div className="msg-lang-toggle">
              <button
                className={`msg-lang-btn${method === 'email' ? ' active' : ''}`}
                onClick={() => setMethod('email')}
              >
                Email
              </button>
              <button
                className={`msg-lang-btn${method === 'whatsapp' ? ' active' : ''}`}
                onClick={() => setMethod('whatsapp')}
              >
                WhatsApp
              </button>
            </div>

            <select
              className="tr-edit-input msg-template-select"
              value={templateType}
              onChange={(e) => handleTemplateChange(e.target.value)}
            >
              {TEMPLATE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {lang === 'en' ? t.labelEN : t.labelFR}
                </option>
              ))}
            </select>
          </div>

          {/* Message textarea */}
          <textarea
            className="msg-textarea"
            value={displayText}
            onChange={(e) => handleTextChange(e.target.value)}
            rows={16}
          />

          {edited && (
            <div className="msg-edited-hint">
              Message has been manually edited.{' '}
              <button className="msg-reset-btn" onClick={() => setEdited(false)}>
                Reset to template
              </button>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
          <button className={`btn btn-primary${copied ? ' btn-copied' : ''}`} onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
          {onLogActivity && (
            <button
              className={`btn ${logged ? 'btn-copied' : 'btn-success'}`}
              disabled={logged}
              onClick={() => {
                const timelineType = TEMPLATE_TO_TIMELINE[templateType] || 'requested'
                const templateLabel = TEMPLATE_TYPES.find((t) => t.value === templateType)
                const note = `Sent ${(lang === 'en' ? templateLabel?.labelEN : templateLabel?.labelFR) || templateType} via ${method}`
                onLogActivity(hotel.id, timelineType, method, note)
                setLogged(true)
                setTimeout(() => setLogged(false), 3000)
              }}
            >
              {logged ? 'Logged!' : 'Log Status'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
