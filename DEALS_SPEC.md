# AGErite Field System — Deal Pipeline, Company Pages & Contacts Spec
**For: Claude Code**
**Prepared by: Anthony Chapman / Rockwall Partners**
**Status: Approved design, not yet built — this is the spec, implementation follows via a separate plan**

---

## 0. What this is

Three connected pieces, approved together as one design (brainstormed
2026-09-10, researched against current B2B/medical-field-sales pipeline
practice — see "Research basis" below):

1. A **company page** per clinic (and a lighter one per lead) — click a
   name anywhere in the CRM, land on one page with that account's deal,
   contacts, order history, and activity log.
2. A **Contacts** entity — real people at a clinic (name, role, phone,
   email, decision-maker flag), replacing the current single
   `phone`/`email` pair on `clinics`.
3. A **Deal Pipeline** — `introduction → meeting_set → follow_up →
   closed_won | closed_lost`, replacing the existing flat Pipeline tab
   and the selling-phase portion of `clinics.stage`.

**Research basis**: modern B2B pipelines run 5-6 stages representing
buyer milestones, not rep activity. Generic templates include a
Negotiation stage; AGErite has fixed pricing, so it's correctly absent
from the five stages below — this isn't a simplified version of the
standard pipeline, it's the standard pipeline with the one
non-applicable stage removed. Deal cards should carry next step and
target close date, not just a label. Closed-lost deals should carry a
reason code. Medical/pharma-adjacent field sales specifically call out
multi-stakeholder tracking — knowing *who* at an account you're talking
to, not just "the clinic" — as the differentiator, which is what the
Contacts piece and activity→contact linking are for.

## 1. Why `clinics.stage` had to change

Before this, `clinics.stage` did two jobs at once:
`identify → drop_in → discovery → solution` (the sale) and
`onboard → reorder` (the account afterward). That conflation is exactly
why a "deal pipeline" didn't already exist — there was one field trying
to answer two different questions. This spec splits it: a `deals` row
answers "where is the sale," `clinics.stage` collapses to a simple
derived status answering "what kind of account is this."

## 2. Data model

**`deals`** — one row per sales cycle on a clinic. A clinic can have
deal history (not enforced unique on `clinic_id`), but v1 only ever
creates one open deal per clinic (via `promote_lead`) and never opens a
second one automatically — reopening a lost clinic or starting a new
deal on an active account is explicitly out of scope for this pass (see
section 6).

- `id, clinic_id, stage, next_step, target_close_at, closed_at,
  lost_reason, opened_at`
- `stage`: `'introduction' | 'meeting_set' | 'follow_up' | 'closed_won'
  | 'closed_lost'`
- `lost_reason`: free text, only meaningful when `stage = 'closed_lost'`
  — a short picker in the UI (competitor / budget / no response / not a
  fit / other), stored as text like every other enum-ish field in this
  app.
