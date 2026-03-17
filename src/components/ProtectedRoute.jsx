import { Navigate, Outlet } from 'react-router-dom'
import { useAppContext } from '../lib/AppContext'
import { isSupabaseConfigured } from '../lib/supabase'

export default function ProtectedRoute() {
  const { session, authReady } = useAppContext()

  // Mock mode — always allow through
  if (!isSupabaseConfigured) return <Outlet />

  // Still waiting for getSession() to resolve
  if (!authReady) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner" />
      </div>
    )
  }

  // No active session — send to login
  if (!session) return <Navigate to="/login" replace />

  return <Outlet />
}
