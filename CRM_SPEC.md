# AGErite Field System — CRM (Leads / Pipeline / Analytics / Find Prospects) Spec
**For: Claude Code**
**Prepared by: Anthony Chapman / Rockwall Partners**
**Status: Built — this documents what shipped, not a plan for later**

---

## 0. What this is

A CRM section inside the existing portal, reached via one "CRM" nav item
(`/portal/crm`), with four sub-tabs: **Leads**, **Pipeline**, **Find
Prospects**, **Analytics**. This isn't a new app bolted on — Pipeline
already existed as its own top-level page; it moved under this section
rather than staying a duplicate concept next to Leads. The genuinely new
pieces are **Leads** (and the `leads` table behind it), **Find
Prospects**, and activity logging (section 7).

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

## 5. Find Prospects — a fourth tab, added after the initial build

The original plan considered an AI-powered prospecting search paying for
its own LLM calls (and, separately, real phone/email enrichment via a
paid business-data API). Both were dropped in favor of a genuinely $0
approach: **the rep runs the research on their own free AI account, we
just make that easy and keep the results out of duplicate/messy data.**

**How it works, no backend at all:**
1. Rep picks a category (Med spa / Hormone clinic / Small hospital system
   / CBD-THC store) and an area (the real clusters already in the data).
2. **Generate prompt** builds a research prompt client-side — task framing,
   AGErite's actual ICP criteria (owner-operated, cash-pay, has a
   prescriber — pulled from the real criteria in
   `agerite-gtm-playbook.html`, not invented), and critically **the names
   of leads/clinics already in that area**, so the rep's AI is told to
   skip duplicates. Requests one plain line per result:
   `Name | City | Phone | Email | Website`.
3. Rep copies it into their own ChatGPT/Claude/Perplexity account (their
   cost, not ours — reps are encouraged to use a free-tier account),
   pastes the raw response back into the tool.
4. Client-side parsing (plain string split on `|`, no AI involved) turns
   that into an **editable preview table** — not yet saved.
5. Rep sets tier per row (an outside AI can't know AGErite's fit
   judgment — this is the one thing a human still decides), fixes
   anything wrong, removes anything bad, then **Import** batch-inserts
   via a plain `insert` grant on `leads` — no RPC needed, since a new
   lead has no owner/identity to derive server-side, unlike every
   mutation since phase1_8.

**Schema addition**: `leads.phone`, `leads.email`, `clinics.phone`,
`clinics.email` — nothing needed these before this. `promote_lead()`
carries phone/email forward so a promoted lead's research isn't dropped.

**What this doesn't do**: no LLM call, no phone/email enrichment API, no
auto-dedup beyond the "skip these" prompt instruction (the rep's AI could
still return a near-duplicate under a slightly different name — nothing
catches that automatically; a human reviewing the preview table before
import is the actual check).

## 6. Sales-analytics assistant (leadership only) — Analytics tab

A free-text "ask about sales numbers or reports" panel at the bottom of
Analytics, visible only to reps with `is_leadership = true`. Unlike Find
Prospects, this one genuinely needs a model call — the question is open-
ended, not a structured lookup. OpenRouter was chosen specifically to
route to a free-tier model instead of a metered frontier one; see
`OPENROUTER_SETUP.md` for the one setup step only you can do.

**Access is a separate permission from `role`.** `role = 'admin'` gates
Manage Products (Cindy's PIC/pharmacy-compliance function) —
`is_leadership` gates this assistant. They overlap for Cindy but not for
Ron/Melissa (Integrative Concepts ownership, `role = 'rep'`) or Anthony
(`role = 'rep'`), who need the assistant without picking up
product-editing rights they were never asked to have. Enforced twice,
independently: `RequireLeadership`-style conditional render client-side,
and the `crm-assistant` Edge Function re-derives the caller's identity
from their session and re-checks `is_leadership` server-side before
calling OpenRouter at all — the client-side check is a UX nicety, not
the real gate.

**How it works**: `crm-assistant` (a new Edge Function) verifies the
caller's session (forwarded automatically by `supabase-js` — this
function, unlike `prospect-search`, keeps Supabase's platform JWT
verification ON, since it's only ever called from inside the already-
authenticated portal), checks `is_leadership`, pulls a compact text
summary of reps/leads/clinics/refills/products/recent changes using the
service-role key, and sends that plus the rep's question to OpenRouter in
one request — no multi-turn tool-calling, no conversation memory across
questions, matching the same "this dataset doesn't need that complexity"
reasoning as Find Prospects.

**What this doesn't do**: no write access (answers questions, doesn't
change data), no conversation history (each question is independent),
and it can only answer from the data summary it's given — it has no way
to browse further or fetch something not included in that summary.

## 7. Activity logging — replaces `log_clinic_contact`

