import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import type { Rep } from '../../data/schema'
import { listRepsForLogin } from '../../data/store'
import { Note } from '../../components/ui'

export function Login() {
  const { currentRep, login } = useAuth()
  const [reps, setReps] = useState<Rep[]>([])
  const [selected, setSelected] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    listRepsForLogin().then((list) => {
      setReps(list)
      setSelected(list[0]?.id ?? '')
    })
  }, [])

  if (currentRep) return <Navigate to="/portal/dashboard" replace />

  return (
    <div
      data-surface="portal"
      className="flex min-h-screen items-center justify-center bg-[var(--surface-bg)] px-6 text-[var(--surface-ink)]"
    >
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-2xl font-semibold">Field portal sign-in</h1>
        <div className="mt-2">
          <Note>
            Prototype auth: pick a rep to simulate their session (mimics a magic-link email — no
            real link is sent).
          </Note>
        </div>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="mt-6 w-full rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-2 text-sm"
        >
          {reps.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.territory})
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!selected || sending}
          onClick={async () => {
            setSending(true)
            await login(selected)
          }}
          className="mt-4 w-full rounded-full bg-[var(--surface-teal)] px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {sending ? 'Signing in…' : 'Send magic link & sign in'}
        </button>
      </div>
    </div>
  )
}
