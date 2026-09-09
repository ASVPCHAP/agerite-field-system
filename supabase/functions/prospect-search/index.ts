// Read-only prospect search for rep-facing agents (see PROSPECTING_SPEC.md).
// GET only, no write path exists in this file at all — that's what makes
// "read-only" a structural guarantee rather than a policy someone could
// accidentally break. Auth is a single shared bearer secret since there is
// no per-rep write to attribute; wiring that secret into a rep's Kylon
// agent is a separate, later task, not this function's concern.
//
// Required secret (set via `supabase secrets set` or the dashboard — never
// commit it): PROSPECT_SEARCH_KEY.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by
// the edge runtime — nothing to set for those.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const VALID_TIERS = ['T1', 'T2', 'T3']
const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function parseLimit(raw: string | null): number {
  const n = raw ? Number(raw) : DEFAULT_LIMIT
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT
  return Math.min(n, MAX_LIMIT)
}

interface ClinicRow {
  id: string
  name: string
  city: string
  segment: string
  tier: string
  cluster: string
  website: string | null
  stage: string
  next_step: string | null
  owner_rep_id: string | null
  last_touch_at: string | null
  reps: { name: string } | null
}

function toResult(row: ClinicRow) {
  const ownership = row.owner_rep_id
    ? { status: 'owned' as const, owner_name: row.reps?.name ?? null, last_touch_at: row.last_touch_at }
    : { status: 'unowned' as const }

  return {
    id: row.id,
    name: row.name,
    city: row.city,
    segment: row.segment,
    tier: row.tier,
    cluster: row.cluster,
    website: row.website,
    stage: row.stage,
    next_step: row.next_step,
    ownership,
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'GET') {
    return jsonResponse({ error: 'GET only' }, 405)
  }

  const expectedKey = Deno.env.get('PROSPECT_SEARCH_KEY')
  const authHeader = req.headers.get('Authorization') ?? ''
  const providedKey = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : ''
  if (!expectedKey || !providedKey || providedKey !== expectedKey) {
    return jsonResponse({ error: 'Missing or invalid bearer token' }, 401)
  }

  const url = new URL(req.url)
  const tier = url.searchParams.get('tier')
  if (tier && !VALID_TIERS.includes(tier)) {
    return jsonResponse({ error: `tier must be one of ${VALID_TIERS.join(', ')}` }, 400)
  }
  const segment = url.searchParams.get('segment')
  const cluster = url.searchParams.get('cluster')
  const city = url.searchParams.get('city')
  const q = url.searchParams.get('q')
  const limit = parseLimit(url.searchParams.get('limit'))

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    let query = supabase
      .from('clinics')
      .select('id, name, city, segment, tier, cluster, website, stage, next_step, owner_rep_id, last_touch_at, reps(name)')
      .order('id')
      .limit(limit)

    if (tier) query = query.eq('tier', tier)
    if (cluster) query = query.eq('cluster', cluster)
    if (city) query = query.eq('city', city)
    if (segment) query = query.ilike('segment', `%${segment}%`)
    if (q) query = query.ilike('name', `%${q}%`)

    const { data, error } = await query.returns<ClinicRow[]>()
    if (error) throw error

    return jsonResponse({ results: (data ?? []).map(toResult), count: data?.length ?? 0 })
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
