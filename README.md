# AGErite Field System — Phase 1

Provider site + Integrative Concepts field portal, built against `PHASE1_SPEC.md`
(see the rockwallpartners engagement docs). React + TypeScript + Vite + Tailwind
CSS v4, backed by a real Supabase Postgres project.

## Status

Real database, mock-only around its edges where the spec explicitly defers
that work: no Google Sheet sync yet (Phase 1.5, per spec), no PHI fields
anywhere in the schema, and no real per-rep Supabase Auth session yet — login
is a "pick a rep" stand-in for magic-link, reading real rows from the `reps`
table. See "Known gap" below for exactly what that means and what closes it.

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
- `src/auth/AuthContext.tsx` — current-rep session state.
- `src/layouts/` — `PublicLayout` (provider site nav) and `PortalLayout`
  (auth-gated, sidebar nav). Both apply `data-surface` so the same CSS
  custom properties in `src/index.css` repaint per surface — public is warm
  paper, portal is dark, matching the concept site's design language.
- `src/pages/public/` and `src/pages/portal/` — one file per screen, matching
  section 5 of the spec 1:1.

## Known gap: no real per-rep auth yet

Both the public site and the portal currently call Supabase with the same
anon key — there's no real Supabase Auth session distinguishing "a rep is
logged in" from "an anonymous visitor" at the database level. Practically:

- RLS policies grant `anon` read access broadly; the public/portal
  separation for product data is enforced by which table/view each surface
  queries (`public_products` vs `products`), not by two different
  permission levels. A technically sophisticated visitor holding the
  published anon key could query `products` directly and see rep notes.
- The three mutation paths (ownership claim, certification grading, demo
  reset) are locked behind `SECURITY DEFINER` functions with `anon`-only
  execute grants — so no direct table writes are possible from the client,
  regardless of the above.

Closing this fully means wiring real Supabase Auth (magic-link, per the
original spec — "sufficient for prototype," not full SSO) so rep requests
carry an authenticated JWT and RLS can gate on `auth.uid()`. That needs two
things this session couldn't do headlessly: an Auth redirect URL added in
the Supabase dashboard (Authentication → URL Configuration), and someone
with a real inbox to click the link and confirm delivery. Worth doing before
this is used for anything beyond an internal review.

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

Telehealth/membership platform, real Google Sheet sync, real production
auth/SSO, commission reconciliation, any patient-identifying data field,
CBD/MSO/association material.
