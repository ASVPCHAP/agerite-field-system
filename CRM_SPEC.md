# AGErite Field System — CRM (Leads / Pipeline / Analytics) Spec
**For: Claude Code**
**Prepared by: Anthony Chapman / Rockwall Partners**
**Status: Built — this documents what shipped, not a plan for later**

---

## 0. What this is

A CRM section inside the existing portal, reached via one "CRM" nav item
(`/portal/crm`), with three sub-tabs: **Leads**, **Pipeline**, **Analytics**.
This isn't a new app bolted on — Pipeline already existed as its own
top-level page; it moved under this section rather than staying a
duplicate concept next to Leads. The one genuinely new piece is **Leads**
and the `leads` table behind it.

## 1. Why a separate `leads` table

Before this, `clinics` was the only place a business existed in the system
— and the GTM playbook's own rule says not to load one there until someone
has actually engaged it ("don't load a clinic into the tracker just
because you plan to visit"). That meant the full 100-prospect target list
from the playbook had never actually been loaded into the app — there was
no "who haven't I even looked at yet" view at all, only whatever a rep
happened to already be working.

`leads` is that raw, pre-engagement list. A lead has no owner, no stage,
no contact log — those only mean something once someone's actually working
it, which is exactly what promotion marks.

## 2. Data model

**`leads`**
- `id, name, city, segment, tier (T1/T2/T3), cluster, website, status
  (new/contacted/promoted/disqualified), promoted_clinic_id (nullable, set
  by promotion), created_at`
- RLS: `authenticated` read-only from the client. No `insert`/`update`
  path for the client — the only way a lead's status changes is through
  `promote_lead()`, a `security definer` function, same pattern as every
  other mutation since the phase1_8 auth hardening.

**`promote_lead(p_lead_id, p_next_step default 'Discovery call') returns clinics`**
- Resolves the acting rep from `auth.email()` — no client-supplied
  identity, matching every mutation since phase1_8.
- Creates a real `clinics` row **and claims it for the promoting rep in
  the same step** (`stage = 'drop_in'`, `owner_rep_id` = that rep) —
  mirrors `log_clinic_contact`'s ownership-claim semantics rather than
  creating an unowned clinic someone would then have to separately claim.
  This matches how the feature was actually described: promoting a lead
  means "I looked at this and I'm working it now," not "add this to a
  queue."
- Marks the source lead `status = 'promoted'` and records which clinic it
  became, so there's a trace back.
- Rejects promoting an already-promoted lead (raises, doesn't silently
  no-op) — the caller sees exactly why.

## 3. The three tabs

**Leads** — not just the raw `leads` table. It's a unified "book of
business" view combining `leads` and `clinics` into one filterable list,
each row tagged by what it actually is:
- **Prospecting** (gold) — a `leads` row, `status` new or contacted
- **In pipeline** (teal) — a `clinics` row, any stage except `reorder`
- **Active account** (vermilion) — a `clinics` row at `stage = 'reorder'`

This is what replaced the old standalone Territory & Contacts page — that
page only ever showed `clinics` (filtered/grouped by cluster), which is
exactly the "in pipeline / active" two-thirds of this same view. Folding
it in here instead of keeping it separate avoids two different screens
both claiming to answer "who's out there."

Filters: cluster, tier, state (prospecting/pipeline/active), free-text
search — same filter shape Territory & Contacts already had, extended to
cover leads too. Only `leads` rows get a "Promote to pipeline" action;
`clinics` rows (pipeline/active) don't — working an already-promoted
account happens on the Pipeline tab, not here.

**Pipeline** — unchanged functionally from the page it replaced (log
contact, ownership-lock messaging, stage/owner/next-step columns) — just
relocated under `/portal/crm/pipeline` instead of being a standalone
top-level nav item.

**Analytics** — a funnel (Prospecting → In pipeline → Active, sized by
count) as the one bold element, plus two supporting breakdown tables (by
tier, by cluster). Deliberately not a general reporting engine — this is
the first cut, sized to what the three states above actually need shown;
add tiles later if real usage calls for it, not preemptively.

## 4. Seed data

24 of the real 100 prospects from `agerite-gtm-playbook.html`'s target
list — verbatim names/cities/segments/tiers, spanning all six real route
clusters (Rockwall core, Lake cities, Garland/Firewheel, Forney/Terrell/
Kaufman, Greenville/Royse City/Caddo Mills, Mesquite/Sunnyvale) and all
three tiers. A representative slice, not the full 100 — enough to
demonstrate the funnel without hand-transcribing the whole list.

**Known inconsistency, not fixed here:** the five pre-existing `clinics`
seed rows use placeholder territories (`Rockwall–Fate`, `North Houston`,
`Cypress`) that don't match these real clusters at all — that mismatch
predates this work and is a specific, concrete finding for the seed-data
audit, not something to silently paper over by inventing a mapping here.

## 5. What this doesn't do

- **No lead creation/editing from the UI.** Leads are seeded (or,
  eventually, imported the way products are) — there's no "add a lead"
  form. Out of scope until there's an actual source of new leads beyond
  seed data.
- **No "mark contacted" action.** A lead only ever moves via promotion
  right now. Marking `status = 'contacted'` without promoting is a real,
  plausible future need, not built because it wasn't part of what was
  asked for — add it if reps actually want to log "I called, no answer"
  without committing to working the account yet.
- **No lead disqualification UI.** The `status` enum includes
  `disqualified` for future use; nothing sets it yet.
