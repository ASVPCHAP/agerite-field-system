// Shared between mockStore.ts and supabaseStore.ts so store.ts can re-export
// whichever one is active without either implementation owning the types.

import type { Clinic, Product } from './schema'

export type PublicProduct = Omit<Product, 'rep_note'> & { under_review: boolean }

export type LogContactResult =
  | { ok: true; clinic: Clinic }
  | { ok: false; reason: 'owned_by_other'; ownerName: string; since: string | null }

export interface SheetSyncResult {
  created: string[]
  updated: { name: string; fields: string[] }[]
  unchanged: number
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
