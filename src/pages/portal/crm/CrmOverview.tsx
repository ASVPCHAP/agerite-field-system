import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Clinic, Lead } from '../../../data/schema'
import { listClinics, listLeads } from '../../../data/store'
import { Card, Note, SectionHeading, StatTile } from '../../../components/ui'

const QUICK_LINKS = [
  { to: '/portal/crm/leads', label: 'Leads', description: 'Everyone out there — who hasn\'t been touched, who\'s being worked, who\'s already ordering.' },
  { to: '/portal/crm/pipeline', label: 'Pipeline', description: 'Your active working list — log activity, see history, ownership.' },
  { to: '/portal/crm/find-prospects', label: 'Find prospects', description: 'Research new leads with your own free AI account, import the results.' },
  { to: '/portal/crm/analytics', label: 'Analytics', description: 'The funnel, broken down by tier and cluster.' },
]

/** CRM landing page — its own destination (funnel snapshot + a way in to
 *  each sub-area) instead of dropping straight into Leads. See
 *  CRM_SPEC.md section 13. */
export function CrmOverview() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])

  useEffect(() => {
    listLeads().then(setLeads)
    listClinics().then(setClinics)
  }, [])

  const prospecting = leads.filter((l) => l.status === 'new' || l.status === 'contacted').length
  const pipeline = clinics.filter((c) => c.stage !== 'reorder').length
  const active = clinics.filter((c) => c.stage === 'reorder').length

  return (
    <div>
      <SectionHeading>CRM</SectionHeading>
      <div className="mt-2">
        <Note>Prospecting, pipeline, and active accounts — pick a screen below.</Note>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <StatTile value={prospecting} label="Prospecting" />
        <StatTile value={pipeline} label="In pipeline" />
        <StatTile value={active} label="Active accounts" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {QUICK_LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="block">
            <Card className="h-full transition-colors hover:border-[var(--surface-teal)]">
              <h3 className="font-display text-lg font-semibold">{l.label}</h3>
              <p className="mt-1 text-sm text-[var(--surface-ink-soft)]">{l.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
