import { NavLink, Outlet } from 'react-router-dom'

const crmNavItems = [
  { to: '/portal/crm/leads', label: 'Leads' },
  { to: '/portal/crm/pipeline', label: 'Pipeline' },
  { to: '/portal/crm/find-prospects', label: 'Find prospects' },
  { to: '/portal/crm/analytics', label: 'Analytics' },
]

export function CrmLayout() {
  return (
    <div>
      <nav className="flex gap-1 border-b border-[var(--surface-line)]">
        {crmNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `border-b-2 px-3 py-2.5 text-sm ${
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
      <div className="pt-6">
        <Outlet />
      </div>
    </div>
  )
}
