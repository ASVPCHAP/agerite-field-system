// Mock data store standing in for Postgres/Supabase, per PHASE1_SPEC.md
// section 2: "build the products table to the exact shape the sync will
// eventually fill, and seed it with mock data in the same shape."
//
// Every exported function is async and returns plain data (never a
// framework-specific client object), so this module is the one thing that
// gets swapped for real Supabase calls later — nothing that imports from
// here needs to change shape when that happens.

import type {
  Activity,
  CertificationAttempt,
  CertificationModule,
  Clinic,
  Lead,
  LicensedState,
  Order,
  PatientRefill,
  Product,
  ProductChangeLog,
  RefillStatus,
  RefillWithStatus,
  Rep,
} from './schema'
import {
  seedCertificationModules,
  seedClinics,
  seedLeads,
  seedLicensedStates,
  seedOrders,
  seedPatientRefills,
  seedProductChangeLog,
  seedProducts,
  seedReps,
} from './seed'
import type {
  AssistantResult,
  LogActivityInput,
  LogActivityResult,
  MagicLinkResult,
  NewLeadInput,
  ProductFormInput,
  PublicProduct,
  SheetSyncResult,
} from './storeTypes'

const STORAGE_KEY = 'agerite_field_system_db_v1'
const SESSION_KEY = 'agerite_field_system_rep_id'

interface DbShape {
  products: Product[]
  productChangeLog: ProductChangeLog[]
  clinics: Clinic[]
  leads: Lead[]
  activities: Activity[]
  orders: Order[]
  reps: Rep[]
  patientRefills: PatientRefill[]
  licensedStates: LicensedState[]
  certificationModules: CertificationModule[]
  certificationAttempts: CertificationAttempt[]
}

function seedDb(): DbShape {
  return {
    products: structuredClone(seedProducts),
    productChangeLog: structuredClone(seedProductChangeLog),
    clinics: structuredClone(seedClinics),
    leads: structuredClone(seedLeads),
    activities: [],
    orders: structuredClone(seedOrders),
    reps: structuredClone(seedReps),
    patientRefills: structuredClone(seedPatientRefills),
    licensedStates: structuredClone(seedLicensedStates),
    certificationModules: structuredClone(seedCertificationModules),
    certificationAttempts: [],
  }
}

function loadDb(): DbShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DbShape
      // orders was added after some browsers already had a persisted db —
      // backfill rather than forcing everyone to hit "reset demo data".
      parsed.orders ??= structuredClone(seedOrders)
      return parsed
    }
  } catch {
    // fall through to seed
  }
  return seedDb()
}

let db = loadDb()

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // best-effort only — a demo shouldn't crash over storage quota
  }
}

