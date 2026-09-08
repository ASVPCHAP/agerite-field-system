import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { SurfaceToggle } from '../components/SurfaceToggle'
import { ResetDemoData } from '../components/ResetDemoData'

const navItems = [
  { to: '/portal/dashboard', label: 'Dashboard' },
  { to: '/portal/pipeline', label: 'Pipeline' },
  { to: '/portal/refills', label: 'Refills' },
  { to: '/portal/knowledge', label: 'Knowledge base' },
  { to: '/portal/manage-products', label: 'Manage products' },
  { to: '/portal/territory', label: 'Territory & contacts' },
  { to: '/portal/certification', label: 'Certification' },
  { to: '/portal/states', label: 'Licensed states' },
]

export function PortalLayout() {
  const { currentRep, loading, logout } = useAuth()

  if (loading) return null
  if (!currentRep) return <Navigate to="/portal/login" replace />

  return (
    <div
      data-surface="portal"
      className="min-h-screen bg-[var(--surface-bg)] pb-24 text-[var(--surface-ink)]"
    >
      <div className="bg-[var(--surface-gold)] py-1.5 text-center font-mono text-xs text-[#14171a]">
        PROTOTYPE BUILD — mock data only. Not connected to any real AGErite system, sheet, or patient record.
      </div>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 text-sm text-[var(--surface-ink-soft)]">
        <span>
          Signed in as{' '}
          <strong className="font-mono text-[var(--surface-ink)]">
            {currentRep.name} · {currentRep.territory}
          </strong>
        </span>
        <button
          type="button"
          onClick={() => logout()}
          className="rounded-full border border-[var(--surface-line)] px-3 py-1 text-xs"
        >
          Sign out
        </button>
      </div>
      <div className="mx-auto grid max-w-6xl grid-cols-[220px_1fr] gap-8 px-6">
        <nav className="border-r border-[var(--surface-line)] pr-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block border-l-2 py-2 pl-4 text-sm ${
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
        <main className="py-6">
          <Outlet />
        </main>
      </div>
      <SurfaceToggle active="portal" />
      <ResetDemoData />
    </div>
  )
}
