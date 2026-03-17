import { createContext, useContext, useState } from 'react'

const AppContext = createContext({ bookingCount: 0, setBookingCount: () => {} })

export function AppProvider({ children }) {
  const [bookingCount, setBookingCount] = useState(0)
  return (
    <AppContext.Provider value={{ bookingCount, setBookingCount }}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => useContext(AppContext)
