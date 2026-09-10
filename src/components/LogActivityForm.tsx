import { useState } from 'react'
import type { ActivityType, Contact } from '../data/schema'
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
 *  Leads (where a 'visit' promotes), Pipeline/company pages (where every
 *  type just adds to history) — see CRM_SPEC.md and DEALS_SPEC.md.
 *  `contacts`/`defaultContactId` are optional — a lead has no contacts
 *  yet, and a quick log doesn't require picking one. */
export function LogActivityForm({
  isLead = false,
  contacts,
  defaultContactId = null,
  submitting,
  onSubmit,
  onCancel,
}: {
  isLead?: boolean
  contacts?: Contact[]
  defaultContactId?: string | null
  submitting: boolean
  onSubmit: (type: ActivityType, notes: string, occurredAt: string, contactId: string | null) => void
  onCancel: () => void
}) {
  const [type, setType] = useState<ActivityType>('call')
  const [notes, setNotes] = useState('')
  const [occurredAt, setOccurredAt] = useState(today())
  const [contactId, setContactId] = useState<string>(defaultContactId ?? '')

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
        {contacts && contacts.length > 0 && (
          <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={inputClass}>
            <option value="">Who did you talk to? (optional)</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.role ? ` (${c.role})` : ''}
              </option>
            ))}
          </select>
        )}
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
          onClick={() => onSubmit(type, notes.trim(), occurredAt, contactId || null)}
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
