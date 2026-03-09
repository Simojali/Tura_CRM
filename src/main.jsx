import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import BookingDetail from './pages/BookingDetail'
import ReferenceData from './pages/ReferenceData'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/bookings/:id" element={<BookingDetail />} />
          <Route path="/reference-data" element={<ReferenceData />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  </React.StrictMode>
)
