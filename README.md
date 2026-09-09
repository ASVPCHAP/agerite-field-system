# AGErite Field System — Phase 1

Provider site + Integrative Concepts field portal, built against `PHASE1_SPEC.md`
(see the rockwallpartners engagement docs). React + TypeScript + Vite + Tailwind
CSS v4, backed by a real Supabase Postgres project.

## Status

Real database, real Google Sheet sync, real per-rep auth (Supabase Auth
email magic-link — see "Real auth" below), mock-only where the spec
explicitly still defers work: no PHI fields anywhere in the schema. The
mock/offline store (used when no Supabase project is configured) still
completes sign-in immediately against a seeded email for zero-setup local
running — see that section for what's real vs. simulated in which mode.

## Running it

```bash
npm install
cp .env.example .env.local   # fill in from Supabase project settings → API
npm run dev
```

Without `.env.local`, the app falls back to a localStorage-only mock store
(same data, no shared state) — see `src/data/store.ts`.

## Structure

- `src/data/schema.ts` — the data model (products, clinics, reps, refills,
  licensed states, certification), typed exactly to the spec's section 3.
- `src/data/seed.ts` — mock seed data, matching `supabase/migrations/`'s seed
  migration for continuity with what's already been shown to the client
  (Vixen Wellness, Sculpted MD, P-0417, the 7 confirmed states).
- `supabase/migrations/` — the real schema, views, RPC functions, RLS
  policies, and seed data, in the order they were applied to the live
  project. Replay with the Supabase CLI (`supabase db push`) against a fresh
  project if this ever needs to move.
- `src/data/store.ts` — picks `supabaseStore.ts` or `mockStore.ts` depending
  on whether Supabase env vars are set, and re-exports one unified surface.
  Nothing else in the app imports from either implementation directly.
- `src/data/supabaseStore.ts` — the real data-access layer. This is where
  the two critical logic pieces the spec calls out live *in the database
  itself*, not in application code:
  - **Approval gate** (spec 4.1) — the `public_products` Postgres view masks
    concentration/pricing for any `pending_review` row (returns "Under
    review" + null prices) before the row ever reaches the public site's
    query; `products` (the full table, incl. `rep_note`) is what the portal
    queries instead. The row always appears, flagged, never silently
    dropped.
  - **Clinic ownership locking** (spec 4.2) — `log_clinic_contact()`, an
    atomic `SECURITY DEFINER` Postgres function (`SELECT ... FOR UPDATE`
    inside), not a client-side check-then-update. First rep to call it for
    a clinic owns it; anyone else gets back a named "owned by, since"
    result. Being atomic in the database closes the race condition a naive
    read-then-write in JS would have between two reps tapping the button at
    the same instant.
  - **Refill status** (spec 4.3) — `refills_with_status` view, computed from
    `current_date` on every query, never stored.
  - **Certification grading** — `submit_certification_attempt()`, another
    atomic function, so correct answers never round-trip to a client that
    could just read them off the network tab.
- `src/data/mockStore.ts` — the original localStorage-only implementation,
  kept as the fallback for anyone running this without a Supabase project.
- `src/pages/portal/ManageProducts.tsx` — the **authoritative** way to edit
  a product. A structured form (dropdowns for category/status, number
  fields for price) that calls `upsert_product()` — matches by id, diffs
  every field against the existing row, and writes each change to
  `product_change_log`. A blank id creates a new product with a generated
  slug id (see `phase1_6_upsert_product` migration).
- `supabase/functions/sync-products-sheet/` — the Google Sheet sync (Phase
  1.5, run ahead of schedule since it was asked for directly), now
  **import-only**: it creates a product from a Sheet row whose name isn't
  in the database yet, and does nothing to a row whose name already
  exists (reported back as `alreadyExists`, not applied) — so it can never
  overwrite an edit made through the portal form above. Matches by product
  **name** (Cindy edits by name, never sees internal ids) — see
  `products_name_key` in the schema migration. Browser invokes need CORS
  on the function (OPTIONS + `Access-Control-Allow-*` on every response);
  redeploy with `npx supabase functions deploy sync-products-sheet
  --project-ref xlboikexmfymcewfvpog` after changing the function. See
  `GOOGLE_SHEET_SYNC_SETUP.md` for Sheet/service-account secrets and the
  deploy command. Triggered manually via "Import new products from Sheet"
  on the portal Dashboard — no scheduling yet, see that doc's last section.
- `src/auth/AuthContext.tsx` — current-rep session state.
- `src/layouts/` — `PublicLayout` (provider site nav) and `PortalLayout`
  (auth-gated, sidebar nav). Both apply `data-surface` so the same CSS
  custom properties in `src/index.css` repaint per surface — public is warm
  paper, portal is dark, matching the concept site's design language.
- `src/pages/public/` and `src/pages/portal/` — one file per screen, matching
  section 5 of the spec 1:1.

## Real auth (Supabase Auth email magic-link)

Portal sign-in is real Supabase Auth (`signInWithOtp`), not a rep-picker —
`getCurrentRep()` resolves the logged-in rep from the *verified* email on
the session, never a client-supplied id. The three mutation RPCs
(`log_clinic_contact`, `submit_certification_attempt`, `upsert_product`)
independently derive the acting rep the same way, server-side, via
`auth.email()` — they no longer accept a rep id/name from the caller at
all, so a forged identity isn't possible even with direct API access.
`upsert_product` additionally requires `role = 'admin'` (see migration
`phase1_8_real_auth_hardening.sql`). Table/view read access moved from
`anon` to `authenticated` to match — only `public_products` (the
public-site reference) is still anon-readable.

Auth config (`site_url`, `additional_redirect_urls`) is managed through
`supabase/config.toml` + `supabase config push`, not the dashboard — see
that file's `[auth]` section. Two things this repo's automation genuinely
can't do: send itself a magic-link email and click it, or know whether
Supabase's default email sending (rate-limited, ~1/minute per address) is
sufficient for a real demo vs. needing custom SMTP configured in the
dashboard. Confirm actual delivery by hand before relying on this for
anything beyond internal review.

The mock/offline store (no Supabase project configured) keeps a simulated
version — `requestMagicLink` completes the session immediately for a
seeded rep's email, no real email involved — purely so the app still runs
for anyone who clones the repo without setting up a backend.

## Design tokens

`src/index.css` holds a best-effort reconstruction of the "Clinical
Editorial" system described in the spec (Fraunces + Inter + IBM Plex Mono,
teal/vermilion/gold accents, warm paper / dark portal). The real values live
in `agerite-concept-site.html`, which wasn't available when this was built —
swap the `--surface-*` custom properties for the real ones before this goes
in front of the client.

## Build order

Following the spec's milestone sequence (section 7): data model + seed data,
product reference with the approval gate, portal auth + dashboard, pipeline
+ ownership locking, refills, territory & contacts, certification, licensed
states. All eight are implemented and independently reachable from the
portal nav, verified end to end against the live Supabase project.

## Not yet built (explicitly out of scope for Phase 1, per spec section 8)

Telehealth/membership platform, real production auth/SSO, commission
reconciliation, any patient-identifying data field, CBD/MSO/association
material. (Google Sheet sync *is* now built — see above — it was originally
on this list as a Phase 1.5 item but got pulled forward on request.)
