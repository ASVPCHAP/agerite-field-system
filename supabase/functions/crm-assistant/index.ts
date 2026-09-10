// Leadership-only "ask about sales numbers/reports" assistant (CRM_SPEC.md
// addendum). Unlike prospect-search (a shared bearer secret for an
// external caller), this runs inside the already-authenticated portal —
// it verifies the caller's real Supabase session and their reps.is_leadership
// flag, the same identity-derivation pattern used by every DB-side
// mutation since phase1_8, just implemented here because this function
// also needs to call an external API (OpenRouter), not just Postgres.
//
// Required secrets: OPENROUTER_API_KEY.
// Optional: OPENROUTER_MODEL (default below) — OpenRouter's free-tier
// catalog changes over time; verify this is still current when setting up
// the key. SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
// are injected automatically by the edge runtime.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// OpenRouter's own "Free Models Router" — auto-routes across whichever
// free-tier models are currently live, rather than pinning to one
// specific vendor's free slug (which is exactly what broke: this used to
// default to meta-llama/llama-3.1-8b-instruct:free until OpenRouter
// discontinued that model's free tier). Confirmed $0/$0 pricing via
// GET https://openrouter.ai/api/v1/models — re-check there if this ever
// needs revisiting.
const DEFAULT_MODEL = 'openrouter/free'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function buildContext(admin: ReturnType<typeof createClient>): Promise<string> {
  const [leads, clinics, refills, reps, products, changeLog] = await Promise.all([
    admin.from('leads').select('name, city, segment, tier, cluster, status'),
    admin.from('clinics').select('name, city, tier, cluster, stage, owner_rep_id, last_touch_at'),
    admin.from('refills_with_status').select('clinic_id, status'),
    admin.from('reps').select('id, name, territory, cert_status, role'),
    admin.from('products').select('name, status').neq('status', 'archived'),
    admin.from('product_change_log').select('field_changed, changed_by, changed_at').order('changed_at', { ascending: false }).limit(15),
  ])

  const repName = new Map((reps.data ?? []).map((r) => [r.id, r.name]))
  const lines: string[] = []

  lines.push(`REPS (${reps.data?.length ?? 0}):`)
  for (const r of reps.data ?? []) lines.push(`- ${r.name} · ${r.territory} · cert: ${r.cert_status} · role: ${r.role}`)

  lines.push(`\nLEADS (${leads.data?.length ?? 0}, raw prospects not yet promoted):`)
  for (const l of leads.data ?? []) lines.push(`- ${l.name} · ${l.city} · ${l.segment} · tier ${l.tier} · ${l.cluster} · ${l.status}`)

  lines.push(`\nCLINICS / PIPELINE (${clinics.data?.length ?? 0}):`)
  for (const c of clinics.data ?? []) {
    const owner = c.owner_rep_id ? repName.get(c.owner_rep_id) ?? 'unknown' : 'unowned'
    lines.push(`- ${c.name} · ${c.city} · tier ${c.tier} · ${c.cluster} · stage: ${c.stage} · owner: ${owner} · last touch: ${c.last_touch_at ?? 'never'}`)
  }

  const refillCounts: Record<string, number> = {}
  for (const r of refills.data ?? []) refillCounts[r.status] = (refillCounts[r.status] ?? 0) + 1
  lines.push(`\nREFILLS BY STATUS: ${JSON.stringify(refillCounts)}`)

  lines.push(`\nPRODUCTS (${products.data?.length ?? 0} active/pending, excludes archived):`)
  for (const p of products.data ?? []) lines.push(`- ${p.name}: ${p.status}`)

  lines.push(`\nRECENT PRODUCT CHANGES:`)
  for (const c of changeLog.data ?? []) lines.push(`- ${c.field_changed} changed by ${c.changed_by} on ${c.changed_at}`)

  return lines.join('\n')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'POST only' }, 405)
  }

  try {
    const { question } = await req.json()
    if (!question || typeof question !== 'string') {
      return jsonResponse({ error: 'question (string) is required' }, 400)
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user?.email) {
      return jsonResponse({ error: 'Not authenticated' }, 401)
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: rep, error: repError } = await admin
      .from('reps')
      .select('name, is_leadership')
      .eq('email', userData.user.email)
      .maybeSingle()
    if (repError) throw repError
    if (!rep?.is_leadership) {
      return jsonResponse({ error: 'Not authorized for the sales-analytics assistant' }, 403)
    }

    const apiKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!apiKey) {
      return jsonResponse({ error: 'OPENROUTER_API_KEY is not configured' }, 500)
    }
    const model = Deno.env.get('OPENROUTER_MODEL') || DEFAULT_MODEL

    const context = await buildContext(admin)
    const systemPrompt = `You are a sales-operations assistant for AGErite Pharmacy's field system. Answer ${rep.name}'s question using ONLY the data below — don't invent numbers. If the data doesn't cover the question, say so plainly rather than guessing.\n\n${context}`

    const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
      }),
    })
    if (!openRouterRes.ok) {
      const detail = await openRouterRes.text()
      throw new Error(`OpenRouter request failed (${openRouterRes.status}): ${detail}`)
    }
    const completion = await openRouterRes.json()
    const answer = completion.choices?.[0]?.message?.content
    if (!answer) throw new Error('OpenRouter returned no answer')

    return jsonResponse({ answer })
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
