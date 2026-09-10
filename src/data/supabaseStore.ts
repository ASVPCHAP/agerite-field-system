// Real data-access layer, backed by the Supabase Postgres project.
// Same exported surface as mockStore.ts by design — src/data/store.ts picks
// one or the other, and nothing else in the app knows which.
//
// The two pieces of logic the spec calls out as critical (approval gate,
// clinic ownership locking) live in the database itself now, not here:
// public_products/refills_with_status are views, and
// log_clinic_contact/submit_certification_attempt are atomic Postgres
// functions (see the migrations under supabase/migrations). This module
// just calls them.

import type {
  CertificationAttempt,
  CertificationModule,
  CertificationQuestion,
  Clinic,
  Lead,
  LicensedState,
  Product,
  ProductChangeLog,
  RefillStatus,
  RefillWithStatus,
  Rep,
} from './schema'
import type {
  PublicProduct,
  LogContactResult,
  MagicLinkResult,
  NewLeadInput,
  ProductFormInput,
  SheetSyncResult,
} from './storeTypes'
import { supabase } from './supabaseClient'

// Matches the SQL slugify() used server-side for products/clinics — this
// is the one client-generated id in the app (createLeads is a plain
// insert, not an RPC, so nothing generates it server-side).
function slugifyClient(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function db() {
  if (!supabase) throw new Error('Supabase is not configured (missing VITE_SUPABASE_URL/ANON_KEY)')
  return supabase
}

function mapCertStatus(status: string): Rep['cert_status'] {
  return status as Rep['cert_status']
}

function mapRep(row: {
  id: string
  name: string
  email: string
  territory: string
  hire_date: string
  cert_status: string
  role: string
}): Rep {
  return { ...row, cert_status: mapCertStatus(row.cert_status), role: row.role as Rep['role'] }
}

// ---------------------------------------------------------------------------
// Auth — real Supabase Auth email magic-link. Session persistence and the
// redirect round-trip are handled by the supabase-js client itself; this
// module's job is just resolving "who is the authenticated session, if
// any" down to a reps row, by verified email — never by a client-supplied
// id. See supabase/migrations/..._phase1_8_real_auth_hardening.sql for the
// server-side half (RPCs derive the same way, independently).
// ---------------------------------------------------------------------------

export async function requestMagicLink(email: string): Promise<MagicLinkResult> {
  const { error } = await db().auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: `${window.location.origin}/portal/login` },
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, immediate: false }
}

/** Fires on every Supabase auth event (sign-in completing after the
 *  magic-link redirect, sign-out, token refresh) — this is what actually
 *  catches the session appearing, since it lands asynchronously after the
 *  redirect rather than being available at initial mount. */
export function subscribeAuth(onChange: (rep: Rep | null) => void): () => void {
  const { data } = db().auth.onAuthStateChange(async () => {
    onChange(await getCurrentRep())
  })
  return () => data.subscription.unsubscribe()
}

export async function logout(): Promise<void> {
  await db().auth.signOut()
}

