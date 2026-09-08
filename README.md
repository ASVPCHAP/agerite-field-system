# AGErite Field System — Phase 1

Provider site + Integrative Concepts field portal, built against `PHASE1_SPEC.md`
(see the rockwallpartners engagement docs). React + TypeScript + Vite + Tailwind
CSS v4.

## Status

Prototype phase, exactly as the spec calls for: **mock data only**, no real
Supabase/Postgres, no Google Sheet sync, no PHI fields anywhere in the schema.
Auth is a "pick a rep" stand-in for magic-link. All of this is designed to be
swapped for the real backend without restructuring the app — see
`src/data/store.ts`.

## Running it

```bash
npm install
npm run dev
```

## Structure

- `src/data/schema.ts` — the data model (products, clinics, reps, refills,
  licensed states, certification), typed exactly to the spec's section 3.
- `src/data/seed.ts` — mock seed data, continuous with what's already been
  shown to the client (Vixen Wellness, Sculpted MD, P-0417, the 7 confirmed
  states).
- `src/data/store.ts` — the entire data-access layer. Every function is
  `async` and returns plain data, so this is the one file that gets replaced
  with real Supabase calls later; nothing that imports from it needs to
  change shape when that happens. This is also where the two critical logic
  pieces live:
  - **Approval gate** (`listPublicProducts` vs `listRepProducts`) — filtering
    happens here, not in the UI. A `pending_review` product is masked
    (concentration/price withheld) for the public site and fully visible
    with a "do not quote" flag for reps; never silently dropped from either.
  - **Clinic ownership locking** (`logClinicContact`) — first rep to log a
    touch owns the clinic; anyone else is blocked with a named
    "owned by, since" result, never allowed to silently overwrite.
- `src/auth/AuthContext.tsx` — current-rep session state.
- `src/layouts/` — `PublicLayout` (provider site nav) and `PortalLayout`
  (auth-gated, sidebar nav). Both apply `data-surface` so the same CSS
  custom properties in `src/index.css` repaint per surface — public is warm
  paper, portal is dark, matching the concept site's design language.
- `src/pages/public/` and `src/pages/portal/` — one file per screen, matching
  section 5 of the spec 1:1.

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
portal nav.

## Not yet built (explicitly out of scope for Phase 1, per spec section 8)

Telehealth/membership platform, real Google Sheet sync, real production
auth/SSO, commission reconciliation, any patient-identifying data field,
CBD/MSO/association material.
