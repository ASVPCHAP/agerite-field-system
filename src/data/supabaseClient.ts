import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(url && anonKey)

// Only constructed when both env vars are present — see store.ts, which
// falls back to the mock store otherwise so the app still runs for anyone
// who clones this repo without a Supabase project of their own.
//
// flowType: 'implicit' (not the current supabase-js default, 'pkce') is
// deliberate. PKCE ties the magic-link click to the same browser that
// requested it (a stored code_verifier has to match) — a rep requesting
// on a laptop and opening email on their phone is a completely normal
// pattern that would fail with PKCE. Implicit puts the session token
// directly in the link itself, so it works from any device. Trade-off:
// weaker against a narrow attack (someone else obtaining the link URL
// before the rep clicks it) — an acceptable trade for a handful of known
// internal reps, revisit if this app ever has a broader/less-trusted
// user base.
export const supabase = supabaseConfigured
  ? createClient<Database>(url, anonKey, { auth: { flowType: 'implicit' } })
  : null
