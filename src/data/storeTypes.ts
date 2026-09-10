// Shared between mockStore.ts and supabaseStore.ts so store.ts can re-export
// whichever one is active without either implementation owning the types.

import type { Clinic, Lead, Product, Rep } from './schema'

export type PublicProduct = Omit<Product, 'rep_note'> & { under_review: boolean }

/** Result of requesting a magic-link sign-in. `immediate` means the mock
 *  store completed the session right away (no real email involved) —
 *  callers should skip the "check your email" message and just navigate. */
export type MagicLinkResult =
  | { ok: true; immediate: true; rep: Rep }
  | { ok: true; immediate: false }
  | { ok: false; error: string }

export type LogContactResult =
  | { ok: true; clinic: Clinic }
  | { ok: false; reason: 'owned_by_other'; ownerName: string; since: string | null }

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
