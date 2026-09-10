import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Product, ProductCategory } from '../../data/schema'
import { listRepProducts } from '../../data/store'
import { Card, Note, Pill, SectionHeading, TableWrap, td, tdMono, th } from '../../components/ui'

function money(n: number | null): string {
  return n == null ? '—' : `$${n}`
}

const CATEGORY_LABEL: Record<ProductCategory, string> = {
  peptide: 'Peptide therapy',
  'weight-loss': 'Weight loss',
  hormone: 'Hormone therapy',
  topical: 'Topicals',
  troche: 'Troches',
}

type Tab = 'pricing' | 'services' | 'documents' | 'forms'

const TABS: { key: Tab; label: string }[] = [
  { key: 'pricing', label: 'Pricing & protocols' },
  { key: 'services', label: 'Service areas' },
  { key: 'documents', label: 'Printable documents' },
  { key: 'forms', label: 'Order & other forms' },
]

// Real leave-behinds/clinical references from AGErite (2026-09-10 drop).
// Files live in public/documents — see CRM_SPEC.md section 11.
const DOCUMENTS: { file: string; title: string; description: string }[] = [
  {
    file: 'peptide-prescribing-price-guide.pdf',
    title: 'Compounded Peptide Prescribing & Price Guide',
    description: 'Full clinical reference for licensed providers — injectable, topical, and sublingual formulations.',
  },
  {
    file: 'peptides-topicals-injections.pdf',
    title: 'Peptides, Topicals & Injections',
    description: 'Product reference across peptide categories.',
  },
  {
    file: 'hormones-price-sheet.pdf',
    title: 'Hormones Price Sheet',
    description: 'Transdermal, troche, capsule, and injectable hormone pricing.',
  },
  {
    file: 'glp1-dosing-cards.pdf',
    title: 'GLP-1 Dosing Cards',
    description: 'One-page dosing reference for semaglutide/tirzepatide.',
  },
  {
    file: 'glp-vials-prefilled-syringes.pdf',
    title: 'GLP Vials & Prefilled Syringes',
    description: 'Available vial sizes and prefilled syringe options.',
  },
  {
    file: 'escribe-instructions.pdf',
    title: 'eScribe Ordering Instructions',
    description: 'How a provider orders compounded semaglutide/tirzepatide through eScribe.',
  },
  {
    file: 'reasons-to-compound-tirz-sema.pdf',
    title: 'Reasons to Compound Tirzepatide & Semaglutide',
    description: 'Talking points for a provider pitch.',
  },
]

// AGErite's real ordering process runs through these Jotform forms today —
// this doesn't replace them, just puts them one click away instead of
// however reps were finding them before. See CRM_SPEC.md section 11.
const ORDER_FORMS: { title: string; url: string; description: string }[] = [
  {
    title: 'New Client Setup Form & Provider Packet',
    url: 'https://form.jotform.com/252465378737167',
    description: "Send this once a clinic is ready to become an AGErite provider.",
  },
  {
    title: 'Weight Loss Order Form',
    url: 'https://form.jotform.com/262000912218141',
    description: 'For semaglutide/tirzepatide and related weight-loss orders.',
  },
  {
    title: 'Hormone Order Form',
    url: 'https://form.jotform.com/250786599534171',
    description: 'For transdermal, troche, capsule, and injectable hormone orders.',
  },
  {
    title: 'Injectables Order Form',
    url: 'https://form.jotform.com/251058702264150',
    description: 'For peptide and other injectable orders.',
  },
]

const OTHER_LINKS: { title: string; url: string | null; description: string }[] = [
  {
    title: 'Commission Tracker',
    url: 'https://form.jotform.com/251673945919068',
    description: 'Log every clinic/med spa you visit or meet with here — this drives commission credit, separate from this portal\'s activity log.',
  },
  {
    title: 'Provider/Clinic Tracker (legacy)',
    url: null,
    description: 'The pre-portal way to check whether another rep already has a clinic. This portal\'s Pipeline does the same job now — first rep to log a touch owns it — check there first. No link on file yet for this one.',
  },
  {
    title: 'AGErite Pharmacy website',
    url: 'https://ageritepharmacy.com/',
    description: '',
  },
]

const linkClass =
  'inline-flex min-h-11 items-center rounded-full border border-[var(--surface-line)] px-4 py-2 text-sm md:min-h-0 md:py-1.5'

