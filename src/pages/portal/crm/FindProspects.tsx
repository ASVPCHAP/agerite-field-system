import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../auth/AuthContext'
import type { Clinic, Lead } from '../../../data/schema'
import type { NewLeadInput } from '../../../data/store'
import { createLeads, listClinics, listLeads } from '../../../data/store'
import { Note, SectionHeading, TableWrap, td, th } from '../../../components/ui'

const CATEGORIES = ['Med spa', 'Hormone clinic', 'Small hospital system', 'CBD/THC store']

const inputClass =
  'rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-1.5 text-sm'

interface DraftRow extends NewLeadInput {
  key: string
}

function parseResults(text: string): NewLeadInput[] {
  const clean = (v: string) => {
    const t = v.trim()
    return t === '' || /^(unknown|n\/a|none)$/i.test(t) ? null : t
  }
  return text
    .split('\n')
    .map((line) => line.split('|'))
    .filter((cells) => cells.length === 5)
    .map(([name, city, phone, email, website]) => ({
      name: name.trim(),
      city: city.trim(),
      phone: clean(phone),
      email: clean(email),
      website: clean(website),
      segment: '',
      tier: 'T2' as const,
      cluster: '',
    }))
    .filter((row) => row.name && row.city)
}

export function FindProspects() {
  const { currentRep } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [category, setCategory] = useState(CATEGORIES[0])
  const [area, setArea] = useState('')
  const [prompt, setPrompt] = useState('')
  const [pasted, setPasted] = useState('')
  const [drafts, setDrafts] = useState<DraftRow[] | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    listLeads().then(setLeads)
    listClinics().then(setClinics)
  }, [])

  const areas = useMemo(
    () => [...new Set([...leads.map((l) => l.cluster), ...clinics.map((c) => c.cluster)])].sort(),
    [leads, clinics],
  )

  function generatePrompt() {
    const targetArea = area || 'the Rockwall–Fate territory'
    const known = [...leads, ...clinics]
      .filter((r) => !area || r.cluster === area)
      .map((r) => r.name)
    const exclude = known.length
      ? `Skip these — we already have them: ${known.join(', ')}.\n\n`
      : ''
    const text = `I'm a field sales rep for AGErite Pharmacy, a 503A compounding pharmacy selling weight-loss, hormone, and peptide prescriptions to independent healthcare businesses.

Find ${category} businesses in ${targetArea} that fit this profile:
- Owner-operated or a small (1-3 location) group, not a large national chain
- Cash-pay or membership-based, not insurance-billing-only
- Has a prescriber on staff (MD/DO/NP/PA) or a medical director

${exclude}For each business you find, look up its current phone number, email, and website, then return one line per business in exactly this format, nothing else — no header row, no numbering, no extra commentary:

Name | City | Phone | Email | Website

Use "unknown" for anything you can't find.`
    setPrompt(text)
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt)
    } catch {
      /* clipboard permission denied — the textarea is still selectable/copyable by hand */
    }
  }

  function parsePasted() {
    const rows = parseResults(pasted).map((r, i) => ({
      ...r,
      key: `draft-${i}`,
      segment: category,
      cluster: area || 'Rockwall core',
    }))
    setDrafts(rows)
  }

  function updateDraft(key: string, patch: Partial<DraftRow>) {
    setDrafts((prev) => prev?.map((r) => (r.key === key ? { ...r, ...patch } : r)) ?? null)
  }

  function removeDraft(key: string) {
    setDrafts((prev) => prev?.filter((r) => r.key !== key) ?? null)
  }

  async function handleImport() {
    if (!drafts || !currentRep) return
    setImporting(true)
    setImportMessage(null)
    try {
      const inputs: NewLeadInput[] = drafts.map(({ key: _key, ...rest }) => rest)
      const created = await createLeads(inputs)
      setImportMessage(`Imported ${created.length} new lead${created.length === 1 ? '' : 's'}.`)
      setDrafts(null)
      setPasted('')
      listLeads().then(setLeads)
    } catch (err) {
      setImportMessage(err instanceof Error ? err.message : 'Import failed.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <SectionHeading>Find prospects</SectionHeading>
      <div className="mt-2">
        <Note>
          Generate a research prompt for your own AI (ChatGPT, Claude, Perplexity — whatever you
          use), paste its results back, review, and import. No cost on our end.
        </Note>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={area} onChange={(e) => setArea(e.target.value)} className={inputClass}>
          <option value="">Choose an area…</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={generatePrompt}
          className="rounded-full bg-[var(--surface-teal)] px-4 py-1.5 text-sm text-white"
        >
          Generate prompt
        </button>
      </div>

      {prompt && (
        <div className="mt-4">
          <textarea
            readOnly
            value={prompt}
            rows={10}
            className="w-full rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-2 font-mono text-xs"
          />
          <button
            type="button"
            onClick={copyPrompt}
            className="mt-2 rounded-full border border-[var(--surface-line)] px-4 py-1.5 text-sm"
          >
            Copy prompt
          </button>
        </div>
      )}

      <h3 className="mt-10 font-display text-lg font-semibold text-[var(--surface-ink)]">
        Paste your AI's results
      </h3>
      <textarea
        value={pasted}
        onChange={(e) => setPasted(e.target.value)}
        rows={6}
        placeholder="Paste the raw response here…"
        className="mt-2 w-full rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-2 text-sm"
      />
      <button
        type="button"
        onClick={parsePasted}
        disabled={!pasted.trim()}
        className="mt-2 rounded-full border border-[var(--surface-line)] px-4 py-1.5 text-sm disabled:opacity-60"
      >
        Parse results
      </button>

      {drafts && (
        <div className="mt-6">
          <Note>
            Review before importing — set a tier for each (there's no way for an outside AI to
            know AGErite's fit judgment), fix anything wrong, or remove a row entirely.
          </Note>
          <TableWrap>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr>
                  <th className={th}>Name</th>
                  <th className={th}>City</th>
                  <th className={th}>Phone</th>
                  <th className={th}>Email</th>
                  <th className={th}>Tier</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody>
                {drafts.map((r) => (
                  <tr key={r.key}>
                    <td className={td}>
                      <input
                        value={r.name}
                        onChange={(e) => updateDraft(r.key, { name: e.target.value })}
                        className={inputClass}
                      />
                    </td>
                    <td className={td}>
                      <input
                        value={r.city}
                        onChange={(e) => updateDraft(r.key, { city: e.target.value })}
                        className={inputClass}
                      />
                    </td>
                    <td className={td}>{r.phone ?? '—'}</td>
                    <td className={td}>{r.email ?? '—'}</td>
                    <td className={td}>
                      <select
                        value={r.tier}
                        onChange={(e) => updateDraft(r.key, { tier: e.target.value as DraftRow['tier'] })}
                        className={inputClass}
                      >
                        <option value="T1">T1</option>
                        <option value="T2">T2</option>
                        <option value="T3">T3</option>
                      </select>
                    </td>
                    <td className={td}>
                      <button
                        type="button"
                        onClick={() => removeDraft(r.key)}
                        className="rounded-full border border-[var(--surface-line)] px-3 py-1 text-xs"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <button
            type="button"
            disabled={drafts.length === 0 || importing}
            onClick={handleImport}
            className="mt-4 rounded-full bg-[var(--surface-teal)] px-5 py-2 text-sm text-white disabled:opacity-60"
          >
            {importing ? 'Importing…' : `Import ${drafts.length} lead${drafts.length === 1 ? '' : 's'}`}
          </button>
        </div>
      )}

      {importMessage && <p className="mt-4 font-mono text-sm text-[var(--surface-teal)]">{importMessage}</p>}
    </div>
  )
}
