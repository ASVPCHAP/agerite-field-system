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
export function resetDemoData() {
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

export type PublicProduct = Omit<Product, 'rep_note'> & { under_review: boolean }

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

// ---------------------------------------------------------------------------
// Clinics / pipeline — ownership locking (section 4.2).
// ---------------------------------------------------------------------------

export async function listClinics(): Promise<Clinic[]> {
  return structuredClone(db.clinics)
}

export type LogContactResult =
  | { ok: true; clinic: Clinic }
  | { ok: false; reason: 'owned_by_other'; ownerName: string; since: string | null }

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
