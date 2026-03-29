import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './lib/AppContext'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import BookingDetail from './pages/BookingDetail'
import ReferenceData from './pages/ReferenceData'
import HotelsList from './pages/HotelsList'
import HotelProfile from './pages/HotelProfile'
import Login from './pages/Login'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route — no sidebar */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes — require session */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/bookings/:id" element={<BookingDetail />} />
              <Route path="/hotels" element={<HotelsList />} />
              <Route path="/hotels/:id" element={<HotelProfile />} />
              <Route path="/reference-data" element={<ReferenceData />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  </React.StrictMode>
)
