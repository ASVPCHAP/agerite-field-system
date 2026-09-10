// Data model — mirrors PHASE1_SPEC.md section 3 exactly, so swapping the
// mock store (src/data/store.ts) for a real Postgres/Supabase client later
// is a data-source change, not a rebuild.

export type ProductCategory = 'peptide' | 'weight-loss' | 'hormone' | 'topical' | 'troche' | 'injection'
export type ProductStatus = 'current' | 'pending_review' | 'archived'

export interface Product {
  id: string
  name: string
  category: ProductCategory
  concentration: string
  price_5ml: number | null
  /** What price_5ml actually is — '5 mL' for the peptides that shape
   *  fits, but AGErite's real catalog also prices per troche/capsule
   *  count, per gram jar, or per dose-strength — null falls back to
   *  '5 mL' client-side. See CRM_SPEC.md section 12. */
  price_5ml_label: string | null
  price_10ml: number | null
  price_10ml_label: string | null
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

export type ActivityType = 'call' | 'text' | 'visit' | 'email' | 'note'

/** A logged interaction — the real CRM history, replacing the old
 *  single-value next_step/last_touch_at-only pattern. Attaches to
 *  exactly one of lead_id/clinic_id, never both. Logging a 'visit' on a
 *  lead is what promotes it (see log_activity in the phase1_13
 *  migration) — a call/text/email/note is just activity. */
export interface Activity {
  id: string
  lead_id: string | null
  clinic_id: string | null
  rep_id: string
  type: ActivityType
  notes: string | null
  occurred_at: string // ISO date
  created_at: string // ISO timestamp
}

export type OrderStatus = 'submitted' | 'processing' | 'shipped' | 'delivered'
export type OrderSize = '5ml' | '10ml'

/** A placed order against an active (reorder-stage) clinic. Preview data —
 *  shaped to match what SiCompounding's B2B Order API is expected to
 *  return once that integration is actually wired up, so swapping the
 *  mock store for real API calls later is a data-source change, not a
 *  rebuild. Read-only: nothing in the UI creates or edits an order. See
 *  CRM_SPEC.md section 9. */
export interface Order {
  id: string
  clinic_id: string
  product_id: string
  size: OrderSize
  quantity: number
  status: OrderStatus
  ordered_at: string // ISO date
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
