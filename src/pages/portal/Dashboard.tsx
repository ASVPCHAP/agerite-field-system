import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import type { CertStatus, Clinic, Order, PipelineStage, Product, ProductChangeLog, Rep } from '../../data/schema'
import { clinicNeedsContact, isActionableClinic, NO_CONTACT_DAYS } from '../../data/attention'
import { money, orderTotals } from '../../data/orders'
import {
  listClinics,
  listOrders,
  listPendingReview,
  listProductChangeLog,
  listRefills,
  listRepProducts,
  listReps,
} from '../../data/store'
import { Card, Note, Pill, SectionHeading, StatTile, TableWrap, td, tdMono, th } from '../../components/ui'
import { SyncSheetButton } from '../../components/SyncSheetButton'
import { ActivityHistory } from '../../components/ActivityHistory'
import { OrdersHistory } from '../../components/OrdersHistory'

const PIPELINE_STAGES: PipelineStage[] = [
  'identify',
  'drop_in',
  'discovery',
  'solution',
  'onboard',
  'reorder',
]

const STAGE_LABEL: Record<PipelineStage, string> = {
  identify: 'Identify',
  drop_in: 'Drop-in',
  discovery: 'Discovery',
  solution: 'Solution',
  onboard: 'Onboard',
  reorder: 'Reorder',
}

const CERT_CHIP: Record<CertStatus, { label: string; tone: 'pass' | 'review' | 'open' }> = {
  certified: { label: 'Complete', tone: 'pass' },
  in_progress: { label: 'Due', tone: 'review' },
  not_started: { label: 'Incomplete', tone: 'open' },
}

const actionClass =
  'inline-flex min-h-11 items-center rounded-full border border-[var(--surface-line)] px-4 py-2 text-sm'

