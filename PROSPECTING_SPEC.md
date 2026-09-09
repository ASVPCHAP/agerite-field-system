# AGErite Field System — Prospect Search Build Spec
**For: Claude Code**
**Prepared by: Anthony Chapman / Rockwall Partners**
**Status: Addendum to PHASE1_SPEC.md — read this after that spec, not instead of it**

---

## 0. What this is and isn't

A rep's own Kylon agent should be able to search the ICP-tiered clinic list — "who in Rockwall core is Tier 1 and unowned?" — instead of opening the portal and filtering the Territory table by hand.

This is a **read-only** search surface. It does not claim clinics, does not log contacts, and does not touch `patients_refills` or `products` at all. Everything a rep can already do by hand in Pipeline/Territory (claim, log a contact) stays exactly as it is — this only adds a way to *find* things faster. That scope is deliberate: no per-rep identity is needed on this endpoint precisely because it can't write anything, which keeps this addition small. If write access from an agent is wanted later, that's a new, separate spec — don't fold it into this one.

---

## 1. New Edge Function: `prospect-search`

Same shape as `supabase/functions/sync-products-sheet`: a Deno Edge Function using the service-role client and the shared `_shared/cors.ts` headers. GET only.

**Query params** (all optional, combine with AND):
- `tier` — `T1` | `T2` | `T3`
- `segment` — substring match, case-insensitive
- `cluster` — exact match against `clinics.cluster`
- `city` — exact match against `clinics.city`
- `q` — free-text, case-insensitive substring match against `clinics.name`
- `limit` — default 25, max 100

**Query**: `clinics` left-joined to `reps` on `owner_rep_id`, filtered per the params above. No filter on `stage` — a rep should be able to find an already-onboarded clinic through this too (e.g. "who's the owner of Sculpted MD"), not just open prospects.

**Response shape** — one object per clinic:
```json
{
  "id": "cl6",
  "name": "Sculpted MD Rockwall",
  "city": "Rockwall",
  "segment": "HRT/TRT · weight loss · peptides · aesthetics",
  "tier": "T1",
  "cluster": "Rockwall core",
  "website": "https://sculptedmd.com",
  "stage": "identify",
  "next_step": "Initial drop-in",
  "ownership": { "status": "unowned" }
}
```
or, when owned:
```json
"ownership": { "status": "owned", "owner_name": "Jordan Reyes", "last_touch_at": "2026-08-28" }
```
`last_touch_at` is `clinics.last_touch_at` as-is — **the date of the most recent contact, not the claim date.** `log_clinic_contact` bumps this column on every contact by the owning rep, not just the first one, so it drifts forward over time. There's no separate "claimed_at" column in the schema, and adding one is out of scope here — don't call this field `since` or imply it's a claim date anywhere in the implementation.

**Never return**: anything from `products`, `patients_refills`, or `rep_note`. This endpoint has no relationship to those tables at all — don't join them in "for convenience."

## 2. Auth

One shared secret, e.g. `PROSPECT_SEARCH_KEY`, checked as a bearer token:
```
Authorization: Bearer <key>
```
Missing or wrong key → `401`. This is deliberately not per-rep — there is nothing to attribute a write to, so there is nothing per-rep identity would protect. Store the key as a Supabase secret (`supabase secrets set PROSPECT_SEARCH_KEY=...`), same mechanism as the existing `GOOGLE_*` secrets.

Wiring this key into a rep's Kylon agent (as a `kylon workspace connection secret`, or inside an MCP wrapper — whichever turns out to fit Kylon's actual tool-calling model once tested against a live workspace) is a Kylon-side task, not part of this function. This function's only job is to exist and enforce the bearer check.

## 3. Explicitly out of scope

- Claiming a clinic, logging a contact, or any other mutation — see section 0.
- Per-rep auth/attribution.
- Any field from `products` or `patients_refills`.
- Rate limiting beyond what Supabase Edge Functions already provide by default — add it later only if usage patterns actually call for it.

## 4. Definition of done

- `GET /prospect-search?tier=T1&cluster=Rockwall%20core` with a valid bearer key returns unowned and owned Tier-1 Rockwall-core clinics, each correctly flagged.
- A request with no key, or the wrong key, returns `401` and touches no data.
- No code path in this function contains an `insert`, `update`, or `delete` against any table.
