// Shared between mockStore.ts and supabaseStore.ts so store.ts can re-export
// whichever one is active without either implementation owning the types.

import type { Clinic, Product } from './schema'

export type PublicProduct = Omit<Product, 'rep_note'> & { under_review: boolean }

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
