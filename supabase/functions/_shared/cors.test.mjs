// Lightweight check that the CORS helper still exposes the headers the
// browser preflight (supabase-js functions.invoke) requires. Run with:
//   node --test supabase/functions/_shared/cors.test.mjs
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { test } from 'node:test'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, 'cors.ts'), 'utf8')
const fnSrc = readFileSync(join(here, '../sync-products-sheet/index.ts'), 'utf8')

test('cors headers include origin, methods, and supabase-js request headers', () => {
  assert.match(src, /Access-Control-Allow-Origin': '\*'/)
  assert.match(src, /Access-Control-Allow-Methods': 'POST, OPTIONS'/)
  for (const header of ['authorization', 'x-client-info', 'apikey', 'content-type']) {
    assert.match(src, new RegExp(header))
  }
})

test('sync-products-sheet handles OPTIONS and attaches CORS to JSON responses', () => {
  assert.match(fnSrc, /req\.method === 'OPTIONS'/)
  assert.match(fnSrc, /headers: corsHeaders/)
  assert.match(fnSrc, /\.\.\.corsHeaders/)
  assert.match(fnSrc, /import \{ corsHeaders \} from '\.\.\/_shared\/cors\.ts'/)
})
