import { useEffect, useMemo, useState } from 'react'
import type { Clinic, Product, RefillStatus, RefillWithStatus } from '../../data/schema'
import { listClinics, listRefills, listRepProducts } from '../../data/store'
import { Pill, SectionHeading, StatTile, TableWrap, td, tdMono, th } from '../../components/ui'

const statusTone: Record<RefillStatus, 'current' | 'review' | 'fail'> = {
  on_protocol: 'current',
  due_soon: 'review',
  due: 'review',
  lapsed: 'fail',
}

export function Refills() {
  const [refills, setRefills] = useState<RefillWithStatus[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    const today = new Date()
    listRefills(today).then(setRefills)
    listClinics().then(setClinics)
    listRepProducts().then(setProducts)
  }, [])

  const clinicById = useMemo(() => new Map(clinics.map((c) => [c.id, c])), [clinics])
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  const counts = refills.reduce(
    (acc, r) => ({ ...acc, [r.status]: acc[r.status] + 1 }),
    { on_protocol: 0, due_soon: 0, due: 0, lapsed: 0 } as Record<RefillStatus, number>,
  )

  return (
    <div>
      <SectionHeading>Refills</SectionHeading>
      <div className="mt-4 mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile value={counts.due} label="Due (≤7d)" />
        <StatTile value={counts.due_soon} label="Due soon (8–14d)" />
        <StatTile value={counts.lapsed} label="Lapsed" />
        <StatTile value={counts.on_protocol} label="On protocol" />
      </div>

      <TableWrap>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>Patient ref</th>
              <th className={th}>Clinic</th>
              <th className={th}>Product</th>
              <th className={th}>Started</th>
              <th className={th}>Runs out</th>
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {refills.map((r) => (
              <tr key={r.id}>
                <td className={tdMono}>{r.patient_ref}</td>
                <td className={td}>{clinicById.get(r.clinic_id)?.name ?? '—'}</td>
                <td className={td}>{productById.get(r.product_id)?.name ?? '—'}</td>
                <td className={tdMono}>{r.started_at}</td>
                <td className={tdMono}>{r.runs_out_at}</td>
                <td className={td}>
                  <Pill tone={statusTone[r.status]}>{r.status.replace('_', ' ')}</Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </div>
  )
}
