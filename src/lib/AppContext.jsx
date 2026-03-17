import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'

const AppContext = createContext({
  bookingCount: 0,
  setBookingCount: () => {},
  session: null,
  authReady: false,
})

export function AppProvider({ children }) {
  const [bookingCount, setBookingCount] = useState(0)
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Mock mode — skip auth entirely
      setSession({ mock: true })
      setAuthReady(true)
      return
    }

    // Restore existing session on mount
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? false)
      setAuthReady(true)
    })

    // Listen for login / logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? false)
      setAuthReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AppContext.Provider value={{ bookingCount, setBookingCount, session, authReady }}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => useContext(AppContext)
