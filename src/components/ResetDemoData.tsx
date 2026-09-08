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
      className="fixed bottom-6 left-6 z-30 rounded-sm border border-[var(--surface-line)] bg-[var(--surface-bg-2)] px-2 py-1 font-mono text-[0.7rem] text-[var(--surface-ink-soft)]"
    >
      reset demo data
    </button>
  )
}
