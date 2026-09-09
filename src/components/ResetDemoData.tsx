import { resetDemoData } from '../data/store'

export function ResetDemoData() {
  return (
    <button
      type="button"
      onClick={async () => {
        if (confirm('Reset all demo data (ownership locks, cert progress) back to seed state?')) {
          await resetDemoData()
          location.reload()
        }
      }}
      className="fixed bottom-20 left-3 z-30 rounded-sm border border-[var(--surface-line)] bg-[var(--surface-bg-2)] px-2 py-1.5 font-mono text-[0.7rem] text-[var(--surface-ink-soft)] md:bottom-6 md:left-6"
    >
      reset demo data
    </button>
  )
}
