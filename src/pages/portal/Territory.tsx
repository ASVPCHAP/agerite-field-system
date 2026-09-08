import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import type { Clinic } from '../../data/schema'
import { listClinics, listClusters } from '../../data/store'
import { Pill, SectionHeading, TableWrap, td, th } from '../../components/ui'

export function Territory() {
  const { currentRep } = useAuth()
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [clusters, setClusters] = useState<string[]>([])
  const [cluster, setCluster] = useState('')
  const [tier, setTier] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    listClinics().then(setClinics)
    listClusters().then(setClusters)
  }, [])

  const filtered = useMemo(
    () =>
      clinics.filter(
        (c) =>
          (!cluster || c.cluster === cluster) &&
          (!tier || c.tier === tier) &&
          c.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [clinics, cluster, tier, search],
  )

  return (
    <div>
      <SectionHeading>Territory &amp; contacts</SectionHeading>

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={cluster}
          onChange={(e) => setCluster(e.target.value)}
          className="rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-1.5 text-sm"
        >
          <option value="">All clusters</option>
          {clusters.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          className="rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-1.5 text-sm"
        >
          <option value="">All tiers</option>
          <option value="T1">T1</option>
          <option value="T2">T2</option>
          <option value="T3">T3</option>
        </select>
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-1.5 text-sm"
        />
      </div>

      <TableWrap>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>City</th>
              <th className={th}>Cluster</th>
              <th className={th}>Tier</th>
              <th className={th}>Segment</th>
              <th className={th}>Ownership</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td className={td}>{c.name}</td>
                <td className={td}>{c.city}</td>
                <td className={td}>{c.cluster}</td>
                <td className={td}>{c.tier}</td>
                <td className={td}>{c.segment}</td>
                <td className={td}>
                  {!c.owner_rep_id ? (
                    <Pill tone="open">Open</Pill>
                  ) : c.owner_rep_id === currentRep?.id ? (
                    <Pill tone="current">Yours</Pill>
                  ) : (
                    <Pill tone="owned">Owned</Pill>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </div>
  )
}
