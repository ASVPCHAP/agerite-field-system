import { useNavigate } from 'react-router-dom'

/** Bottom-pinned public/portal switch, per the concept site's UX
 *  ("single-file HTML mock, two switchable surfaces via a bottom-pinned
 *  toggle" — SESSION_CONTEXT.md section 5). */
export function SurfaceToggle({ active }: { active: 'public' | 'portal' }) {
  const navigate = useNavigate()

  return (
    <div className="fixed right-3 bottom-3 z-30 flex max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-full border border-[var(--surface-line)] bg-[var(--surface-bg-2)] shadow-sm md:right-6 md:bottom-6">
      <button
        type="button"
        onClick={() => navigate('/')}
        className={`px-3 py-2.5 text-xs transition-colors sm:px-4 sm:text-sm ${
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
        className={`px-3 py-2.5 text-xs transition-colors sm:px-4 sm:text-sm ${
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
