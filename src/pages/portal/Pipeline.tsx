import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import type { ActivityType, Clinic, Product, Rep } from '../../data/schema'
import { clinicNeedsContact, isActionableClinic, NO_CONTACT_DAYS } from '../../data/attention'
import { listClinics, listRepProducts, listReps, logActivity } from '../../data/store'
import { Note, Pill, SectionHeading, TableWrap, td, tdMono, th } from '../../components/ui'
import { LogActivityForm } from '../../components/LogActivityForm'
import { ActivityHistory } from '../../components/ActivityHistory'
import { OrdersHistory } from '../../components/OrdersHistory'

export function Pipeline() {
  const { currentRep } = useAuth()
  const [searchParams] = useSearchParams()
  const action = searchParams.get('action')
  const staleOnly = searchParams.get('stale') === '1'
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [reps, setReps] = useState<Rep[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState<{ tone: 'ok' | 'blocked'; text: string } | null>(null)
  const [openPanel, setOpenPanel] = useState<{ clinicId: string; kind: 'log' | 'history' | 'orders' } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const refresh = () => listClinics().then(setClinics)

  useEffect(() => {
    refresh()
    listReps().then(setReps)
    listRepProducts().then(setProducts)
  }, [])

  const repById = useMemo(() => new Map(reps.map((r) => [r.id, r.name])), [reps])
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const today = useMemo(() => new Date(), [])
  const filtered = clinics.filter((c) => {
    if (!c.name.toLowerCase().includes(search.toLowerCase())) return false
    if (!staleOnly) return true
    return isActionableClinic(c, currentRep?.id) && clinicNeedsContact(c, today)
  })

  async function handleLog(clinicId: string, type: ActivityType, notes: string, occurredAt: string) {
    if (!currentRep) return
    const clinicName = clinics.find((c) => c.id === clinicId)?.name
    const wasUnowned = !clinics.find((c) => c.id === clinicId)?.owner_rep_id
    setSubmitting(true)
    const result = await logActivity({ clinicId, type, notes: notes || null, occurredAt }, currentRep.id)
    setSubmitting(false)
    if (result.ok) {
      setMessage({
        tone: 'ok',
        text: wasUnowned ? `${clinicName} is now owned by you (${currentRep.name}), effective today.` : `Logged for ${clinicName}.`,
      })
      setOpenPanel(null)
      refresh()
    } else if (result.reason === 'owned_by_other') {
      setMessage({
        tone: 'blocked',
        text: `Blocked — ${clinicName} is owned by ${result.ownerName}${result.since ? ` since ${result.since}` : ''}. You can't log a new interaction here. Ask an admin to reassign if this is wrong.`,
      })
    }
  }

  return (
    <div>
      <SectionHeading>Pipeline</SectionHeading>
      <div className="mt-2">
        <Note>First rep to log a touch owns the clinic. Try logging against one already owned by another rep.</Note>
      </div>
      {action === 'log' && (
        <div className="mt-3">
          <Note>Use Log activity on a clinic below. First touch on an open clinic claims ownership.</Note>
        </div>
      )}
      {action === 'add' && (
        <div className="mt-3">
          <Note>
            Phase 1 has no separate add-clinic form — a clinic enters your book when you log the
            first activity on an open row.
          </Note>
        </div>
      )}
      {staleOnly && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Note>
            Showing open or owned-by-you clinics with no contact in {NO_CONTACT_DAYS} days.
          </Note>
          <Link
            to="/portal/crm/pipeline"
            className="font-mono text-[0.68rem] tracking-wide text-[var(--surface-ink-soft)] uppercase hover:text-[var(--surface-ink)]"
          >
            Show all
          </Link>
        </div>
      )}

      <input
        type="text"
        placeholder="Search clinics…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-4 w-full max-w-xs rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-2 text-sm"
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
              const ownerName = c.owner_rep_id ? repById.get(c.owner_rep_id) : null
              const isOpen = openPanel?.clinicId === c.id
              return (
                <Fragment key={c.id}>
                  <tr>
                    <td className={td}>{c.name}</td>
                    <td className={td}>{c.city}</td>
                    <td className={td}>{c.segment}</td>
                    <td className={td}>{c.tier}</td>
                    <td className={tdMono}>{c.stage}</td>
                    <td className={td}>
                      {ownerName ? <Pill tone="owned">{ownerName}</Pill> : <Pill tone="open">Open</Pill>}
                    </td>
                    <td className={td}>{c.next_step ?? '—'}</td>
                    <td className={td}>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setOpenPanel(isOpen && openPanel?.kind === 'log' ? null : { clinicId: c.id, kind: 'log' })}
                          className="inline-flex min-h-11 items-center rounded-full border border-[var(--surface-line)] px-3 py-2 text-xs md:min-h-0 md:py-1"
                        >
                          Log activity
                        </button>
                        {c.stage === 'reorder' && (
                          <button
                            type="button"
                            onClick={() => setOpenPanel(isOpen && openPanel?.kind === 'orders' ? null : { clinicId: c.id, kind: 'orders' })}
                            className="inline-flex min-h-11 items-center rounded-full border border-[var(--surface-line)] px-3 py-2 text-xs md:min-h-0 md:py-1"
                          >
                            Orders
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setOpenPanel(isOpen && openPanel?.kind === 'history' ? null : { clinicId: c.id, kind: 'history' })}
                          className="inline-flex min-h-11 items-center rounded-full border border-[var(--surface-line)] px-3 py-2 text-xs md:min-h-0 md:py-1"
                        >
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={8} className={td}>
                        {openPanel.kind === 'log' ? (
                          <LogActivityForm
                            submitting={submitting}
                            onSubmit={(type, notes, occurredAt) => handleLog(c.id, type, notes, occurredAt)}
                            onCancel={() => setOpenPanel(null)}
                          />
                        ) : openPanel.kind === 'orders' ? (
                          <OrdersHistory clinicId={c.id} productById={productById} />
                        ) : (
                          <ActivityHistory target={{ clinicId: c.id }} repById={repById} />
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
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
