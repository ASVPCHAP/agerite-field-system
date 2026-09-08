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
  LicensedState,
  Product,
  ProductChangeLog,
  RefillStatus,
  RefillWithStatus,
  Rep,
} from './schema'
import type { PublicProduct, LogContactResult } from './storeTypes'
import { supabase } from './supabaseClient'

const SESSION_KEY = 'agerite_field_system_rep_id'

function db() {
  if (!supabase) throw new Error('Supabase is not configured (missing VITE_SUPABASE_URL/ANON_KEY)')
  return supabase
}

function mapCertStatus(status: string): Rep['cert_status'] {
  return status as Rep['cert_status']
}

function mapRep(row: { id: string; name: string; email: string; territory: string; hire_date: string; cert_status: string }): Rep {
  return { ...row, cert_status: mapCertStatus(row.cert_status) }
}

// ---------------------------------------------------------------------------
// Auth (same lightweight rep-picker as the mock store — no real Supabase
// Auth session yet; see README for what that would take).
// ---------------------------------------------------------------------------

export async function listRepsForLogin(): Promise<Rep[]> {
  const { data, error } = await db().from('reps').select('*').order('name')
  if (error) throw error
  return data.map(mapRep)
}

export async function login(repId: string): Promise<Rep | null> {
  const { data, error } = await db().from('reps').select('*').eq('id', repId).maybeSingle()
  if (error) throw error
  if (data) {
    try {
      localStorage.setItem(SESSION_KEY, repId)
    } catch {
      /* ignore */
    }
  }
  return data ? mapRep(data) : null
}

export async function logout(): Promise<void> {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

export async function getCurrentRep(): Promise<Rep | null> {
  let repId: string | null = null
  try {
    repId = localStorage.getItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
  if (!repId) return null
  const { data, error } = await db().from('reps').select('*').eq('id', repId).maybeSingle()
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

// ---------------------------------------------------------------------------
// Clinics / pipeline — ownership locking via the log_clinic_contact() RPC.
// ---------------------------------------------------------------------------

export async function listClinics(): Promise<Clinic[]> {
  const { data, error } = await db().from('clinics').select('*').order('name')
  if (error) throw error
  return data as Clinic[]
}

export async function logClinicContact(clinicId: string, repId: string, today: Date): Promise<LogContactResult> {
  const { data, error } = await db().rpc('log_clinic_contact', {
    p_clinic_id: clinicId,
    p_rep_id: repId,
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

export async function submitCertificationAttempt(
  repId: string,
  moduleId: string,
  answers: number[],
): Promise<CertificationAttempt> {
  const { data, error } = await db().rpc('submit_certification_attempt', {
    p_rep_id: repId,
    p_module_id: moduleId,
    p_answers: answers,
  })
  if (error) throw error
  const row = data[0]
  return {
    id: `att-${Date.now()}`,
    rep_id: repId,
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

export async function resetDemoData(): Promise<void> {
  const { error } = await db().rpc('reset_demo_data')
  if (error) throw error
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}
