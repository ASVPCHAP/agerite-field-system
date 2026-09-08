// Mock data store standing in for Postgres/Supabase, per PHASE1_SPEC.md
// section 2: "build the products table to the exact shape the sync will
// eventually fill, and seed it with mock data in the same shape."
//
// Every exported function is async and returns plain data (never a
// framework-specific client object), so this module is the one thing that
// gets swapped for real Supabase calls later — nothing that imports from
// here needs to change shape when that happens.

import type {
  CertificationAttempt,
  CertificationModule,
  Clinic,
  LicensedState,
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
  seedLicensedStates,
  seedPatientRefills,
  seedProductChangeLog,
  seedProducts,
  seedReps,
} from './seed'
import type { LogContactResult, ProductFormInput, PublicProduct, SheetSyncResult } from './storeTypes'

const STORAGE_KEY = 'agerite_field_system_db_v1'
const SESSION_KEY = 'agerite_field_system_rep_id'

interface DbShape {
  products: Product[]
  productChangeLog: ProductChangeLog[]
  clinics: Clinic[]
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
    if (raw) return JSON.parse(raw) as DbShape
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
// Auth (lightweight, per spec section 2 — magic-link stand-in for the demo,
// upgradeable to real Supabase Auth without changing callers' shape).
// ---------------------------------------------------------------------------

export async function listRepsForLogin(): Promise<Rep[]> {
  return structuredClone(db.reps)
}

export async function login(repId: string): Promise<Rep | null> {
  const rep = db.reps.find((r) => r.id === repId) ?? null
  if (rep) {
    try {
      localStorage.setItem(SESSION_KEY, repId)
    } catch {
      /* ignore */
    }
  }
  return rep ? structuredClone(rep) : null
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
      price_10ml: input.price_10ml,
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

/** First rep to log a touch owns the clinic, permanently, unless an admin
 *  reassigns it. Any other rep is blocked with a named "owned by, since"
 *  result rather than silently allowed to overwrite. */
export async function logClinicContact(clinicId: string, repId: string, today: Date): Promise<LogContactResult> {
  const clinic = db.clinics.find((c) => c.id === clinicId)
  if (!clinic) throw new Error(`Unknown clinic: ${clinicId}`)

  if (clinic.owner_rep_id && clinic.owner_rep_id !== repId) {
    const owner = db.reps.find((r) => r.id === clinic.owner_rep_id)
    return { ok: false, reason: 'owned_by_other', ownerName: owner?.name ?? 'another rep', since: clinic.last_touch_at }
  }

  if (!clinic.owner_rep_id) {
    clinic.owner_rep_id = repId
    if (clinic.stage === 'identify') clinic.stage = 'drop_in'
  }
  clinic.last_touch_at = isoDate(today)
  persist()
  return { ok: true, clinic: structuredClone(clinic) }
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
    updated: [],
    unchanged: 0,
    skipped: [],
    error: 'Sheet sync requires the real Supabase backend — not available in mock mode.',
  }
}
