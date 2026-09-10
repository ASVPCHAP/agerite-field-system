import { useEffect, useMemo, useState } from 'react'
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

type Tab = 'pricing' | 'services' | 'documents'

const TABS: { key: Tab; label: string }[] = [
  { key: 'pricing', label: 'Pricing & protocols' },
  { key: 'services', label: 'Service areas' },
  { key: 'documents', label: 'Printable documents' },
]

export function Knowledge() {
  const [products, setProducts] = useState<Product[]>([])
  const [tab, setTab] = useState<Tab>('pricing')

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
        <Note>Everything a rep needs in the field — current pricing, what AGErite can service, and printable documents for a clinic visit.</Note>
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
          <Card>
            <Note>
              No printable documents uploaded yet. This tab is the placeholder for pricing sheets,
              intake forms, and other leave-behinds Cindy/admin will add — nothing to build here
              until there's a real document to store.
            </Note>
          </Card>
        </div>
      )}
    </div>
  )
}
