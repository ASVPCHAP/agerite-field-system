import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import type { Clinic, Rep } from '../../data/schema'
import { listClinics, listReps, logClinicContact } from '../../data/store'
import { Note, Pill, SectionHeading, TableWrap, td, tdMono, th } from '../../components/ui'

export function Pipeline() {
  const { currentRep } = useAuth()
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [reps, setReps] = useState<Rep[]>([])
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState<{ tone: 'ok' | 'blocked'; text: string } | null>(null)

  const refresh = () => listClinics().then(setClinics)

  useEffect(() => {
    refresh()
    listReps().then(setReps)
  }, [])

  const repById = useMemo(() => new Map(reps.map((r) => [r.id, r])), [reps])
  const filtered = clinics.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))

  async function handleLogContact(clinicId: string) {
    if (!currentRep) return
    const wasUnowned = !clinics.find((c) => c.id === clinicId)?.owner_rep_id
    const result = await logClinicContact(clinicId, currentRep.id, new Date())
    if (result.ok) {
      setMessage({
        tone: 'ok',
        text: wasUnowned
          ? `${result.clinic.name} is now owned by you (${currentRep.name}), effective today.`
          : `Contact logged for ${result.clinic.name}.`,
      })
      refresh()
    } else {
      setMessage({
        tone: 'blocked',
        text: `Blocked — ${clinics.find((c) => c.id === clinicId)?.name} is owned by ${result.ownerName}${
          result.since ? ` since ${result.since}` : ''
        }. You can't log a new interaction here. Ask an admin to reassign if this is wrong.`,
      })
    }
  }

  return (
    <div>
      <SectionHeading>Pipeline</SectionHeading>
      <div className="mt-2">
        <Note>First rep to log a touch owns the clinic. Try logging against one already owned by another rep.</Note>
      </div>

      <input
        type="text"
        placeholder="Search clinics…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-4 max-w-xs rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-1.5 text-sm"
      />

      <TableWrap>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr>
              <th className={th}>Clinic</th>
              <th className={th}>City</th>
              <th className={th}>Segment</th>
              <th className={th}>Tier</th>
              <th className={th}>Stage</th>
              <th className={th}>Owner</th>
              <th className={th}>Next step</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const owner = c.owner_rep_id ? repById.get(c.owner_rep_id) : null
              return (
                <tr key={c.id}>
                  <td className={td}>{c.name}</td>
                  <td className={td}>{c.city}</td>
                  <td className={td}>{c.segment}</td>
                  <td className={td}>{c.tier}</td>
                  <td className={tdMono}>{c.stage}</td>
                  <td className={td}>
                    {owner ? <Pill tone="owned">{owner.name}</Pill> : <Pill tone="open">Open</Pill>}
                  </td>
                  <td className={td}>{c.next_step ?? '—'}</td>
                  <td className={td}>
                    <button
                      type="button"
                      onClick={() => handleLogContact(c.id)}
                      className="rounded-full border border-[var(--surface-line)] px-3 py-1 text-xs"
                    >
                      Log contact
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </TableWrap>

      {message && (
        <p className={`mt-4 font-mono text-sm ${message.tone === 'ok' ? 'text-[var(--surface-teal)]' : 'text-[var(--surface-vermilion)]'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
