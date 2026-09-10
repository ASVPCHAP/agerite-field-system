# Session summary — 2026-09-10

**Context**: AGErite Pharmacy is a prospective client (Rockwall Partners' deal, still unsigned/unpaid at time of writing). This session's driving goal, stated explicitly partway through: *"To help close the deal, I want to present them with a working tool that gives them an idea of what we can do, as a sign of good faith."* Everything below was built toward that demo, on the real `agerite-field-system` app (`https://agerite-field-system.vercel.app`), backed by a real Supabase project (`xlboikexmfymcewfvpog`).

This file is a narrative record of what happened this session, in order — not a spec. The living specs are `CRM_SPEC.md` (CRM/portal features) and `DEALS_SPEC.md` (the deal pipeline/contacts work, approved but not yet built as of this writing).

---

## 1. Fixing what was already there

- **Dropdown text was invisible.** Every `<select>` in the portal showed white text on the native white popup background (options inherit the dark-theme ink color, but browsers render the popup itself with a plain white background regardless of the page's theme). Fixed with one CSS rule in `index.css` instead of patching each dropdown.
- **Tiers (T1/T2/T3) had never been explained anywhere a rep could see them.** Added a plain-language legend (T1 = strong ICP fit, work first; T2 = decent fit; T3 = partial/unconfirmed, lowest priority) on the Leads and Find Prospects screens.
- **"Knowledge base" became "Resources"**, restructured from one flat pricing table into tabs: Pricing & protocols, Service areas (products grouped by category), Printable documents (was a placeholder — later given real content, see §3), Order & other forms (see §3).
- **Refills got an actual explanation** of its purpose ("flags customers who've gone quiet — follow up before the account goes cold") — it already did this, it just never said so.
- **Dashboard gained an "Active clinics" section** — contact info and a real activity-history panel for every clinic a rep owns that's reached the reorder/active stage. Order volume started as an honest "Needs C integration" placeholder pill.

## 2. SiCompounding and the Orders preview

The user found that AGErite's compounding software, **SiCompounding**, offers a real B2B Order API for order intake automation — not yet integrated (no credentials exchanged), but real enough to design against.

- Approved design: build the *shape* SiCompounding's API is expected to return, populated with realistic (not empty) preview numbers, clearly labeled as preview data rather than presented as live.
- New `Order` type/table (`clinic_id, product_id, size, quantity, status, ordered_at`), read-only, seeded with 6 mock orders on the one reorder-stage demo clinic.
- `src/data/orders.ts` — shared value math (`orderValue`, `orderTotals`), pricing looked up live from the same `products` table every other screen uses.
- Dashboard's "Active clinics" order-volume column went from a bare placeholder pill to a real dollar figure + order count (e.g. "$7,654 · 6 orders"), with an honest "preview data, not yet wired to SiCompounding" footnote.
- New **Orders** panel (Dashboard + Pipeline, reorder-stage clinics only) — a per-clinic order line-item log, same expandable-row pattern as the existing activity History panel.

## 3. Real AGErite content

The user handed over real source material: a zip of 7 AGErite PDFs (pricing/dosing/clinical references), and a set of Jotform links describing how ordering *actually* works today.

- **Printable documents tab got real content** — 7 PDFs (Compounded Peptide Prescribing & Price Guide, Hormones Price Sheet, GLP-1 Dosing Cards, GLP Vials & Prefilled Syringes, eScribe Ordering Instructions, Peptides/Topicals/Injections reference, a "reasons to compound" pitch sheet), served as static files from `public/documents/`.
- **New "Order & other forms" tab** — the real Jotform links: Weight Loss / Hormone / Injectables order forms, New Client Setup Form & Provider Packet, Commission Tracker, and the AGErite website. A "Provider/Clinic Tracker (legacy)" entry was flagged — it does the same job Pipeline's ownership lock already does; no URL was provided for it, so it's listed without a link rather than a guessed one, with an open question left for Anthony/AGErite about whether reps should keep using both during a transition.
- Dashboard gained a **"Place an order"** quick action, deep-linking to the new tab.

## 4. Real product catalog + commission calculator

Two more PDFs the user provided:

- **The actual pricing sheets** replaced the 7 placeholder demo products with **46 real ones** across peptides, weight loss, hormones, topicals, troches, and a new "IV & injectable additives" category. Since AGErite's real catalog doesn't price everything in "5mL/10mL" (hormones price per troche/jar, GLP-1 per dose-strength × vial size), `products` gained `price_5ml_label`/`price_10ml_label` text columns so every row is labeled correctly instead of forced into a unit that doesn't apply. GLP-1's full 30+ SKU matrix and hormones' full injectable strength/vial list stay in the linked PDFs rather than exploding the table — 1-2 representative rows each, with a note pointing to the source document. TB-500's old `pending_review` flag (a concentration discrepancy) resolved itself once the real guide confirmed the number. Two stray test-product rows from earlier manual QA were cleaned up.
- **Commission calculator** — new tab on Resources, built from AGErite's 1099 Sales Rep Commission Plan (graduated brackets: 6% to $5k, 8% to $15k, 10% to $30k, 12% above, resetting monthly). Verified against the plan document's own worked example ($40,000 → $3,800, exact match). The signed source PDF itself (Anthony's own signed copy) was deliberately **not** added anywhere in the app — only used to derive the bracket math.

## 5. Layout bug + CRM landing page

Follow-up feedback surfaced a real bug and a real gap:

- **The Pricing table's price was getting cut off.** Root cause: cells holding the new (longer) concentration/label text used a CSS class with `whitespace-nowrap`, forcing the table far past any normal viewport width with no visible way to scroll. Fixed by letting that text wrap normally and merging the two price columns into one — the full 46-row table now fits without horizontal scrolling.
- Added **category and concentration filter dropdowns** above the Pricing table (concentration options narrow to whatever's in the selected category).
- **CRM got a real landing page.** `/portal/crm` used to redirect straight into the Leads table with no destination of its own. Now it's a proper overview: a funnel snapshot (prospecting/pipeline/active counts) plus a card linking to each of Leads/Pipeline/Find prospects/Analytics.

## 6. Deal Pipeline, Company Pages, Contacts — spec written, not yet built

The user asked to go further: clickable company pages (contacts, recent activity, order history), a real Contacts tab, and a proper deal pipeline (Introduction / Meeting set / Follow-up meeting / Close sale / Close lost), explicitly asking for research into current pipeline-stage best practice.

- Classified as architectural (new subsystems, not a bolt-on) and researched against current B2B and medical/pharma-field-sales CRM practice before designing anything.
- Research findings: modern pipelines run 5-6 stages representing buyer milestones, not activity; AGErite's fixed pricing correctly rules out a Negotiation stage (not a simplification — the right stage set for this business); deal cards should carry next step + target close date; closed-lost deals should carry a reason code; medical/pharma field sales specifically calls out multi-stakeholder contact tracking as the differentiator.
- Key architectural decision, confirmed with the user: the new deal-stage model **replaces** the selling-phase portion of the existing `clinics.stage` field (which had been conflating "where's the sale" with "what kind of account is this now") rather than running as a second, parallel concept.
- Full design approved and written to **`DEALS_SPEC.md`**:
  - New `deals` table (stage, next step, target close date, closed_at, lost reason) — owned via the same clinic-ownership lock as everything else, not a separate permission concept.
  - `clinics.stage` collapses to a simple derived status: `in_pipeline` / `active` / `lost`.
  - New `contacts` table (name, role, phone, email, decision-maker flag) — clinics only, since a lead by definition has no named person yet. `clinics.phone`/`email` retire in favor of this, migrated forward so nothing is silently lost.
  - `activities` gains an optional `contact_id` — logging a call/visit can now say who it was with, not just which clinic.
  - A **company page** per clinic (deal + contacts + trailing-12-month orders + activity history) and a lighter version per lead (basic info + Promote button — nothing else exists pre-promotion).
  - The existing flat **Pipeline** tab retires in favor of a stage-grouped **Deal Pipeline** (five columns, matching the five requested stages).
  - Explicitly out of scope for this pass: multi-deal history per clinic, a dollar-value field on a deal (AGErite's pricing doesn't reduce to one number), stage-change audit history, and any automatic contact sync.
- **Status as of this file**: spec approved by the user; implementation plan is the next step (see below).

---

## What's live right now

Everything in §1-5 is built, migrated on the real Supabase project, and pushed to `main` (latest commit as of this summary: the CRM landing page / pricing filter fix). §6 (Deal Pipeline/Contacts/Company pages) is spec-only — `DEALS_SPEC.md` exists, nothing has been built against it yet.

## What's next

Turn `DEALS_SPEC.md` into an implementation plan and build it, per the build order already laid out in that spec's §7:
1. Migrations (`deals`, `contacts`, `clinics.stage` rename, `promote_lead`/`log_activity`/`reset_demo_data` updates)
2. Mock + Supabase store parity
3. Company page (clinic, then lead)
4. Deal Pipeline page
5. Update Leads/Dashboard/Analytics/CrmOverview for the renamed stage values
6. Update `CRM_SPEC.md`/`CRM_USER_GUIDE.md` to point at `DEALS_SPEC.md` instead of describing the now-superseded shape