Before this, a clinic had a single `next_step`/`last_touch_at` — the
latest state, no history of what actually happened. A new `activities`
table (`lead_id`/`clinic_id`, exactly one set — a real check constraint,
not just documented intent — `rep_id`, `type`, `notes`, `occurred_at`)
replaces that with a proper timeline, on both Leads and Pipeline.

**`log_activity()` replaces `log_clinic_contact()`** — the ownership-lock
logic had to live somewhere, and it's the same rule either way:
- **On a clinic**: identical lock semantics to before (first touch claims
  it, blocked-with-owner-name for anyone else) — now also writes a real
  history row instead of only overwriting `next_step`.
- **On a lead**: logging a `visit` *is* the promotion — same effect as
  `promote_lead()` (which stays, unchanged, for the standalone "Promote
  to pipeline" button — this is a second path to the same outcome, not a
  replacement). Matches how it was actually described: a rep can call or
  text a lead without committing to anything, but an in-person visit is
  the moment a real relationship starts. Any other type just bumps
  `status` from `new` to `contacted`. Logging against an already-promoted
  lead is refused with the resulting clinic id, not silently accepted.

**Real UX change, not just an addition**: Pipeline's one-click "Log
contact" became a small form (type, notes, date) — worth knowing since
it changes a flow reps already used, not just adds a new one.

**Viewing history**: neither Leads nor Pipeline had anywhere to see past
activity before this — both now have a "History" action per row (a
simple chronological list: date, type, rep, notes).

**What this doesn't do**: no editing or deleting a logged activity once
saved, no activity-level notifications, and `'email'` is a loggable type
now (manually) but nothing auto-populates it yet — that's the separate,
larger "pick up emails automatically" effort, deliberately scoped out of
this pass (OAuth with each rep's actual inbox, ongoing sync, matching
messages to the right clinic — closer in size to the phone/email
enrichment idea already punted on for Find Prospects than to anything
built so far).

## 8. What this doesn't do

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

## 9. Wider portal fixes/scoping, same pass as activity logging

A few requests landed that touch screens outside the CRM proper
(Dashboard, Refills, Knowledge) — noted here rather than a separate doc
since they're small and came out of the same conversation.

**Fixed**: native `<option>` popups were rendering with inherited light
text on the browser's own white background — invisible. One rule in
`index.css` (`select option { color; background }`) fixes it everywhere,
instead of patching every `<select>` individually.

**Added**: a plain-language T1/T2/T3 explanation (strong ICP fit → work
first / decent fit / partial-or-unconfirmed, lowest priority) next to
the tier controls on Leads and Find Prospects — tiers had never been
defined anywhere a rep could see them.

**Knowledge base → Resources**: same underlying `products` data, now
three tabs instead of one table — **Pricing & protocols** (the original
table, category column added), **Service areas** (products grouped by
`category`, answers "do you do X" without opening pricing), and
**Printable documents** (placeholder — no document storage exists yet;
this is the shape, not a real upload path. Add real storage when there's
an actual document to put in it, not before).

**Refills**: added the actual point of the screen in plain language
("gone quiet, follow up") — it already did this, just never said so.
Explicitly notes it runs off manually-tracked start dates, not a live
feed from AGErite's order system (SiCompounding) — see section 10.

**Dashboard — Active clinics**: a new section listing the current rep's
`stage = 'reorder'` clinics with contact info, a real **History** action
(reuses `ActivityHistory`), and an **Orders** action with real-looking
preview order volume — see section 10 for what that actually is.

**Explicitly deferred, mentioned but not started**:
- **Auto-pull a prospect's logo/company data from their website URL** —
  raised as a "when we redesign the platform" item, not a now item.
  Would need a scraping/enrichment source (paid, most likely) — same
  category of decision as the phone/email enrichment API already
  punted on in Find Prospects (section 5).
- **In-portal chatbot to help reps navigate/ask questions about the
  site itself** — raised as "would be cool," not scoped. Distinct from
  the section-6 sales-analytics assistant (that one answers questions
  about CRM *data*; this one would answer "how do I..." about the
  *app*). If pursued, it's the same low-cost OpenRouter pattern as
  section 6, not a new architecture.

## 10. Orders — preview data for the SiCompounding B2B Order API