/** Wipes all local state back to seed data. Used by the "reset demo" control. */
export async function resetDemoData(): Promise<void> {
  db = seedDb()
  persist()
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Auth. No real Supabase project means no real email to send — this store
// completes the "magic link" immediately if the email matches a seeded rep,
// which is what makes the app runnable with zero setup. See
// supabaseStore.ts for the real signInWithOtp version.
// ---------------------------------------------------------------------------

export async function requestMagicLink(email: string): Promise<MagicLinkResult> {
  const normalized = email.trim().toLowerCase()
  const rep = db.reps.find((r) => r.email.toLowerCase() === normalized)
  if (!rep) return { ok: false, error: 'No rep in the demo data has that email.' }
  try {
    localStorage.setItem(SESSION_KEY, rep.id)
  } catch {
    /* ignore */
  }
  return { ok: true, immediate: true, rep: structuredClone(rep) }
}

/** No-op in mock mode — requestMagicLink already completes the session
 *  synchronously, so there's no async auth-state event to subscribe to. */
export function subscribeAuth(_onChange: (rep: Rep | null) => void): () => void {
  return () => {}
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
  const rep = db.reps.find((r) => r.id === repId)
  return rep ? structuredClone(rep) : null
}

// ---------------------------------------------------------------------------
// Products — approval gate (section 4.1). Filtering happens here, at the
// data-access layer, not left to the UI to hide.
// ---------------------------------------------------------------------------

/** Public-facing product reference. Pending-review rows appear as a
 *  placeholder — concentration and pricing withheld — never silently
 *  omitted, and rep_note never leaves this module for this view. */
export async function listPublicProducts(): Promise<PublicProduct[]> {
  return db.products
    .filter((p) => p.status !== 'archived')
    .map(({ rep_note: _rep_note, ...p }) => {
      const under_review = p.status === 'pending_review'
      return {
        ...p,
        concentration: under_review ? 'Under review' : p.concentration,
        price_5ml: under_review ? null : p.price_5ml,
        price_10ml: under_review ? null : p.price_10ml,
        under_review,
      }
    })
}

/** Rep-facing knowledge base — full detail including rep_note, and
 *  pending-review rows genuinely visible with a "do not quote" flag. */
export async function listRepProducts(): Promise<Product[]> {
  return db.products.filter((p) => p.status !== 'archived').map((p) => structuredClone(p))
}

/** Admin-only review queue: everything awaiting PIC sign-off. */
export async function listPendingReview(): Promise<Product[]> {
  return db.products.filter((p) => p.status === 'pending_review').map((p) => structuredClone(p))
}

export async function listProductChangeLog(): Promise<ProductChangeLog[]> {
  return structuredClone(db.productChangeLog).sort((a, b) => (a.changed_at < b.changed_at ? 1 : -1))
}

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/** "Manage Products" form target — same diff/change-log behavior as the
 *  Sheet sync and the real upsert_product() Postgres function, so mock mode
 *  behaves identically to the real backend. */
export async function upsertProduct(input: ProductFormInput, changedBy: string): Promise<Product> {
  const today = isoDate(new Date())
  const existing = input.id ? db.products.find((p) => p.id === input.id) : undefined

  if (!existing) {
    let id = slugify(input.name) || 'product'
    let suffix = 2
    while (db.products.some((p) => p.id === id)) {
      id = `${slugify(input.name) || 'product'}-${suffix}`
      suffix += 1
    }
    const product: Product = {
      id,
      name: input.name,
      category: input.category,
      concentration: input.concentration,
      price_5ml: input.price_5ml,
      price_5ml_label: null,
      price_10ml: input.price_10ml,
      price_10ml_label: null,
      protocol_duration: input.protocol_duration,
      rep_note: input.rep_note,
      status: input.status || 'current',
      version: 1,
      reviewed_by: changedBy,
      reviewed_at: today,
    }
    db.products.push(product)
    persist()
    return structuredClone(product)
  }

  const fields: [keyof Product, string | number | null][] = [
    ['name', input.name],
    ['category', input.category],
    ['concentration', input.concentration],
    ['price_5ml', input.price_5ml],
    ['price_10ml', input.price_10ml],
    ['protocol_duration', input.protocol_duration],
    ['status', input.status || 'current'],
    ['rep_note', input.rep_note],
  ]
  for (const [field, newVal] of fields) {
    const oldVal = existing[field] as string | number | null
    if ((oldVal ?? null) !== (newVal ?? null)) {
      const fmt = (v: string | number | null) =>
        field === 'price_5ml' || field === 'price_10ml' ? (v == null ? '' : `$${v}`) : String(v ?? '')
      db.productChangeLog.push({
        id: `cl-${existing.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        product_id: existing.id,
        field_changed: field,
        old_value: fmt(oldVal),
        new_value: fmt(newVal),
        changed_by: changedBy,
        changed_at: today,
      })
      ;(existing as unknown as Record<string, unknown>)[field] = newVal
    }
  }
  existing.version += 1
  existing.reviewed_by = changedBy
  existing.reviewed_at = today
  persist()
  return structuredClone(existing)
}

// ---------------------------------------------------------------------------
// Clinics / pipeline — ownership locking (section 4.2).
// ---------------------------------------------------------------------------

export async function listClinics(): Promise<Clinic[]> {
  return structuredClone(db.clinics)
}

export async function listActivities(target: { leadId?: string; clinicId?: string }): Promise<Activity[]> {
  return structuredClone(
    db.activities
      .filter((a) => (target.leadId ? a.lead_id === target.leadId : a.clinic_id === target.clinicId))
      .sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1)),
  )
}

/** Preview order history for one clinic — see the Order type in schema.ts
 *  for what this stands in for. */
export async function listOrders(clinicId: string): Promise<Order[]> {
  return structuredClone(
    db.orders.filter((o) => o.clinic_id === clinicId).sort((a, b) => (a.ordered_at < b.ordered_at ? 1 : -1)),
  )
}

/** Logs a call/text/visit/email/note against exactly one of a lead or a
 *  clinic. On a clinic: first rep to log anything owns it, permanently,
 *  unless an admin reassigns it — any other rep is blocked with a named
 *  "owned by, since" result rather than silently allowed to overwrite.
 *  On a lead: a 'visit' IS the promotion (same effect as promoteLead);
 *  anything else just bumps status new -> contacted. Mirrors
 *  log_activity in the phase1_13 migration. */
export async function logActivity(input: LogActivityInput, repId: string): Promise<LogActivityResult> {
  const activityId = `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`

  if (input.clinicId) {
    const clinic = db.clinics.find((c) => c.id === input.clinicId)
    if (!clinic) throw new Error(`Unknown clinic: ${input.clinicId}`)

    if (clinic.owner_rep_id && clinic.owner_rep_id !== repId) {
      const owner = db.reps.find((r) => r.id === clinic.owner_rep_id)
      return { ok: false, reason: 'owned_by_other', ownerName: owner?.name ?? 'another rep', since: clinic.last_touch_at }
    }

    db.activities.push({
      id: activityId,
      lead_id: null,
      clinic_id: input.clinicId,
      rep_id: repId,
      type: input.type,
      notes: input.notes,
      occurred_at: input.occurredAt,
      created_at: new Date().toISOString(),
    })

    if (!clinic.owner_rep_id) {
      clinic.owner_rep_id = repId
      if (clinic.stage === 'identify') clinic.stage = 'drop_in'
    }
    clinic.last_touch_at = input.occurredAt
    persist()
    return { ok: true, activityId, promotedClinicId: null }
  }

  const lead = db.leads.find((l) => l.id === input.leadId)
  if (!lead) throw new Error(`Unknown lead: ${input.leadId}`)
  if (lead.status === 'promoted') {
    return { ok: false, reason: 'already_promoted', clinicId: lead.promoted_clinic_id }
  }

  db.activities.push({
    id: activityId,
    lead_id: input.leadId!,
    clinic_id: null,
    rep_id: repId,
    type: input.type,
    notes: input.notes,
    occurred_at: input.occurredAt,
    created_at: new Date().toISOString(),
  })

  let promotedClinicId: string | null = null
  if (input.type === 'visit') {
    let id = slugify(lead.name) || 'clinic'
    let suffix = 2
    while (db.clinics.some((c) => c.id === id)) {
      id = `${slugify(lead.name) || 'clinic'}-${suffix}`
      suffix += 1
    }
    const clinic: Clinic = {
      id,
      name: lead.name,
      city: lead.city,
      segment: lead.segment,
      tier: lead.tier,
      cluster: lead.cluster,
      website: lead.website ?? '',
      phone: lead.phone,
      email: lead.email,
      owner_rep_id: repId,
      stage: 'drop_in',
      last_touch_at: input.occurredAt,
      next_step: 'Follow up after visit',
    }
    db.clinics.push(clinic)
    lead.status = 'promoted'
    lead.promoted_clinic_id = id
    promotedClinicId = id
  } else if (lead.status === 'new') {
    lead.status = 'contacted'
  }

  persist()
  return { ok: true, activityId, promotedClinicId }
}

// ---------------------------------------------------------------------------
// Leads — the raw prospect list, upstream of clinics (CRM_SPEC.md).
// ---------------------------------------------------------------------------

export async function listLeads(): Promise<Lead[]> {
  return structuredClone(db.leads)
}

/** Batch-inserts new leads from the Find Prospects import flow. No
 *  identity/ownership to derive — a freshly-discovered lead has no owner
 *  until promoted, so unlike promoteLead this needs no rep id at all. */
export async function createLeads(inputs: NewLeadInput[]): Promise<Lead[]> {
  const today = isoDate(new Date())
  const created: Lead[] = inputs.map((input) => {
    let id = slugify(input.name) || 'lead'
    let suffix = 2
    while (db.leads.some((l) => l.id === id) || db.clinics.some((c) => c.id === id)) {
      id = `${slugify(input.name) || 'lead'}-${suffix}`
      suffix += 1
    }
    const lead: Lead = { ...input, id, status: 'new', promoted_clinic_id: null, created_at: today }
    db.leads.push(lead)
    return lead
  })
  persist()
  return structuredClone(created)
}

/** Promotes a lead into a real, owned clinic in one step — "I looked at
 *  this and I'm working it now." Same effect as logging a 'visit'
 *  activity on the lead — this is the standalone button's path to the
 *  same outcome, not a separate concept. Matches promote_lead() in the phase1_10
 *  migration. */
export async function promoteLead(leadId: string, repId: string, nextStep = 'Discovery call'): Promise<Clinic> {
  const lead = db.leads.find((l) => l.id === leadId)
  if (!lead) throw new Error(`Unknown lead: ${leadId}`)
  if (lead.status === 'promoted') throw new Error(`${lead.name} has already been promoted (clinic ${lead.promoted_clinic_id})`)

  let id = slugify(lead.name) || 'clinic'
  let suffix = 2
  while (db.clinics.some((c) => c.id === id)) {
    id = `${slugify(lead.name) || 'clinic'}-${suffix}`
    suffix += 1
  }

  const clinic: Clinic = {
    id,
    name: lead.name,
    city: lead.city,
    segment: lead.segment,
    tier: lead.tier,
    cluster: lead.cluster,
    website: lead.website ?? '',
    phone: lead.phone,
    email: lead.email,
    owner_rep_id: repId,
    stage: 'drop_in',
    last_touch_at: isoDate(new Date()),
    next_step: nextStep,
  }
  db.clinics.push(clinic)
  lead.status = 'promoted'
  lead.promoted_clinic_id = id
  persist()
  return structuredClone(clinic)
}

export async function listReps(): Promise<Rep[]> {
  return structuredClone(db.reps)
}

// ---------------------------------------------------------------------------
// Refills — status derived at query time (section 4.3), never stored stale.
// ---------------------------------------------------------------------------

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function computeRefillStatus(refill: PatientRefill, today: Date): { runsOutAt: Date; status: RefillStatus } {
  const start = new Date(`${refill.started_at}T00:00:00`)
  const runsOutAt = new Date(start.getTime() + refill.protocol_weeks * 7 * 86_400_000)
  const daysLeft = Math.round((runsOutAt.getTime() - today.getTime()) / 86_400_000)
  let status: RefillStatus
  if (daysLeft < 0) status = 'lapsed'
  else if (daysLeft <= 7) status = 'due'
  else if (daysLeft <= 14) status = 'due_soon'
  else status = 'on_protocol'
  return { runsOutAt, status }
}

export async function listRefills(today: Date = new Date()): Promise<RefillWithStatus[]> {
  return db.patientRefills.map((refill) => {
    const { runsOutAt, status } = computeRefillStatus(refill, today)
    return { ...structuredClone(refill), runs_out_at: isoDate(runsOutAt), status }
  })
}

// ---------------------------------------------------------------------------
// Territory & contacts
// ---------------------------------------------------------------------------

export async function listClusters(): Promise<string[]> {
  return [...new Set(db.clinics.map((c) => c.cluster))]
}

// ---------------------------------------------------------------------------
// Licensed states
// ---------------------------------------------------------------------------

export async function listLicensedStates(): Promise<LicensedState[]> {
  return structuredClone(db.licensedStates)
}

// ---------------------------------------------------------------------------
// Certification
// ---------------------------------------------------------------------------

export async function listCertificationModules(): Promise<CertificationModule[]> {
  return structuredClone(db.certificationModules)
}

export async function submitCertificationAttempt(
  repId: string,
  moduleId: string,
  answers: number[],
  today: Date = new Date(),
): Promise<CertificationAttempt> {
  const rep = db.reps.find((r) => r.id === repId)
  const module = db.certificationModules.find((m) => m.id === moduleId)
  if (!rep) throw new Error(`Unknown rep: ${repId}`)
  if (!module) throw new Error(`Unknown module: ${moduleId}`)

  let score = 0
  module.questions.forEach((q, i) => {
    if (answers[i] === q.correct_index) score += 1
  })
  const passed = score === module.questions.length

  const attempt: CertificationAttempt = {
    id: `att-${Date.now()}`,
    rep_id: repId,
    module_id: moduleId,
    score,
    passed,
    completed_at: isoDate(today),
  }
  db.certificationAttempts.push(attempt)
  rep.cert_status = passed ? 'certified' : 'in_progress'
  persist()
  return structuredClone(attempt)
}

// ---------------------------------------------------------------------------
// Google Sheet sync (Phase 1.5) — no-op in mock mode; the sync runs as a
// Supabase Edge Function, so it only exists once a real project is wired up.
// ---------------------------------------------------------------------------

export async function syncProductsFromSheet(): Promise<SheetSyncResult> {
  return {
    created: [],
    alreadyExists: [],
    skipped: [],
    error: 'Sheet sync requires the real Supabase backend — not available in mock mode.',
  }
}

export async function askAssistant(_question: string): Promise<AssistantResult> {
  return { ok: false, error: 'The sales-analytics assistant requires the real Supabase backend — not available in mock mode.' }
}
