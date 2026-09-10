import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { SurfaceToggle } from '../components/SurfaceToggle'
import { ResetDemoData } from '../components/ResetDemoData'

const navItems = [
  { to: '/portal/dashboard', label: 'Dashboard' },
  { to: '/portal/crm', label: 'CRM' },
  { to: '/portal/refills', label: 'Refills' },
  { to: '/portal/knowledge', label: 'Resources' },
  { to: '/portal/manage-products', label: 'Manage products', adminOnly: true },
  { to: '/portal/certification', label: 'Certification' },
  { to: '/portal/states', label: 'Licensed states' },
]

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      {open ? (
        <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.5" />
      ) : (
        <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" />
      )}
    </svg>
  )
}

export function PortalLayout() {
  const { currentRep, loading, logout } = useAuth()
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    const onResize = () => {
      if (window.matchMedia('(min-width: 768px)').matches) setNavOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!navOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [navOpen])

  if (loading) return null
  if (!currentRep) return <Navigate to="/portal/login" replace />

  return (
    <div
      data-surface="portal"
      className="min-h-screen w-full max-w-full overflow-x-clip bg-[var(--surface-bg)] pb-24 text-[var(--surface-ink)]"
    >
      <div className="bg-[var(--surface-gold)] px-4 py-1.5 text-center font-mono text-xs text-pretty text-[#14171a]">
        PROTOTYPE BUILD — mock data only. Not connected to any real AGErite system, sheet, or patient
        record.
      </div>
      <div className="relative z-50 mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 text-sm text-[var(--surface-ink-soft)] md:px-6">
        <button
          type="button"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-[var(--surface-line)] text-[var(--surface-ink)] md:hidden"
          aria-expanded={navOpen}
          aria-controls="portal-nav"
          aria-label={navOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setNavOpen((open) => !open)}
        >
          <MenuIcon open={navOpen} />
        </button>
        <span className="min-w-0 flex-1 leading-snug">
          Signed in as{' '}
          <strong className="font-mono text-[var(--surface-ink)]">
            {currentRep.name} · {currentRep.territory}
          </strong>
        </span>
        <button
          type="button"
          onClick={() => logout()}
          className="inline-flex h-11 shrink-0 items-center rounded-full border border-[var(--surface-line)] px-3 text-xs"
        >
          Sign out
        </button>
      </div>
      <div className="relative mx-auto flex w-full max-w-6xl md:gap-8 md:px-6">
        {navOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/55 md:hidden"
            aria-label="Close menu"
            onClick={() => setNavOpen(false)}
          />
        )}
        <nav
          id="portal-nav"
          className={`fixed inset-y-0 left-0 z-50 flex w-[min(16.5rem,85vw)] flex-col overflow-y-auto border-r border-[var(--surface-line)] bg-[var(--surface-bg)] px-4 py-6 transition-transform duration-200 ease-out md:static md:visible md:z-auto md:w-[220px] md:shrink-0 md:translate-x-0 md:bg-transparent md:px-0 md:py-0 md:pr-4 ${
            navOpen ? 'translate-x-0' : 'invisible -translate-x-full md:visible'
          }`}
        >
          <div className="mb-4 flex items-center justify-between md:hidden">
            <span className="font-display text-lg font-semibold text-[var(--surface-ink)]">
              Field portal
            </span>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-[var(--surface-line)] text-[var(--surface-ink)]"
              aria-label="Close menu"
              onClick={() => setNavOpen(false)}
            >
              <MenuIcon open />
            </button>
          </div>
          {navItems
            .filter((item) => !item.adminOnly || currentRep.role === 'admin')
            .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setNavOpen(false)}
              className={({ isActive }) =>
                `block border-l-2 py-2.5 pl-4 text-sm ${
                  isActive
                    ? 'border-[var(--surface-teal)] text-[var(--surface-ink)]'
                    : 'border-transparent text-[var(--surface-ink-soft)]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-0">
          <Outlet />
        </main>
      </div>
      <SurfaceToggle active="portal" />
      <ResetDemoData />
    </div>
  )
}
