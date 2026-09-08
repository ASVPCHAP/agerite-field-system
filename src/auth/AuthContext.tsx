import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Rep } from '../data/schema'
import * as store from '../data/store'

interface AuthContextValue {
  currentRep: Rep | null
  loading: boolean
  login: (repId: string) => Promise<void>
  logout: () => Promise<void>
  refreshCurrentRep: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentRep, setCurrentRep] = useState<Rep | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshCurrentRep = useCallback(async () => {
    const rep = await store.getCurrentRep()
    setCurrentRep(rep)
  }, [])

  useEffect(() => {
    refreshCurrentRep().finally(() => setLoading(false))
  }, [refreshCurrentRep])

  const login = useCallback(async (repId: string) => {
    const rep = await store.login(repId)
    setCurrentRep(rep)
  }, [])

  const logout = useCallback(async () => {
    await store.logout()
    setCurrentRep(null)
  }, [])

  return (
    <AuthContext.Provider value={{ currentRep, loading, login, logout, refreshCurrentRep }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
