import { useEffect, useState } from 'react'
import type { Activity } from '../data/schema'
import { listActivities } from '../data/store'
import { Note } from './ui'

const TYPE_LABEL: Record<Activity['type'], string> = {
  call: 'Call',
  text: 'Text',
  visit: 'Visit',
  email: 'Email',
  note: 'Note',
}

/** Read-only history list for one lead or clinic. When `contactById` is
 *  given (clinics only — a lead has no contacts yet), shows who the
 *  interaction was with. See CRM_SPEC.md and DEALS_SPEC.md. */
export function ActivityHistory({
  target,
  repById,
  contactById,
}: {
  target: { leadId?: string; clinicId?: string }
  repById: Map<string, string>
  contactById?: Map<string, string>
}) {
  const [activities, setActivities] = useState<Activity[] | null>(null)
  const { leadId, clinicId } = target

  useEffect(() => {
    listActivities({ leadId, clinicId }).then(setActivities)
  }, [leadId, clinicId])

  if (activities === null) return null
  if (activities.length === 0) return <Note>No activity logged yet.</Note>

  return (
    <ul className="mt-2 flex flex-col gap-1.5 text-sm">
      {activities.map((a) => {
        const contactName = a.contact_id ? contactById?.get(a.contact_id) : undefined
        return (
          <li key={a.id} className="border-b border-[var(--surface-line)] pb-1.5">
            <span className="font-mono text-xs tracking-wide text-[var(--surface-ink-soft)] uppercase">
              {a.occurred_at} · {TYPE_LABEL[a.type]} · {repById.get(a.rep_id) ?? 'unknown'}
              {contactName ? ` · with ${contactName}` : ''}
            </span>
            {a.notes && <p className="mt-0.5">{a.notes}</p>}
          </li>
        )
      })}
    </ul>
  )
}