export async function getCurrentRep(): Promise<Rep | null> {
  const { data: userData, error: userError } = await db().auth.getUser()
  if (userError || !userData.user?.email) return null
  const { data, error } = await db().from('reps').select('*').eq('email', userData.user.email).maybeSingle()
  if (error) throw error
  return data ? mapRep(data) : null
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function listPublicProducts(): Promise<PublicProduct[]> {
  const { data, error } = await db().from('public_products').select('*').order('id')
  if (error) throw error
  return data.map((p) => ({
    id: p.id!,
    name: p.name!,
    category: p.category as Product['category'],
    concentration: p.concentration!,
    price_5ml: p.price_5ml,
    price_10ml: p.price_10ml,
    protocol_duration: p.protocol_duration!,
    status: p.status as Product['status'],
    version: p.version!,
    reviewed_by: p.reviewed_by,
    reviewed_at: p.reviewed_at,
    under_review: Boolean(p.under_review),
  }))
}

export async function listRepProducts(): Promise<Product[]> {
  const { data, error } = await db().from('products').select('*').neq('status', 'archived').order('id')
  if (error) throw error
  return data as Product[]
}

export async function listPendingReview(): Promise<Product[]> {
  const { data, error } = await db().from('products').select('*').eq('status', 'pending_review').order('id')
  if (error) throw error
  return data as Product[]
}

export async function listProductChangeLog(): Promise<ProductChangeLog[]> {
  const { data, error } = await db().from('product_change_log').select('*').order('changed_at', { ascending: false })
  if (error) throw error
  return data
}

/** "Manage Products" form target — calls the same upsert_product() Postgres
 *  function used everywhere a product gets written, so the diff/change-log
 *  behavior is identical to the Sheet sync.
 *  _changedBy is kept for interface parity with mockStore.ts — the real
 *  backend now derives changed_by from the authenticated session (and
 *  requires role='admin') and ignores any client-supplied value. See
 *  upsert_product in the phase1_8 migration. */
export async function upsertProduct(input: ProductFormInput, _changedBy: string): Promise<Product> {
  // The generated Args type below doesn't mark these params nullable even
  // though the Postgres function (upsert_product, migration
  // phase1_6_upsert_product.sql) genuinely accepts and relies on null for
  // all four — a new product (null p_id), no 10mL size, no rep note.
  // Casting documents that gap rather than papering over it with `any`.
  const { data, error } = await db().rpc('upsert_product', {
    p_id: (input.id ?? null) as string,
    p_name: input.name,
    p_category: input.category,
    p_concentration: input.concentration,
    p_price_5ml: input.price_5ml as number,
    p_price_10ml: input.price_10ml as number,
    p_protocol_duration: input.protocol_duration,
    p_status: input.status,
    p_rep_note: input.rep_note as string,
  })
  if (error) throw error
  return data as unknown as Product
}

// ---------------------------------------------------------------------------
// Clinics / pipeline — ownership locking via the log_clinic_contact() RPC.
// ---------------------------------------------------------------------------

export async function listClinics(): Promise<Clinic[]> {
  const { data, error } = await db().from('clinics').select('*').order('name')
  if (error) throw error
  return data as Clinic[]
}

// _repId is kept for interface parity with mockStore.ts (which has no
// server session to derive it from) — the real backend now resolves the
// acting rep from the caller's authenticated email, server-side, and
// ignores any client-supplied id. See log_clinic_contact in the phase1_8
// migration.
export async function logClinicContact(clinicId: string, _repId: string, today: Date): Promise<LogContactResult> {
  const { data, error } = await db().rpc('log_clinic_contact', {
    p_clinic_id: clinicId,
    p_today: today.toISOString().slice(0, 10),
  })
  if (error) throw error
  const row = data[0]
  if (!row.ok) {
    return { ok: false, reason: 'owned_by_other', ownerName: row.owner_name, since: row.since }
  }
  const { data: clinic, error: clinicError } = await db().from('clinics').select('*').eq('id', clinicId).single()
  if (clinicError) throw clinicError
  return { ok: true, clinic: clinic as Clinic }
}

// ---------------------------------------------------------------------------
// Leads — the raw prospect list, upstream of clinics (CRM_SPEC.md).
// ---------------------------------------------------------------------------

export async function listLeads(): Promise<Lead[]> {
  const { data, error } = await db().from('leads').select('*').order('name')
  if (error) throw error
  return data as Lead[]
}

/** Batch-inserts new leads from the Find Prospects import flow. A plain
 *  insert, not an RPC — no identity to derive server-side, since a
 *  freshly-discovered lead has no owner concept until promoted. */
export async function createLeads(inputs: NewLeadInput[]): Promise<Lead[]> {
  const rows = inputs.map((input) => ({ id: `${slugifyClient(input.name)}-${crypto.randomUUID().slice(0, 6)}`, ...input }))
  const { data, error } = await db().from('leads').insert(rows).select('*')
  if (error) throw error
  return data as Lead[]
}

// _repId kept for interface parity with mockStore.ts — the real backend
// derives the acting rep from the authenticated session. See promote_lead
// in the phase1_10 migration.
export async function promoteLead(leadId: string, _repId: string, nextStep = 'Discovery call'): Promise<Clinic> {
  const { data, error } = await db().rpc('promote_lead', { p_lead_id: leadId, p_next_step: nextStep })
  if (error) throw error
  return data as unknown as Clinic
}

export async function listReps(): Promise<Rep[]> {
  const { data, error } = await db().from('reps').select('*').order('name')
  if (error) throw error
  return data.map(mapRep)
}

// ---------------------------------------------------------------------------
// Refills — status comes pre-computed from the refills_with_status view.
// ---------------------------------------------------------------------------

export async function listRefills(_today: Date = new Date()): Promise<RefillWithStatus[]> {
  const { data, error } = await db().from('refills_with_status').select('*').order('id')
  if (error) throw error
  return data.map((r) => ({
    id: r.id!,
    patient_ref: r.patient_ref!,
    clinic_id: r.clinic_id!,
    product_id: r.product_id!,
    started_at: r.started_at!,
    protocol_weeks: r.protocol_weeks!,
    runs_out_at: r.runs_out_at!,
    status: r.status as RefillStatus,
  }))
}

// ---------------------------------------------------------------------------
// Territory & contacts
// ---------------------------------------------------------------------------

export async function listClusters(): Promise<string[]> {
  const { data, error } = await db().from('clinics').select('cluster')
  if (error) throw error
  return [...new Set(data.map((c) => c.cluster))]
}

// ---------------------------------------------------------------------------
// Licensed states
// ---------------------------------------------------------------------------

export async function listLicensedStates(): Promise<LicensedState[]> {
  const { data, error } = await db().from('licensed_states').select('*').order('state_name')
  if (error) throw error
  return data as LicensedState[]
}

// ---------------------------------------------------------------------------
// Certification — grading happens server-side in submit_certification_attempt().
// ---------------------------------------------------------------------------

export async function listCertificationModules(): Promise<CertificationModule[]> {
  const { data, error } = await db().from('certification_modules').select('*').order('order')
  if (error) throw error
  return data.map((m) => ({
    id: m.id,
    title: m.title,
    order: m.order,
    questions: m.questions as unknown as CertificationQuestion[],
  }))
}

// _repId kept for interface parity with mockStore.ts — the real backend
// derives the acting rep from the authenticated session, server-side. See
// submit_certification_attempt in the phase1_8 migration.
export async function submitCertificationAttempt(
  _repId: string,
  moduleId: string,
  answers: number[],
): Promise<CertificationAttempt> {
  const { data, error } = await db().rpc('submit_certification_attempt', {
    p_module_id: moduleId,
    p_answers: answers,
  })
  if (error) throw error
  const row = data[0]
  return {
    id: `att-${Date.now()}`,
    rep_id: _repId,
    module_id: moduleId,
    score: row.score,
    passed: row.passed,
    completed_at: new Date().toISOString().slice(0, 10),
  }
}

// ---------------------------------------------------------------------------
// Demo reset — restores the shared database to its seed state via the
// reset_demo_data() function. Affects everyone looking at this project's
// data, not just the local browser (unlike the mock store's version).
// ---------------------------------------------------------------------------

// No longer clears any local session on reset — with a real Supabase Auth
// session there's nothing demo-data-shaped to clear, and forcing a
// re-login on every reset would be a regression, not a safety measure.
export async function resetDemoData(): Promise<void> {
  const { error } = await db().rpc('reset_demo_data')
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Google Sheet sync (Phase 1.5) — invokes the sync-products-sheet Edge
// Function, which reads the Sheet via a Google service account and does the
// actual diff/upsert into products + product_change_log. See
// supabase/functions/sync-products-sheet for the real logic; this is just
// the client-side trigger.
// ---------------------------------------------------------------------------

export async function syncProductsFromSheet(): Promise<SheetSyncResult> {
  const { data, error } = await db().functions.invoke<SheetSyncResult>('sync-products-sheet')
  if (error || !data) {
    // The function returns a descriptive JSON body even on 4xx/5xx (e.g.
    // "missing Google secrets"), but supabase-js's FunctionsHttpError only
    // carries the raw Response on `context` — the real message is in there.
    let message = error?.message ?? 'No response from sync function'
    const context = (error as { context?: unknown } | null)?.context
    if (context instanceof Response) {
      const body = await context.json().catch(() => null)
      if (body?.error) message = body.error
    }
    return { created: [], alreadyExists: [], skipped: [], error: message }
  }
  return data
}
