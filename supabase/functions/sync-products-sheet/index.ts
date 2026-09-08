// Phase 1.5 — imports new rows from the Google Sheet into the products
// table. Import-only, by design: the portal's "Manage Products" form
// (upsert_product()) is the authoritative way to edit an existing product,
// so this function never touches a product that's already in the
// database — it only creates ones that aren't there yet, matched by name.
// A sheet row whose name already exists is reported, not applied, so
// re-running the sync after Cindy edits a value she's already imported is
// a safe no-op rather than a silent overwrite of whatever the portal form
// has since changed.
//
// Required secrets (set via `supabase secrets set` or the dashboard —
// never commit these): GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY,
// GOOGLE_SHEET_ID. Optional: GOOGLE_SHEET_RANGE (default "Products!A2:H").
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by
// the edge runtime — nothing to set for those.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VALID_CATEGORIES = ['peptide', 'weight-loss', 'hormone', 'topical', 'troche']
const VALID_STATUSES = ['current', 'pending_review', 'archived']
const IMPORT_ACTOR = 'Sheet import'

interface SheetProduct {
  name: string
  category: string
  concentration: string
  price_5ml: number | null
  price_10ml: number | null
  protocol_duration: string
  status: string
  rep_note: string | null
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const raw = atob(b64)
  const buf = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i)
  return buf.buffer
}

async function getGoogleAccessToken(email: string, privateKeyPem: string, scope: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const claims = { iss: email, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(privateKeyPem.replace(/\\n/g, '\n')),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput))
  const jwt = `${signingInput}.${base64url(signature)}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status}): ${await res.text()}`)
  const data = await res.json()
  return data.access_token as string
}

async function fetchSheetRows(accessToken: string, sheetId: string, range: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?majorDimension=ROWS`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) throw new Error(`Sheets API failed (${res.status}): ${await res.text()}`)
  const data = await res.json()
  return data.values ?? []
}

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function parsePrice(raw: string | undefined): number | null {
  if (!raw || !raw.trim()) return null
  const n = Number(raw.replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : null
}

function parseRow(row: string[], rowNumber: number): { product: SheetProduct } | { error: string } {
  const [name, category, concentration, price5, price10, protocol, status, repNote] = row
  if (!name || !name.trim()) return { error: 'blank name' }
  const normalizedCategory = (category ?? '').trim()
  if (!VALID_CATEGORIES.includes(normalizedCategory)) {
    return { error: `row ${rowNumber}: category "${category}" must be one of ${VALID_CATEGORIES.join(', ')}` }
  }
  const normalizedStatus = (status ?? 'current').trim() || 'current'
  if (!VALID_STATUSES.includes(normalizedStatus)) {
    return { error: `row ${rowNumber}: status "${status}" must be one of ${VALID_STATUSES.join(', ')}` }
  }
  return {
    product: {
      name: name.trim(),
      category: normalizedCategory,
      concentration: (concentration ?? '').trim(),
      price_5ml: parsePrice(price5),
      price_10ml: parsePrice(price10),
      protocol_duration: (protocol ?? '').trim(),
      status: normalizedStatus,
      rep_note: repNote && repNote.trim() ? repNote.trim() : null,
    },
  }
}

Deno.serve(async (_req: Request) => {
  try {
    const email = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')
    const privateKey = Deno.env.get('GOOGLE_PRIVATE_KEY')
    const sheetId = Deno.env.get('GOOGLE_SHEET_ID')
    const range = Deno.env.get('GOOGLE_SHEET_RANGE') ?? 'Products!A2:H'

    if (!email || !privateKey || !sheetId) {
      return jsonResponse(
        {
          error:
            'Missing Google Sheets secrets. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_SHEET_ID (supabase secrets set ...) before calling this function.',
        },
        400,
      )
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const accessToken = await getGoogleAccessToken(email, privateKey, 'https://www.googleapis.com/auth/spreadsheets.readonly')
    const rawRows = await fetchSheetRows(accessToken, sheetId, range)

    const { data: existingProducts, error: fetchError } = await supabase.from('products').select('id, name')
    if (fetchError) throw fetchError
    const existingNames = new Set(existingProducts!.map((p) => p.name.toLowerCase()))
    const existingIds = new Set(existingProducts!.map((p) => p.id))

    const created: string[] = []
    const alreadyExists: string[] = []
    const skipped: string[] = []
    const today = new Date().toISOString().slice(0, 10)

    for (let i = 0; i < rawRows.length; i++) {
      const rowNumber = i + 2 // sheet row, accounting for the header row
      const parsed = parseRow(rawRows[i], rowNumber)
      if ('error' in parsed) {
        if (parsed.error !== 'blank name') skipped.push(parsed.error)
        continue
      }
      const sheetProduct = parsed.product

      if (existingNames.has(sheetProduct.name.toLowerCase())) {
        alreadyExists.push(sheetProduct.name)
        continue
      }

      let id = slugify(sheetProduct.name)
      let suffix = 2
      while (existingIds.has(id)) {
        id = `${slugify(sheetProduct.name)}-${suffix}`
        suffix += 1
      }
      existingIds.add(id)
      existingNames.add(sheetProduct.name.toLowerCase())

      const { error: insertError } = await supabase.from('products').insert({
        id,
        ...sheetProduct,
        version: 1,
        reviewed_by: IMPORT_ACTOR,
        reviewed_at: today,
      })
      if (insertError) {
        skipped.push(`row ${rowNumber} (${sheetProduct.name}): ${insertError.message}`)
        continue
      }
      created.push(sheetProduct.name)
    }

    return jsonResponse({ created, alreadyExists, skipped, total_rows_read: rawRows.length })
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
