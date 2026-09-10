import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Product, ProductCategory } from '../../data/schema'
import { listRepProducts } from '../../data/store'
import { calculateCommission } from '../../data/commission'
import { Card, Note, Pill, SectionHeading, TableWrap, td, tdMono, th } from '../../components/ui'

function money(n: number | null): string {
  return n == null ? '—' : `$${n}`
}

function dollars(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const CATEGORY_LABEL: Record<ProductCategory, string> = {
  peptide: 'Peptide therapy',
  'weight-loss': 'Weight loss',
  hormone: 'Hormone therapy',
  topical: 'Topicals',
  troche: 'Troches',
  injection: 'IV & injectable additives',
}

type Tab = 'pricing' | 'services' | 'documents' | 'forms' | 'commission'

const TABS: { key: Tab; label: string }[] = [
  { key: 'pricing', label: 'Pricing & protocols' },
  { key: 'services', label: 'Service areas' },
  { key: 'documents', label: 'Printable documents' },
  { key: 'forms', label: 'Order & other forms' },
  { key: 'commission', label: 'Commission calculator' },
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
  const [priceCategory, setPriceCategory] = useState('')
  const [priceConcentration, setPriceConcentration] = useState('')
  const [grossSales, setGrossSales] = useState('')
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

  const priceCategoryOptions = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort(),
    [products],
  )
  const priceConcentrationOptions = useMemo(() => {
    const scoped = priceCategory ? products.filter((p) => p.category === priceCategory) : products
    return [...new Set(scoped.map((p) => p.concentration))].sort()
  }, [products, priceCategory])
  const filteredProducts = products.filter(
    (p) =>
      (!priceCategory || p.category === priceCategory) &&
      (!priceConcentration || p.concentration === priceConcentration),
  )

  const salesNumber = Number(grossSales)
  const commission = grossSales.trim() !== '' && !Number.isNaN(salesNumber) ? calculateCommission(salesNumber) : null

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

          <div className="mt-4 flex flex-wrap gap-3">
            <select
              value={priceCategory}
              onChange={(e) => {
                setPriceCategory(e.target.value)
                setPriceConcentration('')
              }}
              className="rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-1.5 text-sm"
            >
              <option value="">All categories</option>
              {priceCategoryOptions.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
            <select
              value={priceConcentration}
              onChange={(e) => setPriceConcentration(e.target.value)}
              className="max-w-[16rem] rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-1.5 text-sm"
            >
              <option value="">All concentrations</option>
              {priceConcentrationOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <TableWrap>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr>
                  <th className={th}>Product</th>
                  <th className={th}>Category</th>
                  <th className={th}>Concentration</th>
                  <th className={th}>Price</th>
                  <th className={th}>Protocol</th>
                  <th className={th}>Status</th>
                  <th className={th}>Rep note</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const pending = p.status === 'pending_review'
                  return (
                    <tr key={p.id} className={pending ? 'opacity-80' : ''}>
                      <td className={`${td} max-w-[12rem]`}>{p.name}</td>
                      <td className={td}>{CATEGORY_LABEL[p.category]}</td>
                      <td className={`${td} max-w-[14rem]`}>{p.concentration}</td>
                      <td className={`${td} max-w-[10rem]`}>
                        {p.price_5ml != null && (
                          <div>
                            <span className="font-mono">{money(p.price_5ml)}</span>{' '}
                            <span className="text-[var(--surface-ink-soft)]">{p.price_5ml_label ?? '5 mL'}</span>
                          </div>
                        )}
                        {p.price_10ml != null && (
                          <div>
                            <span className="font-mono">{money(p.price_10ml)}</span>{' '}
                            <span className="text-[var(--surface-ink-soft)]">{p.price_10ml_label ?? '10 mL'}</span>
                          </div>
                        )}
                        {p.price_5ml == null && p.price_10ml == null && '—'}
                      </td>
                      <td className={`${td} max-w-[12rem]`}>{p.protocol_duration}</td>
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

      {tab === 'commission' && (
        <div className="mt-6 max-w-xl">
          <Note>
            Graduated (bracket) commission on your monthly Gross Sales, per the 1099 Sales
            Representative Commission Plan (GLP-1 & Wellness Program Outreach, effective
            2026-07-14) — same idea as a tax bracket, only the portion of sales inside each tier
            is paid at that tier's rate. Tiers reset every calendar month.
          </Note>

          <label className="mt-6 block font-mono text-xs text-[var(--surface-ink-soft)]">
            Gross sales this month
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="e.g. 22000"
              value={grossSales}
              onChange={(e) => setGrossSales(e.target.value)}
              className="mt-1 block w-full rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-2 text-sm text-[var(--surface-ink)]"
            />
          </label>

          {commission && commission.rows.length > 0 ? (
            <TableWrap>
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr>
                    <th className={th}>Bracket</th>
                    <th className={th}>Rate</th>
                    <th className={th}>Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {commission.rows.map((r) => (
                    <tr key={r.label}>
                      <td className={td}>{r.label}</td>
                      <td className={tdMono}>{(r.rate * 100).toFixed(0)}%</td>
                      <td className={tdMono}>{dollars(r.commission)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className={td}>
                      <strong>Total commission</strong>
                    </td>
                    <td className={td} />
                    <td className={tdMono}>
                      <strong>{dollars(commission.total)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </TableWrap>
          ) : (
            <div className="mt-4">
              <Note>Enter your gross sales for the month to see the breakdown.</Note>
            </div>
          )}

          <p className="mt-4 text-xs text-[var(--surface-ink-soft)]">
            Gross Sales = total cash-pay orders you're credited with, before refunds/returns.
            Payments issue on or about the 7th of the following month. This is an estimate, not a
            payroll record.
          </p>
        </div>
      )}
    </div>
  )
}
