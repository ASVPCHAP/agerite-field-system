import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../auth/AuthContext'
import type { Clinic, Lead } from '../../../data/schema'
import { askAssistant, listClinics, listLeads } from '../../../data/store'
import { Note, SectionHeading, TableWrap, td, th } from '../../../components/ui'

const FUNNEL_COLOR = {
  prospecting: 'var(--surface-gold)',
  pipeline: 'var(--surface-teal)',
  active: 'var(--surface-vermilion)',
}

export function Analytics() {
  const { currentRep } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    listLeads().then(setLeads)
    listClinics().then(setClinics)
  }, [])

  async function handleAsk() {
    if (!question.trim()) return
    setAsking(true)
    setAnswer(null)
    const result = await askAssistant(question.trim())
    setAnswer(result.ok ? result.answer : `Error: ${result.error}`)
    setAsking(false)
  }

  const prospecting = leads.filter((l) => l.status === 'new' || l.status === 'contacted').length
  const pipeline = clinics.filter((c) => c.stage !== 'reorder').length
  const active = clinics.filter((c) => c.stage === 'reorder').length
  const funnelMax = Math.max(prospecting, pipeline, active, 1)

  const clusters = useMemo(() => {
    const set = new Set<string>([...leads.map((l) => l.cluster), ...clinics.map((c) => c.cluster)])
    return [...set].sort()
  }, [leads, clinics])

  const tiers = ['T1', 'T2', 'T3'] as const

  function counts(pred: (t: string, cl: string) => boolean) {
    return {
      prospecting: leads.filter((l) => (l.status === 'new' || l.status === 'contacted') && pred(l.tier, l.cluster)).length,
      pipeline: clinics.filter((c) => c.stage !== 'reorder' && pred(c.tier, c.cluster)).length,
      active: clinics.filter((c) => c.stage === 'reorder' && pred(c.tier, c.cluster)).length,
    }
  }

  return (
    <div>
      <SectionHeading>Analytics</SectionHeading>

      <div className="mt-6 flex flex-col gap-1.5 sm:flex-row sm:items-end sm:gap-2">
        {(
          [
            ['prospecting', 'Prospecting', prospecting],
            ['pipeline', 'In pipeline', pipeline],
            ['active', 'Active accounts', active],
          ] as const
        ).map(([key, label, count]) => (
          <div key={key} className="flex-1" style={{ flexGrow: Math.max(count, 1) / funnelMax + 0.15 }}>
            <div
              className="flex h-20 items-end rounded-sm px-4 py-3 sm:h-28"
              style={{ backgroundColor: FUNNEL_COLOR[key], opacity: 0.9 }}
            >
              <span className="font-mono text-3xl font-semibold text-[#14171a] sm:text-4xl">{count}</span>
            </div>
            <div className="mt-1.5 font-mono text-xs tracking-wide text-[var(--surface-ink-soft)] uppercase">
              {label}
            </div>
          </div>
        ))}
      </div>

      <h3 className="mt-10 font-display text-lg font-semibold text-[var(--surface-ink)]">By tier</h3>
      <TableWrap>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr>
              <th className={th}>Tier</th>
              <th className={th}>Prospecting</th>
              <th className={th}>In pipeline</th>
              <th className={th}>Active</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => {
              const c = counts((tier) => tier === t)
              return (
                <tr key={t}>
                  <td className={td}>{t}</td>
                  <td className={td}>{c.prospecting}</td>
                  <td className={td}>{c.pipeline}</td>
                  <td className={td}>{c.active}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </TableWrap>

      <h3 className="mt-10 font-display text-lg font-semibold text-[var(--surface-ink)]">By cluster</h3>
      <TableWrap>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr>
              <th className={th}>Cluster</th>
              <th className={th}>Prospecting</th>
              <th className={th}>In pipeline</th>
              <th className={th}>Active</th>
            </tr>
          </thead>
          <tbody>
            {clusters.map((cl) => {
              const c = counts((_t, cluster) => cluster === cl)
              return (
                <tr key={cl}>
                  <td className={td}>{cl}</td>
                  <td className={td}>{c.prospecting}</td>
                  <td className={td}>{c.pipeline}</td>
                  <td className={td}>{c.active}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </TableWrap>

      {currentRep?.is_leadership && (
        <div className="mt-10">
          <h3 className="font-display text-lg font-semibold text-[var(--surface-ink)]">
            Ask about sales numbers or reports
          </h3>
          <div className="mt-2">
            <Note>Leadership-only. Answers are generated from the data above — nothing else.</Note>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              placeholder="e.g. Which reps have stale accounts? How's the pipeline looking?"
              className="min-w-[20rem] flex-1 rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              disabled={!question.trim() || asking}
              onClick={handleAsk}
              className="rounded-full bg-[var(--surface-teal)] px-4 py-1.5 text-sm text-white disabled:opacity-60"
            >
              {asking ? 'Asking…' : 'Ask'}
            </button>
          </div>
          {answer && (
            <div className="mt-4 rounded-sm border border-[var(--surface-line)] bg-[var(--surface-bg-2)] p-4 text-sm whitespace-pre-wrap">
              {answer}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
