import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import type { Clinic, Product, ProductChangeLog } from '../../data/schema'
import { listClinics, listProductChangeLog, listRefills, listRepProducts } from '../../data/store'
import { SectionHeading, StatTile, TableWrap, td, tdMono, th } from '../../components/ui'

export function Dashboard() {
  const { currentRep } = useAuth()
  const [clinics, setClinics] = useState<Clinic[] | null>(null)
  const [dueSoonCount, setDueSoonCount] = useState(0)
  const [lapsedCount, setLapsedCount] = useState(0)
  const [log, setLog] = useState<ProductChangeLog[] | null>(null)
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    listClinics().then(setClinics)
    listProductChangeLog().then(setLog)
    listRepProducts().then(setProducts)
    const today = new Date()
    listRefills(today).then((refills) => {
      setDueSoonCount(refills.filter((r) => r.status === 'due' || r.status === 'due_soon').length)
      setLapsedCount(refills.filter((r) => r.status === 'lapsed').length)
    })
  }, [])

  const productById = new Map(products.map((p) => [p.id, p]))
  const ownedByYou = (clinics ?? []).filter((c) => c.owner_rep_id === currentRep?.id).length

  return (
    <div>
      <SectionHeading>Dashboard</SectionHeading>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile value={clinics?.length ?? '—'} label="Clinics in pipeline" />
        <StatTile value={ownedByYou} label="Owned by you" />
        <StatTile value={dueSoonCount} label="Refills due soon" />
        <StatTile value={lapsedCount} label="Lapsed refills" />
      </div>

      <h3 className="mt-10 mb-2 font-display text-lg font-semibold">What changed</h3>
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
    </div>
  )
}
