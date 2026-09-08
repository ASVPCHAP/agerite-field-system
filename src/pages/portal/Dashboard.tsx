import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import type { CertStatus, Clinic, PipelineStage, Product, ProductChangeLog } from '../../data/schema'
import { clinicNeedsContact, isActionableClinic, NO_CONTACT_DAYS } from '../../data/attention'
import {
  listClinics,
  listPendingReview,
  listProductChangeLog,
  listRefills,
  listRepProducts,
} from '../../data/store'
import { Card, Note, Pill, SectionHeading, StatTile, TableWrap, td, tdMono, th } from '../../components/ui'
import { SyncSheetButton } from '../../components/SyncSheetButton'

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
  'inline-flex items-center rounded-full border border-[var(--surface-line)] px-4 py-1.5 text-sm'

export function Dashboard() {
  const { currentRep } = useAuth()
  const [clinics, setClinics] = useState<Clinic[] | null>(null)
  const [dueSoonCount, setDueSoonCount] = useState(0)
  const [lapsedCount, setLapsedCount] = useState(0)
  const [log, setLog] = useState<ProductChangeLog[] | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [pendingReview, setPendingReview] = useState<Product[]>([])

  function refresh() {
    listClinics().then(setClinics)
    listProductChangeLog().then(setLog)
    listRepProducts().then(setProducts)
    listPendingReview().then(setPendingReview)
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

  return (
    <div>
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
          to="/portal/pipeline?stale=1"
          value={clinics ? staleClinicCount : '—'}
          label={`No contact in ${NO_CONTACT_DAYS}d`}
        />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,14rem)_1fr]">
        <Link to="/portal/manage-products?review=1" className="block">
          <Card className="h-full transition-colors hover:border-[var(--surface-gold)]">
            <div className="font-mono text-3xl text-[var(--surface-ink)]">{pendingReview.length}</div>
            <div className="mt-1 font-mono text-xs tracking-wide text-[var(--surface-ink-soft)] uppercase">
              Pending PIC review
            </div>
            <p className="mt-2 text-sm text-[var(--surface-ink-soft)]">
              Products in <span className="font-mono">pending_review</span> — Cindy / approval gate.
              Open Manage products.
            </p>
          </Card>
        </Link>

        <Card>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-lg font-semibold">Your territory</h3>
            <Link
              to="/portal/pipeline"
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

      <h3 className="mt-10 font-display text-lg font-semibold">Quick actions</h3>
      <div className="mt-3 flex flex-wrap items-start gap-3">
        <Link to="/portal/pipeline?action=log" className={actionClass}>
          Log contact
        </Link>
        <Link to="/portal/pipeline?action=add" className={actionClass}>
          Add clinic
        </Link>
        <SyncSheetButton onSynced={refresh} />
        <Link to="/portal/knowledge" className={actionClass}>
          Open Knowledge
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