export function Dashboard() {
  const { currentRep } = useAuth()
  const [clinics, setClinics] = useState<Clinic[] | null>(null)
  const [dueSoonCount, setDueSoonCount] = useState(0)
  const [lapsedCount, setLapsedCount] = useState(0)
  const [log, setLog] = useState<ProductChangeLog[] | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [pendingReview, setPendingReview] = useState<Product[]>([])
  const [reps, setReps] = useState<Rep[]>([])
  const [ordersByClinic, setOrdersByClinic] = useState<Map<string, Order[]>>(new Map())
  const [openPanel, setOpenPanel] = useState<{ clinicId: string; kind: 'history' | 'orders' } | null>(null)

  function refresh() {
    listClinics().then(setClinics)
    listProductChangeLog().then(setLog)
    listRepProducts().then(setProducts)
    listPendingReview().then(setPendingReview)
    listReps().then(setReps)
    const today = new Date()
    listRefills(today).then((refills) => {
      setDueSoonCount(refills.filter((r) => r.status === 'due' || r.status === 'due_soon').length)
      setLapsedCount(refills.filter((r) => r.status === 'lapsed').length)
    })
  }

  useEffect(refresh, [])

  const productById = new Map(products.map((p) => [p.id, p]))
  const owned = (clinics ?? []).filter((c) => c.owner_rep_id === currentRep?.id)
  const ownedByYou = owned.length

  const staleClinicCount = useMemo(() => {
    if (!clinics) return 0
    const today = new Date()
    return clinics.filter(
      (c) => isActionableClinic(c, currentRep?.id) && clinicNeedsContact(c, today),
    ).length
  }, [clinics, currentRep?.id])

  const stageCounts = useMemo(() => {
    const counts = Object.fromEntries(PIPELINE_STAGES.map((s) => [s, 0])) as Record<
      PipelineStage,
      number
    >
    for (const clinic of owned) counts[clinic.stage] += 1
    return counts
  }, [owned])

  const cert = currentRep ? CERT_CHIP[currentRep.cert_status] : null
  const repById = useMemo(() => new Map(reps.map((r) => [r.id, r.name])), [reps])
  const activeClinics = useMemo(
    () => owned.filter((c) => c.stage === 'reorder'),
    [owned],
  )
  const activeClinicIds = activeClinics.map((c) => c.id).join(',')

  useEffect(() => {
    if (!activeClinicIds) return
    Promise.all(activeClinicIds.split(',').map((id) => listOrders(id).then((orders) => [id, orders] as const))).then(
      (pairs) => setOrdersByClinic(new Map(pairs)),
    )
  }, [activeClinicIds])

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeading>Dashboard</SectionHeading>
        {cert && (
          <Link
            to="/portal/certification"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--surface-line)] px-3 py-1.5"
          >
            <span className="font-mono text-[0.68rem] tracking-wide text-[var(--surface-ink-soft)] uppercase">
              Peptide cert
            </span>
            <Pill tone={cert.tone}>{cert.label}</Pill>
          </Link>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile value={clinics?.length ?? '—'} label="Clinics in pipeline" />
        <StatTile value={ownedByYou} label="Owned by you" />
        <StatTile value={dueSoonCount} label="Refills due soon" />
        <StatTile value={lapsedCount} label="Lapsed refills" />
      </div>

      <h3 className="mt-10 font-display text-lg font-semibold">Needs attention</h3>
      <p className="mt-1 font-mono text-[0.68rem] tracking-wide text-[var(--surface-ink-soft)] uppercase">
        Due refills, lapsed refills, and no contact in {NO_CONTACT_DAYS} days
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AttentionLink
          to="/portal/refills?status=due"
          value={dueSoonCount}
          label="Due refills"
        />
        <AttentionLink
          to="/portal/refills?status=lapsed"
          value={lapsedCount}
          label="Lapsed refills"
        />
        <AttentionLink
          to="/portal/crm/pipeline?stale=1"
          value={clinics ? staleClinicCount : '—'}
          label={`No contact in ${NO_CONTACT_DAYS}d`}
        />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,14rem)_1fr]">
        <Link
          to={currentRep?.role === 'admin' ? '/portal/manage-products?review=1' : '/portal/knowledge'}
          className="block"
        >
          <Card className="h-full transition-colors hover:border-[var(--surface-gold)]">
            <div className="font-mono text-3xl text-[var(--surface-ink)]">{pendingReview.length}</div>
            <div className="mt-1 font-mono text-xs tracking-wide text-[var(--surface-ink-soft)] uppercase">
              Pending PIC review
            </div>
            <p className="mt-2 text-sm text-[var(--surface-ink-soft)]">
              Products in <span className="font-mono">pending_review</span> — Cindy / approval gate.{' '}
              {currentRep?.role === 'admin' ? 'Open Manage products.' : 'Flagged in Resources.'}
            </p>
          </Card>
        </Link>

        <Card>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-lg font-semibold">Your territory</h3>
            <Link
              to="/portal/crm/pipeline"
              className="font-mono text-[0.68rem] tracking-wide text-[var(--surface-ink-soft)] uppercase hover:text-[var(--surface-ink)]"
            >
              Open pipeline
            </Link>
          </div>
          {ownedByYou === 0 ? (
            <p className="mt-3 text-sm text-[var(--surface-ink-soft)]">
              No clinics owned yet. Log a contact on an open clinic to claim one.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {PIPELINE_STAGES.map((stage) => (
                <Pill key={stage} tone={stageCounts[stage] > 0 ? 'current' : 'open'}>
                  {STAGE_LABEL[stage]} {stageCounts[stage]}
                </Pill>
              ))}
            </div>
          )}
        </Card>
      </div>

      <h3 className="mt-10 font-display text-lg font-semibold">Active clinics</h3>
      <p className="mt-1 font-mono text-[0.68rem] tracking-wide text-[var(--surface-ink-soft)] uppercase">
        Clinics you own that are already ordering
      </p>
      {activeClinics.length === 0 ? (
        <div className="mt-3">
          <Note>None yet — clinics show up here once they reach the reorder stage.</Note>
        </div>
      ) : (
        <TableWrap>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Clinic</th>
                <th className={th}>Contact</th>
                <th className={th}>Order volume</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {activeClinics.map((c) => {
                const orders = ordersByClinic.get(c.id)
                const totals = orders ? orderTotals(orders, productById) : null
                const isOpen = openPanel?.clinicId === c.id
                return (
                  <Fragment key={c.id}>
                    <tr>
                      <td className={td}>
                        {c.name}
                        <div className="text-xs text-[var(--surface-ink-soft)]">{c.city}</div>
                      </td>
                      <td className={tdMono}>
                        {c.phone ?? '—'}
                        {c.email && <div>{c.email}</div>}
                      </td>
                      <td className={td}>
                        {totals ? (
                          <div>
                            <div className="font-mono text-[var(--surface-ink)]">{money(totals.value)}</div>
                            <div className="text-xs text-[var(--surface-ink-soft)]">
                              {totals.count} order{totals.count === 1 ? '' : 's'} · trailing 90 days
                            </div>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className={td}>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setOpenPanel(isOpen && openPanel?.kind === 'orders' ? null : { clinicId: c.id, kind: 'orders' })}
                            className="inline-flex min-h-11 items-center rounded-full border border-[var(--surface-line)] px-3 py-2 text-xs md:min-h-0 md:py-1"
                          >
                            Orders
                          </button>
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
                        <td colSpan={4} className={td}>
                          {openPanel.kind === 'orders' ? (
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
      )}
      <p className="mt-2 text-xs text-[var(--surface-ink-soft)]">
        Order volume is preview data, shaped to match AGErite's SiCompounding B2B Order API —
        not yet wired to a live feed. Contact and history are real.
      </p>

      <h3 className="mt-10 font-display text-lg font-semibold">Quick actions</h3>
      <div className="mt-3 flex flex-wrap items-start gap-3">
        <Link to="/portal/crm/pipeline?action=log" className={actionClass}>
          Log contact
        </Link>
        <Link to="/portal/crm/pipeline?action=add" className={actionClass}>
          Add clinic
        </Link>
        <SyncSheetButton onSynced={refresh} />
        <Link to="/portal/knowledge" className={actionClass}>
          Open Resources
        </Link>
        <Link to="/portal/knowledge?tab=forms" className={actionClass}>
          Place an order
        </Link>
      </div>

      <div className="mt-10">
        <h3 className="font-display text-lg font-semibold">What changed</h3>
      </div>
      {log !== null && log.length === 0 ? (
        <div className="mt-4">
          <Card>
            <Note>
              {products.length === 1
                ? '1 product already synced from the Sheet; edits will show here.'
                : `${products.length} products already synced from the Sheet; edits will show here.`}
            </Note>
          </Card>
        </div>
      ) : (
        <TableWrap>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Product</th>
                <th className={th}>Field</th>
                <th className={th}>Old → new</th>
                <th className={th}>By</th>
                <th className={th}>When</th>
              </tr>
            </thead>
            <tbody>
              {(log ?? []).map((entry) => (
                <tr key={entry.id}>
                  <td className={td}>{productById.get(entry.product_id)?.name ?? entry.product_id}</td>
                  <td className={td}>{entry.field_changed}</td>
                  <td className={tdMono}>
                    {entry.old_value} → {entry.new_value}
                  </td>
                  <td className={td}>{entry.changed_by}</td>
                  <td className={tdMono}>{entry.changed_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </div>
  )
}

function AttentionLink({
  to,
  value,
  label,
}: {
  to: string
  value: number | string
  label: string
}) {
  return (
    <Link to={to} className="block">
      <Card className="transition-colors hover:border-[var(--surface-teal)]">
        <div className="font-mono text-3xl text-[var(--surface-ink)]">{value}</div>
        <div className="mt-1 font-mono text-xs tracking-wide text-[var(--surface-ink-soft)] uppercase">
          {label}
        </div>
      </Card>
    </Link>
  )
}
