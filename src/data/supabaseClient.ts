import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(url && anonKey)

// Only constructed when both env vars are present — see store.ts, which
// falls back to the mock store otherwise so the app still runs for anyone
// who clones this repo without a Supabase project of their own.
export const supabase = supabaseConfigured ? createClient<Database>(url, anonKey) : null