AGErite compounds through SiCompounding, which offers a B2B Order API
built for exactly this: linking pharmacies to B2B partners and
automating order intake. Not yet integrated (no docs/credentials in
hand — AGErite confirmed the API exists, nothing's been exchanged yet),
but real enough that it changes what "Active clinics" and Refills
should look like today: built to the *shape* that API is expected to
return, populated with realistic preview numbers, so wiring the real
thing later is a data-source swap, not a rebuild.

**Data model**: new `Order` type (`schema.ts`) — `clinic_id, product_id,
size (5ml/10ml), quantity, status (submitted/processing/shipped/
delivered), ordered_at`. Read-only from the client (nothing in the UI
creates or edits an order — there's no write path, unlike activities).
Seeded only for `cl3` (the one reorder-stage demo clinic), six orders
spanning June–September, mixed statuses. Real Postgres table in
`orders` (migration `phase1_14_orders`), RLS read-only, same pattern as
`activities`.

`src/data/orders.ts` holds the shared value math (`orderValue`,
`orderTotals`) — an order's dollar value is `unit price (by size) ×
quantity`, looked up from the same `products` pricing every other
screen uses, not a separately-stored price. Keeps the preview numbers
consistent with whatever Resources/Pricing shows, and means a price
change flows through automatically.

**Where it shows up**:
- **Dashboard → Active clinics**: the "Order volume" column now shows
  a real dollar figure and order count computed from this preview data
  (previously a bare "Needs C integration" pill) — labeled "preview
  data" in the footnote, not presented as live.
- **Dashboard and Pipeline**: a new **Orders** action (reorder-stage
  clinics only) opens `OrdersHistory` — a per-clinic line-item list
  (date, product, size × qty, value, status), same expandable-row
  pattern as **History**/`ActivityHistory`.

**What this deliberately looks finished but isn't**: the numbers are
real arithmetic on real (seeded) rows, not placeholder text — that's
the point, so the demo reads as "this is what's coming," not "we
haven't thought about this yet." But it's still clearly labeled preview
data everywhere it appears; nothing claims to be a live SiCompounding
feed.

**What actually wiring SiCompounding would take, not started**: real
API credentials/docs from AGErite, a decision on push (webhook) vs.
poll for new orders, and swapping `listOrders`/the `orders` table's
contents for real API-backed data — the UI (`OrdersHistory`, the
Dashboard column) shouldn't need to change shape at all. Same applies
to Refills' due/lapsed detection, which today runs off manually-seeded
`patient_refills` start dates, not real order dates.

## 11. Resources — real documents and AGErite's actual current forms

Before this pass, "Resources" only had two real tabs (Pricing, Service
areas) plus a Documents placeholder with nothing in it. Two things
changed that: AGErite sent over the actual PDF leave-behinds/clinical
references they use, and separately confirmed how ordering actually
works today — not through this portal or SiCompounding yet, but through
a set of Jotform forms reps already use.

**Printable documents — now real.** Seven PDFs (2026-09-10 drop) live in
`public/documents/` and are listed in `Knowledge.tsx`'s `DOCUMENTS`
array (file name, title, one-line description) — compounded peptide
prescribing/price guide, peptides/topicals/injections reference,
hormones price sheet, GLP-1 dosing cards, GLP vials & prefilled
syringes, eScribe ordering instructions, and a "reasons to compound
tirzepatide/semaglutide" pitch sheet. Static files, served the same as
any other public asset — no upload UI, no Supabase Storage, no access
control beyond the portal's own login. **Worth knowing**: because
they're plain static files, the direct PDF URL works without being
logged in if someone has it (same as the public `ProductReference`
page already showing product info unauthenticated) — flagged here, not
silently decided, in case AGErite wants tighter access control on
these later. Adding more later is a copy-into-`public/documents/` +
one-array-entry change, nothing structural.

**Order & other forms — a new fourth tab**, added because it turns out
placing an order today doesn't go through this portal *or* directly
through SiCompounding — it goes through three separate Jotform order
forms (Weight Loss, Hormone, Injectables) plus a New Client Setup
Form & Provider Packet for onboarding a clinic. This tab just puts
those one click away from Dashboard/Resources instead of wherever reps
were finding them before — plain external links, nothing wired back
into this app's data. A **Place an order** quick action on the
Dashboard deep-links here (`?tab=forms`, read on mount by `Knowledge`).

**Also linked, with an important overlap flagged rather than resolved**:
- **Commission Tracker** (Jotform) — logs clinic/med spa visits for
  commission credit. Explicitly kept separate from this portal's
  activity log (section 7) — different purpose (payroll credit vs. CRM
  history), not merged, since that's a comp/payroll decision, not a UI
  one.
- **Provider/Clinic Tracker (legacy)** — this is the same job Pipeline's
  ownership lock already does (first rep to touch a clinic owns it,
  see section 3). No URL was provided for it, so it's listed without a
  working link rather than a guessed one. **Open question for
  Anthony/AGErite, not decided here**: once this portal is the system
  of record, should reps be told to stop checking the old tracker, or
  should both run in parallel during a transition? Left as two live
  systems until that's an explicit call.
- **AGErite Pharmacy website** (ageritepharmacy.com) — linked for
  completeness, no functional tie-in.

**What this doesn't do**: none of these forms' submissions flow into
this app — a Jotform order, a commission-tracker entry, a legacy
tracker check, all still live only in Jotform. Nothing here reads or
writes Jotform data; it's navigation, not integration.
