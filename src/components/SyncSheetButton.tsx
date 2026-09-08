import { useState } from 'react'
import { syncProductsFromSheet, type SheetSyncResult } from '../data/store'

export function SyncSheetButton({
  onSynced,
  className = '',
}: {
  onSynced?: () => void
  className?: string
}) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<SheetSyncResult | null>(null)

  async function handleSync() {
    setRunning(true)
    setResult(null)
    try {
      const outcome = await syncProductsFromSheet()
      setResult(outcome)
      if (!outcome.error) onSynced?.()
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleSync}
        disabled={running}
        className="rounded-full border border-[var(--surface-line)] px-4 py-1.5 text-sm disabled:opacity-60"
      >
        {running ? 'Importing…' : 'Import new products from Sheet'}
      </button>
      {result && (
        <div className="mt-2 font-mono text-xs text-[var(--surface-ink-soft)]">
          {result.error ? (
            <p className="text-[var(--surface-vermilion)]">{result.error}</p>
          ) : (
            <p>
              {result.created.length} imported, {result.alreadyExists.length} already existed (edit
              those in Manage Products instead)
              {result.skipped.length > 0 && `, ${result.skipped.length} skipped`}
            </p>
          )}
          {result.created.length > 0 && (
            <ul className="mt-1 list-disc pl-4">
              {result.created.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          )}
          {result.skipped.map((s, i) => (
            <p key={i} className="text-[var(--surface-vermilion)]">
              {s}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
