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
