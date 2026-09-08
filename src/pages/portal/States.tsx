import { useEffect, useState } from 'react'
import type { LicensedState } from '../../data/schema'
import { listLicensedStates } from '../../data/store'
import { Pill, SectionHeading, TableWrap, td, tdMono, th } from '../../components/ui'

export function States() {
  const [states, setStates] = useState<LicensedState[]>([])

  useEffect(() => {
    listLicensedStates().then(setStates)
  }, [])

  return (
    <div>
      <SectionHeading>Licensed states</SectionHeading>
      <TableWrap>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr>
              <th className={th}>State</th>
              <th className={th}>Status</th>
              <th className={th}>Target quarter</th>
            </tr>
          </thead>
          <tbody>
            {states.map((s) => (
              <tr key={s.id}>
                <td className={td}>{s.state_name}</td>
                <td className={td}>
                  <Pill tone={s.status === 'confirmed' ? 'current' : 'review'}>{s.status}</Pill>
                </td>
                <td className={tdMono}>{s.target_quarter ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </div>
  )
}
