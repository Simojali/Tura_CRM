import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import BookingDetail from './pages/BookingDetail'
import ReferenceData from './pages/ReferenceData'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/bookings/:id" element={<BookingDetail />} />
        <Route path="/reference-data" element={<ReferenceData />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
