// Data model — mirrors PHASE1_SPEC.md section 3 exactly, so swapping the
// mock store (src/data/store.ts) for a real Postgres/Supabase client later
// is a data-source change, not a rebuild.

export type ProductCategory = 'peptide' | 'weight-loss' | 'hormone' | 'topical' | 'troche'
export type ProductStatus = 'current' | 'pending_review' | 'archived'

export interface Product {
  id: string
  name: string
  category: ProductCategory
  concentration: string
  price_5ml: number | null
  price_10ml: number | null
  protocol_duration: string
  /** Internal-only guidance. Never shown on the public site. */
  rep_note: string | null
  status: ProductStatus
  version: number
  reviewed_by: string | null
  reviewed_at: string | null // ISO date
}

export interface ProductChangeLog {
  id: string
  product_id: string
  field_changed: string
  old_value: string
  new_value: string
  changed_by: string
  changed_at: string // ISO date
}

export type PipelineStage = 'identify' | 'drop_in' | 'discovery' | 'solution' | 'onboard' | 'reorder'

export interface Clinic {
  id: string
  name: string
  city: string
  segment: string
  tier: 'T1' | 'T2' | 'T3'
  cluster: string
  website: string
  phone: string | null
  email: string | null
  owner_rep_id: string | null
  stage: PipelineStage
  last_touch_at: string | null // ISO date
  next_step: string | null
}

export type LeadStatus = 'new' | 'contacted' | 'promoted' | 'disqualified'

/** Raw, not-yet-engaged prospect research — the CRM's "book of business"
 *  upstream of clinics. A lead is promoted into a real clinics row (via
 *  promote_lead) once a rep actually decides to work it; see
 *  CRM_SPEC.md. Deliberately has no owner/stage/contact-log fields —
 *  those only make sense once something's actually being worked. */
export interface Lead {
  id: string
  name: string
  city: string
  segment: string
  tier: 'T1' | 'T2' | 'T3'
  cluster: string
  website: string | null
  phone: string | null
  email: string | null
  status: LeadStatus
  promoted_clinic_id: string | null
  created_at: string // ISO date
}

export type CertStatus = 'not_started' | 'in_progress' | 'certified'
export type RepRole = 'rep' | 'admin'

export interface Rep {
  id: string
  name: string
  email: string
  territory: string
  hire_date: string // ISO date
  cert_status: CertStatus
  role: RepRole
  /** Access to the sales-analytics assistant — independent of `role`.
   *  role governs Manage Products (a PIC/pharmacy-compliance function
   *  specific to Cindy); is_leadership governs a different permission
   *  that Ron/Melissa (Integrative Concepts ownership) and Anthony also
   *  need without picking up product-editing rights. */
  is_leadership: boolean
}

// No patient name or DOB field exists anywhere in this schema — reference
// codes only, enforced here at the type level as well as in the UI.
export interface PatientRefill {
  id: string
  patient_ref: string // e.g. "P-0417"
  clinic_id: string
  product_id: string
  started_at: string // ISO date
  protocol_weeks: number
}

export type RefillStatus = 'on_protocol' | 'due_soon' | 'due' | 'lapsed'

export interface RefillWithStatus extends PatientRefill {
  runs_out_at: string // ISO date, computed
  status: RefillStatus // computed at query time, never stored stale
}

export interface LicensedState {
  id: string
  state_name: string
  status: 'confirmed' | 'roadmap'
  target_quarter: string | null
}

export interface CertificationQuestion {
  prompt: string
  options: string[]
  correct_index: number
}

export interface CertificationModule {
  id: string
  title: string
  order: number
  questions: CertificationQuestion[]
}

export interface CertificationAttempt {
  id: string
  rep_id: string
  module_id: string
  score: number
  passed: boolean
  completed_at: string // ISO date
}