export function Knowledge() {
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [tab, setTab] = useState<Tab>(() => {
    const fromUrl = searchParams.get('tab')
    return TABS.some((t) => t.key === fromUrl) ? (fromUrl as Tab) : 'pricing'
  })

  useEffect(() => {
    listRepProducts().then(setProducts)
  }, [])

  const byCategory = useMemo(() => {
    const groups = new Map<ProductCategory, Product[]>()
    for (const p of products) {
      const list = groups.get(p.category) ?? []
      list.push(p)
      groups.set(p.category, list)
    }
    return groups
  }, [products])

  return (
    <div>
      <SectionHeading>AGErite resources</SectionHeading>
      <div className="mt-2">
        <Note>Everything a rep needs in the field — current pricing, what AGErite can service, printable documents, and the forms that actually place an order.</Note>
      </div>

      <nav className="mt-4 flex flex-wrap gap-1 border-b border-[var(--surface-line)]">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-3 py-2.5 text-sm ${
              tab === t.key
                ? 'border-[var(--surface-teal)] text-[var(--surface-ink)]'
                : 'border-transparent text-[var(--surface-ink-soft)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'pricing' && (
        <div className="mt-6">
          <Note>
            Includes internal rep notes and genuinely-visible pending-review rows flagged "do not
            quote."
          </Note>
          <TableWrap>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr>
                  <th className={th}>Product</th>
                  <th className={th}>Category</th>
                  <th className={th}>Concentration</th>
                  <th className={th}>5mL</th>
                  <th className={th}>10mL</th>
                  <th className={th}>Protocol</th>
                  <th className={th}>Status</th>
                  <th className={th}>Rep note</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const pending = p.status === 'pending_review'
                  return (
                    <tr key={p.id} className={pending ? 'opacity-80' : ''}>
                      <td className={td}>{p.name}</td>
                      <td className={td}>{CATEGORY_LABEL[p.category]}</td>
                      <td className={tdMono}>{p.concentration}</td>
                      <td className={tdMono}>{money(p.price_5ml)}</td>
                      <td className={tdMono}>{money(p.price_10ml)}</td>
                      <td className={td}>{p.protocol_duration}</td>
                      <td className={td}>
                        <Pill tone={pending ? 'review' : 'current'}>
                          {pending ? 'Pending review — do not quote' : 'Current'}
                        </Pill>
                      </td>
                      <td className={td}>{p.rep_note ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </TableWrap>
        </div>
      )}

      {tab === 'services' && (
        <div className="mt-6">
          <Note>What AGErite can service, at a glance — grouped by category so you can answer "do you do X" without opening the pricing table.</Note>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[...byCategory.entries()].map(([category, items]) => (
              <Card key={category}>
                <h3 className="font-display text-lg font-semibold">{CATEGORY_LABEL[category]}</h3>
                <ul className="mt-2 flex flex-col gap-1 text-sm text-[var(--surface-ink-soft)]">
                  {items.map((p) => (
                    <li key={p.id}>{p.name}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div className="mt-6">
          <Note>Clinical references and leave-behinds — open to view, or share the link with a provider.</Note>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {DOCUMENTS.map((doc) => (
              <a
                key={doc.file}
                href={`/documents/${doc.file}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card className="h-full transition-colors hover:border-[var(--surface-teal)]">
                  <h3 className="font-display text-base font-semibold">{doc.title}</h3>
                  <p className="mt-1 text-sm text-[var(--surface-ink-soft)]">{doc.description}</p>
                  <p className="mt-2 font-mono text-[0.68rem] tracking-wide text-[var(--surface-teal)] uppercase">
                    Open PDF ↗
                  </p>
                </Card>
              </a>
            ))}
          </div>
        </div>
      )}

      {tab === 'forms' && (
        <div className="mt-6">
          <Note>
            AGErite's ordering process runs through these forms today — this portal doesn't
            replace them yet (see CRM_SPEC.md section 11 for what changes once SiCompounding is
            wired up).
          </Note>

          <h3 className="mt-6 font-display text-base font-semibold">Place an order</h3>
          <div className="mt-3 flex flex-col gap-3">
            {ORDER_FORMS.map((f) => (
              <Card key={f.url} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold">{f.title}</h4>
                  <p className="mt-0.5 text-sm text-[var(--surface-ink-soft)]">{f.description}</p>
                </div>
                <a href={f.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  Open form ↗
                </a>
              </Card>
            ))}
          </div>

          <h3 className="mt-8 font-display text-base font-semibold">Other AGErite links</h3>
          <div className="mt-3 flex flex-col gap-3">
            {OTHER_LINKS.map((l) => (
              <Card key={l.title} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold">{l.title}</h4>
                  {l.description && <p className="mt-0.5 text-sm text-[var(--surface-ink-soft)]">{l.description}</p>}
                </div>
                {l.url ? (
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    Open ↗
                  </a>
                ) : (
                  <Pill tone="open">No link on file</Pill>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
