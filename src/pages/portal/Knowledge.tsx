import { useEffect, useState } from 'react'
import type { Product } from '../../data/schema'
import { listRepProducts } from '../../data/store'
import { Note, Pill, SectionHeading, TableWrap, td, tdMono, th } from '../../components/ui'

function money(n: number | null): string {
  return n == null ? '—' : `$${n}`
}

export function Knowledge() {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    listRepProducts().then(setProducts)
  }, [])

  return (
    <div>
      <SectionHeading>Knowledge base (rep view)</SectionHeading>
      <div className="mt-2">
        <Note>
          Includes internal rep notes and genuinely-visible pending-review rows flagged "do not
          quote."
        </Note>
      </div>

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
                  <td className={td}>{p.category}</td>
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
  )
}
