import { useState } from 'react'
import type { ActivityType } from '../data/schema'
import { Note } from './ui'

const TYPES: { value: ActivityType; label: string }[] = [
  { value: 'call', label: 'Call' },
  { value: 'text', label: 'Text' },
  { value: 'visit', label: 'In-person visit' },
  { value: 'email', label: 'Email' },
  { value: 'note', label: 'Note' },
]

const inputClass = 'rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-1.5 text-sm'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Small inline form for logging a call/text/visit/email/note. Shared by
 *  Leads (where a 'visit' promotes) and Pipeline (where every type just
 *  adds to history) — see CRM_SPEC.md. */
export function LogActivityForm({
  isLead = false,
  submitting,
  onSubmit,
  onCancel,
}: {
  isLead?: boolean
  submitting: boolean
  onSubmit: (type: ActivityType, notes: string, occurredAt: string) => void
  onCancel: () => void
}) {
  const [type, setType] = useState<ActivityType>('call')
  const [notes, setNotes] = useState('')
  const [occurredAt, setOccurredAt] = useState(today())

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-sm border border-[var(--surface-line)] p-3">
      <div className="flex flex-wrap gap-2">
        <select value={type} onChange={(e) => setType(e.target.value as ActivityType)} className={inputClass}>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} className={inputClass} />
      </div>
      {isLead && type === 'visit' && (
        <Note>This promotes the lead to Pipeline — you'll own it, first step logged as a drop-in.</Note>
      )}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes…"
        rows={2}
        className={inputClass}
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={submitting}
          onClick={() => onSubmit(type, notes.trim(), occurredAt)}
          className="rounded-full bg-[var(--surface-teal)] px-4 py-1.5 text-sm text-white disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Log it'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-[var(--surface-line)] px-4 py-1.5 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
