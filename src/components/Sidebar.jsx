import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppContext } from '../lib/AppContext'
import { loadReferenceData } from '../lib/referenceData'

const IconList = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
)

const IconHotel = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)

const IconTransfer = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9"/>
    <path d="M3 11V9a4 4 0 014-4h14"/>
    <polyline points="7 23 3 19 7 15"/>
    <path d="M21 13v2a4 4 0 01-4 4H3"/>
  </svg>
)

const IconActivity = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)

const IconTransport = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13"/>
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
)

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { bookingCount } = useAppContext()
  const [refCounts, setRefCounts] = useState({ hotel: 0, transfer: 0, activity: 0, transport: 0 })

  useEffect(() => {
    loadReferenceData().then((items) => {
      setRefCounts({
        hotel:     items.filter((i) => i.category === 'hotel').length,
        transfer:  items.filter((i) => i.category === 'transfer').length,
        activity:  items.filter((i) => i.category === 'activity').length,
        transport: items.filter((i) => i.category === 'transport').length,
      })
    })
  }, [])

  const search = new URLSearchParams(location.search)
  const currentTab = search.get('tab') || ''
  const path = location.pathname

  const isBookingsActive = path === '/' || path.startsWith('/bookings/')
  const isRefTab = (tab) => path === '/reference-data' && currentTab === tab

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-icon">🦅</span>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-name">Ruta Tours</span>
          <span className="sidebar-logo-sub">CRM Platform</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Bookings</div>

        <button
          className={`sidebar-item ${isBookingsActive ? 'active' : ''}`}
          onClick={() => navigate('/')}
        >
          <IconList />
          All Bookings
          <span className="sidebar-badge">{bookingCount}</span>
        </button>

        <div className="sidebar-section-label" style={{ marginTop: '0.5rem' }}>
          Reference Data
        </div>

        <button
          className={`sidebar-item ${isRefTab('hotel') ? 'active' : ''}`}
          onClick={() => navigate('/reference-data?tab=hotel')}
        >
          <IconHotel />
          Hotels
          <span className="sidebar-badge">{refCounts.hotel}</span>
        </button>

        <button
          className={`sidebar-item ${isRefTab('transfer') ? 'active' : ''}`}
          onClick={() => navigate('/reference-data?tab=transfer')}
        >
          <IconTransfer />
          Transfers
          <span className="sidebar-badge">{refCounts.transfer}</span>
        </button>

        <button
          className={`sidebar-item ${isRefTab('activity') ? 'active' : ''}`}
          onClick={() => navigate('/reference-data?tab=activity')}
        >
          <IconActivity />
          Activities
          <span className="sidebar-badge">{refCounts.activity}</span>
        </button>

        <button
          className={`sidebar-item ${isRefTab('transport') ? 'active' : ''}`}
          onClick={() => navigate('/reference-data?tab=transport')}
        >
          <IconTransport />
          Transport
          <span className="sidebar-badge">{refCounts.transport}</span>
        </button>
      </nav>
    </aside>
  )
}
