import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Rep } from '../data/schema'
import type { MagicLinkResult } from '../data/storeTypes'
import * as store from '../data/store'

interface AuthContextValue {
  currentRep: Rep | null
  loading: boolean
  requestMagicLink: (email: string) => Promise<MagicLinkResult>
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
    // Catches the session appearing after the magic-link redirect, and
    // sign-out — both happen asynchronously, after the initial mount.
    return store.subscribeAuth(setCurrentRep)
  }, [refreshCurrentRep])

  const requestMagicLink = useCallback(async (email: string) => {
    const result = await store.requestMagicLink(email)
    if (result.ok && result.immediate) setCurrentRep(result.rep)
    return result
  }, [])

  const logout = useCallback(async () => {
    await store.logout()
    setCurrentRep(null)
  }, [])

  return (
    <AuthContext.Provider value={{ currentRep, loading, requestMagicLink, logout, refreshCurrentRep }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
