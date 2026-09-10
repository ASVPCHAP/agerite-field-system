// Shared between mockStore.ts and supabaseStore.ts so store.ts can re-export
// whichever one is active without either implementation owning the types.

import type { ActivityType, Lead, Product, Rep } from './schema'

export type PublicProduct = Omit<Product, 'rep_note'> & { under_review: boolean }

/** Result of requesting a magic-link sign-in. `immediate` means the mock
 *  store completed the session right away (no real email involved) —
 *  callers should skip the "check your email" message and just navigate. */
export type MagicLinkResult =
  | { ok: true; immediate: true; rep: Rep }
  | { ok: true; immediate: false }
  | { ok: false; error: string }

/** Exactly one of leadId/clinicId — mirrors the activities table's own
 *  check constraint. Logging a 'visit' on a lead promotes it (see
 *  log_activity in the phase1_13 migration); promotedClinicId is set
 *  only in that case. */
export interface LogActivityInput {
  leadId?: string
  clinicId?: string
  type: ActivityType
  notes: string | null
  occurredAt: string // ISO date
  contactId?: string
}

export type LogActivityResult =
  | { ok: true; activityId: string; promotedClinicId: string | null }
  | { ok: false; reason: 'owned_by_other'; ownerName: string; since: string | null }
  | { ok: false; reason: 'already_promoted'; clinicId: string | null }

/** Import-only: the Sheet sync creates new products by name and never
 *  touches an existing one — the "Manage Products" form is the only way
 *  to edit a product once it exists. `alreadyExists` names rows the sync
 *  saw but left untouched because a product with that name is already in
 *  the database. */
export interface SheetSyncResult {
  created: string[]
  alreadyExists: string[]
  skipped: string[]
  total_rows_read?: number
  error?: string
}

/** Result of asking the leadership sales-analytics assistant a question. */
export type AssistantResult = { ok: true; answer: string } | { ok: false; error: string }

/** One row a rep is about to import from the Find Prospects tool, after
 *  pasting their own AI's research back in and reviewing/editing it. No
 *  id/status/promoted_clinic_id — those are assigned on insert. */
export interface NewLeadInput {
  name: string
  city: string
  segment: string
  tier: Lead['tier']
  cluster: string
  website: string | null
  phone: string | null
  email: string | null
}

/** Input for the "Manage Products" form. A null/omitted id creates a new
 *  product; an existing id edits it. Mirrors upsert_product's parameters. */
export interface ProductFormInput {
  id?: string | null
  name: string
  category: Product['category']
  concentration: string
  price_5ml: number | null
  price_10ml: number | null
  protocol_duration: string
  status: Product['status']
  rep_note: string | null
}

/** Input for the Contacts form. A null/omitted id creates a new
 *  contact; an existing id edits it. Mirrors upsert_contact's
 *  parameters. */
export interface UpsertContactInput {
  id?: string | null
  clinicId: string
  name: string
  role: string | null
  phone: string | null
  email: string | null
  isDecisionMaker: boolean
}
