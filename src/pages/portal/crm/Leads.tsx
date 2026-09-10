import { Fragment, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../auth/AuthContext'
import type { ActivityType, Clinic, Lead, Rep } from '../../../data/schema'
import { listClinics, listLeads, listReps, logActivity, promoteLead } from '../../../data/store'
import { Note, Pill, SectionHeading, TableWrap, td, th } from '../../../components/ui'
import { LogActivityForm } from '../../../components/LogActivityForm'
import { ActivityHistory } from '../../../components/ActivityHistory'

type BookState = 'prospecting' | 'pipeline' | 'active'

interface BookRow {
  key: string
  name: string
  city: string
  segment: string
  tier: string
  cluster: string
  state: BookState
  leadId?: string
  clinicId?: string
  ownerName?: string
}

const STATE_LABEL: Record<BookState, string> = {
  prospecting: 'Prospecting',
  pipeline: 'In pipeline',
  active: 'Active account',
}

// Row-edge color encodes funnel state — gold (not yet touched) through
// teal (being worked) to vermilion (converted) — reusing the same
// color-as-status language already used elsewhere in the portal instead of
// introducing another pill/badge style. See CRM_SPEC.md.
const STATE_BORDER: Record<BookState, string> = {
  prospecting: 'border-l-[var(--surface-gold)]',
  pipeline: 'border-l-[var(--surface-teal)]',
  active: 'border-l-[var(--surface-vermilion)]',
}

export function Leads() {
  const { currentRep } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [reps, setReps] = useState<Rep[]>([])
  const [cluster, setCluster] = useState('')
  const [tier, setTier] = useState('')
  const [state, setState] = useState('')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [promoting, setPromoting] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [openPanel, setOpenPanel] = useState<{ key: string; kind: 'log' | 'history' } | null>(null)

  function refresh() {
    listLeads().then(setLeads)
    listClinics().then(setClinics)
  }

  useEffect(() => {
    refresh()
    listReps().then(setReps)
  }, [])

  const repById = useMemo(() => new Map(reps.map((r) => [r.id, r.name])), [reps])

  const rows: BookRow[] = useMemo(() => {
    const leadRows: BookRow[] = leads
      .filter((l) => l.status === 'new' || l.status === 'contacted')
      .map((l) => ({
        key: `lead-${l.id}`,
        name: l.name,
        city: l.city,
        segment: l.segment,
        tier: l.tier,
        cluster: l.cluster,
        state: 'prospecting',
        leadId: l.id,
      }))
    const clinicRows: BookRow[] = clinics.map((c) => ({
      key: `clinic-${c.id}`,
      name: c.name,
      city: c.city,
      segment: c.segment,
      tier: c.tier,
      cluster: c.cluster,
      state: c.stage === 'reorder' ? 'active' : 'pipeline',
      clinicId: c.id,
      ownerName: c.owner_rep_id ? repById.get(c.owner_rep_id) : undefined,
    }))
    return [...leadRows, ...clinicRows].sort((a, b) => a.name.localeCompare(b.name))
  }, [leads, clinics, repById])

  const clusters = useMemo(() => [...new Set(rows.map((r) => r.cluster))].sort(), [rows])

  const filtered = rows.filter(
    (r) =>
      (!cluster || r.cluster === cluster) &&
      (!tier || r.tier === tier) &&
      (!state || r.state === state) &&
      r.name.toLowerCase().includes(search.toLowerCase()),
  )

  async function handlePromote(leadId: string, name: string) {
    if (!currentRep) return
    setPromoting(leadId)
    setMessage(null)
    try {
      await promoteLead(leadId, currentRep.id)
      setMessage(`${name} promoted to pipeline — you're the owner, first step logged as a drop-in.`)
      refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Promote failed.')
    } finally {
      setPromoting(null)
    }
  }

  async function handleLog(row: BookRow, type: ActivityType, notes: string, occurredAt: string) {
    if (!currentRep) return
    setSubmitting(true)
    setMessage(null)
    const result = await logActivity(
      { leadId: row.leadId, clinicId: row.clinicId, type, notes: notes || null, occurredAt },
      currentRep.id,
    )
    setSubmitting(false)
    if (result.ok) {
      setMessage(
        result.promotedClinicId
          ? `${row.name} promoted to pipeline from the visit — you're the owner.`
          : `Logged for ${row.name}.`,
      )
      setOpenPanel(null)
      refresh()
    } else if (result.reason === 'owned_by_other') {
      setMessage(`Blocked — ${row.name} is owned by ${result.ownerName}${result.since ? ` since ${result.since}` : ''}.`)
    } else {
      setMessage(`${row.name} was already promoted — log against it on the Pipeline tab instead.`)
    }
  }

  return (
    <div>
      <SectionHeading>Leads</SectionHeading>
      <div className="mt-2">
        <Note>
          Everything in one place — who hasn't been touched yet, who's being worked, and who's
          already ordering. <strong>T1</strong> = strong ICP fit, work first (owner-operated,
          cash-pay, has a prescriber). <strong>T2</strong> = decent fit. <strong>T3</strong> =
          partial or unconfirmed fit, lowest priority.
        </Note>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={cluster}
          onChange={(e) => setCluster(e.target.value)}
          className="rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-1.5 text-sm"
        >
          <option value="">All clusters</option>
          {clusters.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          className="rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-1.5 text-sm"
        >
          <option value="">All tiers</option>
          <option value="T1">T1</option>
          <option value="T2">T2</option>
          <option value="T3">T3</option>
        </select>
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-1.5 text-sm"
        >
          <option value="">All states</option>
          <option value="prospecting">Prospecting</option>
          <option value="pipeline">In pipeline</option>
          <option value="active">Active account</option>
        </select>
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-1.5 text-sm"
        />
      </div>

      {message && <p className="mt-4 font-mono text-sm text-[var(--surface-teal)]">{message}</p>}

      <TableWrap>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>City</th>
              <th className={th}>Segment</th>
              <th className={th}>Tier</th>
              <th className={th}>Cluster</th>
              <th className={th}>State</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const isOpen = openPanel?.key === r.key
              return (
                <Fragment key={r.key}>
                  <tr className={`border-l-4 ${STATE_BORDER[r.state]}`}>
                    <td className={td}>{r.name}</td>
                    <td className={td}>{r.city}</td>
                    <td className={td}>{r.segment}</td>
                    <td className={td}>{r.tier}</td>
                    <td className={td}>{r.cluster}</td>
                    <td className={td}>
                      {r.state === 'active' ? (
                        <Pill tone="current">{STATE_LABEL[r.state]}</Pill>
                      ) : r.state === 'pipeline' ? (
                        <Pill tone={r.ownerName ? 'owned' : 'open'}>
                          {r.ownerName ? `Owned · ${r.ownerName}` : STATE_LABEL[r.state]}
                        </Pill>
                      ) : (
                        <Pill tone="review">{STATE_LABEL[r.state]}</Pill>
                      )}
                    </td>
                    <td className={td}>
                      <div className="flex flex-wrap gap-2">
                        {r.leadId && (
                          <button
                            type="button"
                            disabled={promoting === r.leadId}
                            onClick={() => handlePromote(r.leadId!, r.name)}
                            className="inline-flex min-h-11 items-center rounded-full border border-[var(--surface-line)] px-3 py-2 text-xs disabled:opacity-60 md:min-h-0 md:py-1"
                          >
                            {promoting === r.leadId ? 'Promoting…' : 'Promote to pipeline'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setOpenPanel(isOpen && openPanel?.kind === 'log' ? null : { key: r.key, kind: 'log' })}
                          className="inline-flex min-h-11 items-center rounded-full border border-[var(--surface-line)] px-3 py-2 text-xs md:min-h-0 md:py-1"
                        >
                          Log activity
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenPanel(isOpen && openPanel?.kind === 'history' ? null : { key: r.key, kind: 'history' })}
                          className="inline-flex min-h-11 items-center rounded-full border border-[var(--surface-line)] px-3 py-2 text-xs md:min-h-0 md:py-1"
                        >
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={7} className={td}>
                        {openPanel.kind === 'log' ? (
                          <LogActivityForm
                            isLead={Boolean(r.leadId)}
                            submitting={submitting}
                            onSubmit={(type, notes, occurredAt) => handleLog(r, type, notes, occurredAt)}
                            onCancel={() => setOpenPanel(null)}
                          />
                        ) : (
                          <ActivityHistory target={{ leadId: r.leadId, clinicId: r.clinicId }} repById={repById} />
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
    </div>
  )
}
