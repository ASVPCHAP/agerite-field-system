import { useNavigate } from 'react-router-dom'

/** Bottom-pinned public/portal switch, per the concept site's UX
 *  ("single-file HTML mock, two switchable surfaces via a bottom-pinned
 *  toggle" — SESSION_CONTEXT.md section 5). */
export function SurfaceToggle({ active }: { active: 'public' | 'portal' }) {
  const navigate = useNavigate()

  return (
    <div className="fixed right-6 bottom-6 z-30 flex overflow-hidden rounded-full border border-[var(--surface-line)] bg-[var(--surface-bg-2)] shadow-sm">
      <button
        type="button"
        onClick={() => navigate('/')}
        className={`px-4 py-2 text-sm transition-colors ${
          active === 'public'
            ? 'bg-[var(--surface-teal)] text-white'
            : 'text-[var(--surface-ink-soft)]'
        }`}
      >
        Provider Site
      </button>
      <button
        type="button"
        onClick={() => navigate('/portal')}
        className={`px-4 py-2 text-sm transition-colors ${
          active === 'portal'
            ? 'bg-[var(--surface-teal)] text-white'
            : 'text-[var(--surface-ink-soft)]'
        }`}
      >
        Field Portal
      </button>
    </div>
  )
}
