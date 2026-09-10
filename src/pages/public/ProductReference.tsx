import { useEffect, useMemo, useState } from 'react'
import { listPublicProducts, type PublicProduct } from '../../data/store'
import { Note, Pill, SectionHeading, TableWrap, td, tdMono, th } from '../../components/ui'

function money(n: number | null): string {
  return n == null ? '—' : `$${n}`
}

export function ProductReference() {
  const [products, setProducts] = useState<PublicProduct[] | null>(null)
  const [category, setCategory] = useState('')

  useEffect(() => {
    listPublicProducts().then(setProducts)
  }, [])

  const categories = useMemo(
    () => [...new Set((products ?? []).map((p) => p.category))],
    [products],
  )
  const filtered = (products ?? []).filter((p) => !category || p.category === category)

  return (
    <div>
      <SectionHeading>Product reference</SectionHeading>
      <div className="mt-2">
        <Note>Public view — internal rep notes and under-review detail are not shown here.</Note>
      </div>

      <label className="mt-6 block font-mono text-xs text-[var(--surface-ink-soft)]">
        Filter category
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1 block rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-1.5 text-sm text-[var(--surface-ink)]"
        >
          <option value="">All</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <TableWrap>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr>
              <th className={th}>Product</th>
              <th className={th}>Category</th>
              <th className={th}>Concentration</th>
              <th className={th}>Price A</th>
              <th className={th}>Price B</th>
              <th className={th}>Protocol</th>
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {products === null && (
              <tr>
                <td className={td} colSpan={7}>
                  Loading…
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className={p.under_review ? 'opacity-60' : ''}>
                <td className={td}>{p.name}</td>
                <td className={td}>{p.category}</td>
                <td className={tdMono}>{p.concentration}</td>
                <td className={tdMono}>
                  {money(p.price_5ml)}
                  {p.price_5ml != null && (
                    <div className="text-[var(--surface-ink-soft)]">{p.price_5ml_label ?? '5 mL'}</div>
                  )}
                </td>
                <td className={tdMono}>
                  {money(p.price_10ml)}
                  {p.price_10ml != null && (
                    <div className="text-[var(--surface-ink-soft)]">{p.price_10ml_label ?? '10 mL'}</div>
                  )}
                </td>
                <td className={td}>{p.protocol_duration}</td>
                <td className={td}>
                  <Pill tone={p.under_review ? 'review' : 'current'}>
                    {p.under_review ? 'Under review' : 'Current'}
                  </Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </div>
  )
}
