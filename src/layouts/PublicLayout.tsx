import { NavLink, Outlet } from 'react-router-dom'
import { SurfaceToggle } from '../components/SurfaceToggle'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm ${isActive ? 'text-[var(--surface-ink)]' : 'text-[var(--surface-ink-soft)]'}`

export function PublicLayout() {
  return (
    <div
      data-surface="public"
      className="min-h-screen w-full max-w-full overflow-x-clip bg-[var(--surface-bg)] pb-24 text-[var(--surface-ink)]"
    >
      <div className="bg-[var(--surface-gold)] px-4 py-1.5 text-center font-mono text-xs text-pretty text-[#20221f]">
        PROTOTYPE BUILD — mock data only. Not connected to any real AGErite system, sheet, or patient
        record.
      </div>
      <header className="sticky top-0 z-20 border-b border-[var(--surface-line)] bg-[var(--surface-bg)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6">
          <span className="font-display text-xl font-semibold">
            AGE<span className="text-[var(--surface-teal)] italic">rite</span>
          </span>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/products" className={navLinkClass}>
              Product reference
            </NavLink>
            <NavLink to="/ordering" className={navLinkClass}>
              Ordering
            </NavLink>
            <NavLink to="/contact" className={navLinkClass}>
              Contact
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-12 md:px-6">
        <Outlet />
      </main>
      <SurfaceToggle active="public" />
    </div>
  )
}