- No owner column — a deal belongs to whoever owns the clinic
  (`clinics.owner_rep_id`). Same ownership-lock rule as activities: only
  the owning rep can advance or close a deal; an unowned clinic's deal
  can be acted on by anyone, which claims ownership (mirrors
  `log_activity`'s clinic path exactly).
- `next_step` moves here from `clinics.next_step` — it's a deal-cycle
  concept, not a clinic-lifetime one. `clinics.next_step` is dropped.

**`clinics.stage` simplifies** to `'in_pipeline' | 'active' | 'lost'`:
- `in_pipeline` — has an open deal (introduction/meeting_set/follow_up)
- `active` — most recent deal is `closed_won` (this is today's
  `'reorder'` — Orders/Refills/Dashboard's "active clinics" logic just
  reads this new value instead)
- `lost` — most recent deal is `closed_lost`, nothing open

This is a stored column (not a computed view field), kept in sync by
the same RPCs that change deal stage — cheap to query for
Dashboard/Analytics/Refills exactly like today, no join required for
the common case.

**`contacts`**: `id, clinic_id, name, role, phone, email,
is_decision_maker`. Clinics only — a lead has no named person yet by
definition (nobody's talked to them). `clinics.phone`/`clinics.email`
are dropped once every clinic's real contacts are in the new table (a
one-time migration step: promote each clinic's existing phone/email
into a single unnamed "Main contact" row, so nothing is silently lost).

**`activities` gains `contact_id`** (nullable, references `contacts`) —
`log_activity()` takes an optional `p_contact_id`. Still works with
none given, for a quick log with no specific person attached.

## 3. Company page

New route `/portal/crm/clinics/:id`. Header: name, city, segment, tier,
cluster, owner, status pill (in pipeline / active / lost). Four
sections below:

- **Deal** — current stage, next step, target close date. A stage
  selector across the three open stages (a rep can move a deal
  backward as well as forward — no one-way ratchet, mis-clicks happen),
  plus two distinct actions: **Close — Won** and **Close — Lost** (the
  latter opens the reason picker). Once closed, the deal is locked; no
  editing a closed deal's stage.
- **Contacts** — the list (name, role, phone, email, decision-maker
  flag as a pill), an "Add contact" form, and a **Log activity** button
  per contact that opens the existing `LogActivityForm` pre-filled with
  that contact.
- **Orders** — reuses `OrdersHistory`/`orderTotals` (built for the
  SiCompounding preview data) plus a trailing-12-month total specifically
  (a new `orderTotals` variant that takes a date cutoff).
- **Activity history** — reuses `ActivityHistory`, extended to show
  which contact was involved when `contact_id` is set ("Visit · Marcus
  · with Dr. Smith" vs. today's "Visit · Marcus").

**Leads get a lighter version** of this same route shape
(`/portal/crm/leads/:id`, or leads render at the same company-page
component keyed by type) — name, city, segment, tier, cluster, and a
**Promote to pipeline** button. No Deal/Contacts/Orders/Activity
sections; none of that exists before promotion.

## 4. Deal Pipeline — replaces the flat Pipeline tab

`/portal/crm/pipeline` (URL unchanged, contents replaced; the
`CrmLayout` nav label changes from "Pipeline" to "Deal Pipeline" so the
tab name matches what's actually there). Five stage
columns — **Introduction / Meeting set / Follow-up meeting / Close sale
/ Close lost** — each listing the open (or, for the last two, closed)
deals currently there: clinic name (links to the company page), owner,
next step, target close date. Closed columns are historical reference,
not an active working queue — no actions live there beyond viewing.

This fully retires the old flat table (name/city/segment/tier/stage/
owner/next_step columns, inline Log Activity/History panels) — that
view's job is now split between the Deal Pipeline (where's the sale)
and the company page (everything else about one account).

## 5. What changes in already-built features

- **Leads.tsx** — `state` bucketing (`prospecting`/`pipeline`/`active`)
  now reads `clinics.stage === 'in_pipeline'` / `'active'` instead of
  `stage !== 'reorder'` / `stage === 'reorder'`. Clinic names become
  links to the company page. Gains a fourth bucket, `'lost'`
  (`STATE_LABEL`/`STATE_BORDER`/filter option, same pattern as the
  existing three) — a dim/muted row, included in the state filter
  dropdown but not counted toward the headline
  prospecting/pipeline/active split.
- **Dashboard.tsx** — "Active clinics" section's `stage === 'reorder'`
  filter becomes `stage === 'active'`. "Your territory" stage-count
  pills (identify/drop_in/discovery/solution/onboard/reorder) get
  replaced by deal-stage counts for the rep's own open deals.
- **Analytics.tsx** — funnel's `pipeline`/`active` counts read the new
  stage values; "by tier"/"by cluster" breakdowns unaffected in shape.
- **`promote_lead()`** — creates the clinic row *and* an opening deal
  (`stage = 'introduction'`) in the same transaction, instead of a bare
  `clinics` row at `stage = 'drop_in'`.
- **`log_activity()`** — clinic path still does first-touch ownership
  claim exactly as today; gains the optional `p_contact_id` param;
  no longer bumps `clinics.stage` itself (that was the
  `identify → drop_in` transition, which doesn't exist anymore — a
  logged visit on a lead still promotes it, same as today, since that
  path is unrelated to the stage rename).
- **CrmOverview.tsx** — its three tiles (prospecting/pipeline/active)
  read the renamed stage values; unaffected otherwise.

## 6. What this doesn't do

- **No multi-deal history UI.** The schema allows more than one deal
  per clinic over time, but nothing in this pass creates a second deal
  — no "reopen this lost clinic" or "start a new deal on this active
  account" action. Add it if reps actually hit that need.
- **No deal value/dollar estimate field.** Research flagged this as
  common practice, but AGErite's pricing is fixed and per-order (see
  the Orders preview work) rather than a single deal-sized number —
  deliberately left out rather than inventing a figure that doesn't map
  to how AGErite actually prices.
- **No pipeline-stage change history/audit log.** A deal shows its
  *current* stage and `opened_at`/`closed_at`; it doesn't log every
  intermediate stage transition the way `activities` logs a timeline.
  Add a `deal_stage_changes` table later if that history matters.
- **No automatic contact sync from SiCompounding or anywhere else** —
  contacts are entered by reps by hand, same as every other piece of
  data in this app that isn't explicitly wired to a real source.

## 7. Build order (for the implementation plan)

1. Migration: `deals`, `contacts` tables; `clinics.stage` value
   rename/simplify; drop `clinics.next_step`/`phone`/`email` (after a
   data-preserving backfill into `contacts`); update `promote_lead()`,
   `log_activity()`, `reset_demo_data()`.
2. Mock + Supabase store parity for all of the above (`listDeals`,
   `listContacts`, `upsertContact`, `advanceDealStage`, `closeDeal`).
3. Company page (clinic version first, then the lighter lead version).
4. Deal Pipeline page (replaces Pipeline route contents).
5. Update Leads/Dashboard/Analytics/CrmOverview for the renamed stage
   values.
6. Update `CRM_SPEC.md`/`CRM_USER_GUIDE.md` to point at this doc for
   sections 3 (pipeline tabs) and 7 (activity logging) rather than
   duplicating — those sections describe the pre-this-spec shape and
   should be marked superseded, not silently left contradicting this
   one.
