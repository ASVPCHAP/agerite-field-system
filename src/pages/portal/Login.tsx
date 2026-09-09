import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { supabaseConfigured } from '../../data/supabaseClient'
import { Note } from '../../components/ui'

export function Login() {
  const { currentRep, requestMagicLink } = useAuth()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (currentRep) return <Navigate to="/portal/dashboard" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSending(true)
    setError(null)
    try {
      const result = await requestMagicLink(email)
      if (!result.ok) {
        setError(result.error)
      } else if (!result.immediate) {
        setSent(true)
      }
      // immediate:true (mock mode) needs no further action here — currentRep
      // is already set, and the guard above navigates on the next render.
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      data-surface="portal"
      className="flex min-h-screen items-center justify-center bg-[var(--surface-bg)] px-6 text-[var(--surface-ink)]"
    >
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-2xl font-semibold">Field portal sign-in</h1>
        <div className="mt-2">
          <Note>
            {supabaseConfigured
              ? 'Enter your rep email — we’ll send a sign-in link.'
              : 'Prototype mode (no Supabase project configured): enter a seeded demo email — e.g. marcus@integrativeconcepts.com or cindy@ageritepharmacy.com — to sign in immediately, no real email sent.'}
          </Note>
        </div>

        {sent ? (
          <p className="mt-6 text-sm text-[var(--surface-ink-soft)]">
            Check <span className="font-mono text-[var(--surface-ink)]">{email}</span> for a sign-in link.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6">
            <input
              type="email"
              required
              autoFocus
              placeholder="you@integrativeconcepts.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-2 text-center text-sm"
            />
            {error && <p className="mt-3 text-sm text-[var(--surface-vermilion)]">{error}</p>}
            <button
              type="submit"
              disabled={!email || sending}
              className="mt-4 w-full rounded-full bg-[var(--surface-teal)] px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {sending ? 'Sending…' : 'Send magic link & sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
