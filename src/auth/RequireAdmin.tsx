import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

/** Gates an admin-only route. PortalLayout already redirects a signed-out
 *  visitor to /portal/login before this ever renders, so the only case
 *  here is "signed in, but not admin" — bounce to the dashboard rather
 *  than showing the PIC-only surface. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { currentRep } = useAuth()
  if (currentRep?.role !== 'admin') return <Navigate to="/portal/dashboard" replace />
  return <>{children}</>
}
