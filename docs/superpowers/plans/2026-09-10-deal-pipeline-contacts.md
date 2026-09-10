# Deal Pipeline, Company Pages & Contacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat Pipeline tab and the selling-phase portion of `clinics.stage` with a real deal pipeline (5 stages), give every clinic (and, lighter, every lead) a company page with contacts/deal/order-history/activity, and add a proper Contacts entity.

**Architecture:** Postgres tables (`deals`, `contacts`) + RPCs, mirrored by the app's existing dual mock/Supabase store pattern (`src/data/mockStore.ts` / `supabaseStore.ts`, picked by `src/data/store.ts`). New pages under `src/pages/portal/crm/`. `clinics.stage` collapses from a 6-value sales+lifecycle enum to a 3-value derived status (`in_pipeline`/`active`/`lost`); the 5-stage sales cycle moves to its own `deals` table.

**Tech Stack:** React + TypeScript + Vite + Tailwind v4, React Router, Supabase (Postgres + RLS + `security definer` RPCs), localStorage mock store. **This repo has no automated test suite** — every feature so far is verified via `npm run build` (tsc), `npm run lint` (oxlint), and manual Playwright browser verification against the real dev server. This plan follows that same convention instead of inventing a test framework the codebase doesn't have; each task's verification step says exactly what to click/check.

**Spec:** `DEALS_SPEC.md` (repo root) — read it alongside this plan; this plan implements it section-by-section and the two should agree. `CRM_SPEC.md` sections 3 and 7 describe the pre-this-plan shape and are superseded by this work (Task 18 updates the pointer).

## Global Constraints

- Every mutation-capable RPC derives the acting rep from `auth.email()` — never a client-supplied id (established since `phase1_8`). New RPCs (`upsert_contact`, `advance_deal_stage`, `close_deal`) follow this exactly.
- Clinic ownership lock: first rep to touch an unowned clinic claims it; any other rep is blocked with a named "owned by, since" result. Deals inherit this — no separate deal-level ownership field.
- Every store function exists in both `mockStore.ts` and `supabaseStore.ts` with an identical exported signature — `store.ts` just re-exports whichever is active. Never import either directly from a page.
- Migration files go in `supabase/migrations/`, named `YYYYMMDDHHMMSS_phase1_N_<slug>.sql`, applied via `npx supabase db push` (CLI not on PATH in bash — use `npx supabase`), followed by `npx supabase gen types typescript --linked > src/data/database.types.ts`.
- Never edit an already-applied migration file — a fix after `db push` is a new migration.
- No dollar-value field on a deal (§6 of the spec — AGErite's pricing doesn't reduce to one number). No multi-deal-per-clinic UI in this pass (schema allows it, nothing creates a second deal).

---

### Task 1: Migration — `deals`, `contacts`, and the rewrite of `clinics.stage`/`promote_lead`/`log_activity`/`reset_demo_data`

**Files:**
- Create: `supabase/migrations/20260911010000_phase1_17_deals_contacts.sql`

**Interfaces:**
- Produces (Postgres): tables `deals(id, clinic_id, stage, next_step, target_close_at, closed_at, lost_reason, opened_at)` and `contacts(id, clinic_id, name, role, phone, email, is_decision_maker)`; `activities.contact_id` column; RPCs `upsert_contact(p_id, p_clinic_id, p_name, p_role, p_phone, p_email, p_is_decision_maker) returns contacts`, `advance_deal_stage(p_deal_id, p_stage) returns deals`, `close_deal(p_deal_id, p_outcome, p_lost_reason) returns deals`; rewritten `promote_lead(p_lead_id, p_next_step) returns clinics`, `log_activity(p_lead_id, p_clinic_id, p_type, p_notes, p_occurred_at, p_contact_id) returns table(...)`, `reset_demo_data() returns void`. `clinics.stage` values become `'in_pipeline' | 'active' | 'lost'`; `clinics.next_step`, `clinics.phone`, `clinics.email` are dropped.

- [ ] **Step 1: Write the migration**

```sql
-- Deals, contacts, and the split of clinics.stage into "what kind of
-- account is this" (in_pipeline/active/lost) vs. "where is the sale"
-- (deals.stage, the 5-stage pipeline). See DEALS_SPEC.md.

create table contacts (
  id text primary key,
  clinic_id text not null references clinics(id),
  name text not null,
  role text,
  phone text,
  email text,
  is_decision_maker boolean not null default false
);

alter table contacts enable row level security;
create policy "authenticated read contacts" on contacts for select to authenticated using (true);
grant select on contacts to authenticated;

create table deals (
  id text primary key,
  clinic_id text not null references clinics(id),
  stage text not null check (stage in ('introduction', 'meeting_set', 'follow_up', 'closed_won', 'closed_lost')),
  next_step text,
  target_close_at date,
  closed_at date,
  lost_reason text,
  opened_at date not null default current_date
);

alter table deals enable row level security;
create policy "authenticated read deals" on deals for select to authenticated using (true);
grant select on deals to authenticated;

alter table activities add column contact_id text references contacts(id);

-- Backfill: one opening deal per existing clinic, mapped from its old
-- stage (still intact at this point in the migration — the rename below
-- happens after this read). identify/drop_in -> introduction (earliest
-- open stage a rep hasn't gotten a meeting from yet); discovery/solution
-- -> follow_up (mid-cycle, closer to the more-advanced open stage than a
-- bare "meeting set"); onboard/reorder -> closed_won (the sale is done).
insert into deals (id, clinic_id, stage, next_step, opened_at)
select
  'deal-seed-' || id,
  id,
  case
    when stage in ('identify', 'drop_in') then 'introduction'
    when stage in ('discovery', 'solution') then 'follow_up'
    when stage in ('onboard', 'reorder') then 'closed_won'
    else 'introduction'
  end,
  next_step,
  coalesce(last_touch_at, current_date)
from clinics;

update deals set closed_at = opened_at where stage = 'closed_won';

-- Backfill: fold each clinic's single phone/email into one named contact
-- so nothing is silently dropped when those columns go away below.
insert into contacts (id, clinic_id, name, phone, email, is_decision_maker)
select 'contact-seed-' || id, id, 'Main contact', phone, email, false
from clinics
where phone is not null or email is not null;

-- Now safe to simplify clinics.stage — the old values were read above.
update clinics set stage = case
  when stage in ('identify', 'drop_in', 'discovery', 'solution') then 'in_pipeline'
  when stage in ('onboard', 'reorder') then 'active'
  else 'in_pipeline'
end;

alter table clinics drop constraint clinics_stage_check;
alter table clinics add constraint clinics_stage_check check (stage in ('in_pipeline', 'active', 'lost'));

alter table clinics drop column next_step;
alter table clinics drop column phone;
alter table clinics drop column email;

-- promote_lead: creates the clinic AND its opening deal in one step
-- (previously just a bare clinics row at stage='drop_in'). Carries the
-- lead's phone/email forward as a contact instead of clinic columns
-- that no longer exist.
create or replace function promote_lead(p_lead_id text, p_next_step text default 'Discovery call')
returns clinics
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rep_id text;
  v_lead leads%rowtype;
  v_id text;
  v_candidate text;
  v_suffix int := 2;
  v_result clinics%rowtype;
  v_deal_id text;
begin
  select id into v_rep_id from reps where email = auth.email();
  if v_rep_id is null then
    raise exception 'No rep record matches the authenticated email (%)', auth.email();
  end if;

  select * into v_lead from leads where id = p_lead_id for update;
  if v_lead.id is null then
    raise exception 'Unknown lead: %', p_lead_id;
  end if;
  if v_lead.status = 'promoted' then
    raise exception '% has already been promoted (clinic %)', v_lead.name, v_lead.promoted_clinic_id;
  end if;

  v_id := nullif(slugify(v_lead.name), '');
  if v_id is null then v_id := 'clinic'; end if;
  v_candidate := v_id;
  while exists (select 1 from clinics where id = v_candidate) loop
    v_candidate := v_id || '-' || v_suffix;
    v_suffix := v_suffix + 1;
  end loop;

  insert into clinics (id, name, city, segment, tier, cluster, website, owner_rep_id, stage, last_touch_at)
  values (v_candidate, v_lead.name, v_lead.city, v_lead.segment, v_lead.tier, v_lead.cluster, v_lead.website, v_rep_id, 'in_pipeline', current_date)
  returning * into v_result;

  v_deal_id := 'deal-' || extract(epoch from clock_timestamp())::bigint || '-' || floor(random() * 1000)::text;
  insert into deals (id, clinic_id, stage, next_step, opened_at)
  values (v_deal_id, v_candidate, 'introduction', p_next_step, current_date);

  if v_lead.phone is not null or v_lead.email is not null then
    insert into contacts (id, clinic_id, name, phone, email, is_decision_maker)
    values ('contact-' || v_candidate, v_candidate, 'Main contact', v_lead.phone, v_lead.email, false);
  end if;

  update leads set status = 'promoted', promoted_clinic_id = v_candidate where id = p_lead_id;

  return v_result;
end;
$$;

grant execute on function promote_lead(text, text) to authenticated;

-- log_activity: same ownership-lock semantics as before, gains an
-- optional contact_id, and no longer bumps clinics.stage on first touch
-- (that was the identify->drop_in transition; those values don't exist
-- anymore, and an in_pipeline clinic already has an open deal by
-- construction, from promote_lead above). The lead path's "visit
-- promotes" behavior is unchanged in effect, just creates a deal (and
-- optional contact) instead of a bare clinic.
drop function if exists log_activity(text, text, text, text, date);

create function log_activity(
  p_lead_id text default null,
  p_clinic_id text default null,
  p_type text default null,
  p_notes text default null,
  p_occurred_at date default current_date,
  p_contact_id text default null
)
returns table(
  ok boolean,
  reason text,
  owner_name text,
  since date,
  activity_id text,
  promoted_clinic_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rep_id text;
  v_activity_id text;
  v_clinic clinics%rowtype;
  v_lead leads%rowtype;
  v_owner_name text;
  v_new_clinic_id text;
  v_id text;
  v_candidate text;
  v_suffix int := 2;
  v_deal_id text;
begin
  if (p_lead_id is null) = (p_clinic_id is null) then
    raise exception 'Exactly one of lead id or clinic id is required';
  end if;
  if p_type not in ('call', 'text', 'visit', 'email', 'note') then
    raise exception 'Invalid activity type: %', p_type;
  end if;
  if p_contact_id is not null and p_clinic_id is not null
     and not exists (select 1 from contacts where id = p_contact_id and clinic_id = p_clinic_id) then
    raise exception 'Contact % does not belong to clinic %', p_contact_id, p_clinic_id;
  end if;

  select id into v_rep_id from reps where email = auth.email();
  if v_rep_id is null then
    raise exception 'No rep record matches the authenticated email (%)', auth.email();
  end if;

  v_activity_id := 'act-' || extract(epoch from clock_timestamp())::bigint || '-' || floor(random() * 1000)::text;

  -- Clinic path ------------------------------------------------------
  if p_clinic_id is not null then
    select * into v_clinic from clinics where id = p_clinic_id for update;
    if v_clinic.id is null then
      raise exception 'Unknown clinic: %', p_clinic_id;
    end if;

    if v_clinic.owner_rep_id is not null and v_clinic.owner_rep_id <> v_rep_id then
      select r.name into v_owner_name from reps r where r.id = v_clinic.owner_rep_id;
      return query select false, 'owned_by_other'::text, v_owner_name, v_clinic.last_touch_at, null::text, null::text;
      return;
    end if;

    insert into activities (id, clinic_id, rep_id, type, notes, occurred_at, contact_id)
    values (v_activity_id, p_clinic_id, v_rep_id, p_type, p_notes, p_occurred_at, p_contact_id);

    update clinics set
      owner_rep_id = coalesce(clinics.owner_rep_id, v_rep_id),
      last_touch_at = p_occurred_at
    where clinics.id = p_clinic_id;

    return query select true, null::text, null::text, null::date, v_activity_id, null::text;
    return;
  end if;

  -- Lead path ----------------------------------------------------------
  select * into v_lead from leads where id = p_lead_id for update;
  if v_lead.id is null then
    raise exception 'Unknown lead: %', p_lead_id;
  end if;
  if v_lead.status = 'promoted' then
    return query select false, 'already_promoted'::text, null::text, null::date, null::text, v_lead.promoted_clinic_id;
    return;
  end if;

  insert into activities (id, lead_id, rep_id, type, notes, occurred_at)
  values (v_activity_id, p_lead_id, v_rep_id, p_type, p_notes, p_occurred_at);

  if p_type = 'visit' then
    v_id := nullif(slugify(v_lead.name), '');
    if v_id is null then v_id := 'clinic'; end if;
    v_candidate := v_id;
    while exists (select 1 from clinics where id = v_candidate) loop
      v_candidate := v_id || '-' || v_suffix;
      v_suffix := v_suffix + 1;
    end loop;

    insert into clinics (id, name, city, segment, tier, cluster, website, owner_rep_id, stage, last_touch_at)
    values (v_candidate, v_lead.name, v_lead.city, v_lead.segment, v_lead.tier, v_lead.cluster, v_lead.website, v_rep_id, 'in_pipeline', p_occurred_at);

    v_deal_id := 'deal-' || extract(epoch from clock_timestamp())::bigint || '-' || floor(random() * 1000)::text;
    insert into deals (id, clinic_id, stage, next_step, opened_at)
    values (v_deal_id, v_candidate, 'introduction', 'Follow up after visit', p_occurred_at);

    if v_lead.phone is not null or v_lead.email is not null then
      insert into contacts (id, clinic_id, name, phone, email, is_decision_maker)
      values ('contact-' || v_candidate, v_candidate, 'Main contact', v_lead.phone, v_lead.email, false);
    end if;

    update leads set status = 'promoted', promoted_clinic_id = v_candidate where id = p_lead_id;
    v_new_clinic_id := v_candidate;
  elsif v_lead.status = 'new' then
    update leads set status = 'contacted' where id = p_lead_id;
  end if;

  return query select true, null::text, null::text, null::date, v_activity_id, v_new_clinic_id;
end;
$$;

grant execute on function log_activity(text, text, text, text, date, text) to authenticated;

-- upsert_contact: contacts are non-competitive reference data (who to
-- call), not ownership-sensitive like activities/deals — any
-- authenticated rep can add or edit one on any clinic.
create function upsert_contact(
  p_id text default null,
  p_clinic_id text default null,
  p_name text default null,
  p_role text default null,
  p_phone text default null,
  p_email text default null,
  p_is_decision_maker boolean default false
)
returns contacts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rep_id text;
  v_id text;
  v_result contacts%rowtype;
begin
  select id into v_rep_id from reps where email = auth.email();
  if v_rep_id is null then
    raise exception 'No rep record matches the authenticated email (%)', auth.email();
  end if;
  if p_id is null and p_clinic_id is null then
    raise exception 'clinic id is required for a new contact';
  end if;

  if p_id is not null then
    update contacts set
      name = coalesce(p_name, name),
      role = p_role,
      phone = p_phone,
      email = p_email,
      is_decision_maker = coalesce(p_is_decision_maker, false)
    where id = p_id
    returning * into v_result;
    if v_result.id is null then
      raise exception 'Unknown contact: %', p_id;
    end if;
    return v_result;
  end if;

  if not exists (select 1 from clinics where id = p_clinic_id) then
    raise exception 'Unknown clinic: %', p_clinic_id;
  end if;

  v_id := 'ct-' || extract(epoch from clock_timestamp())::bigint || '-' || floor(random() * 1000)::text;
  insert into contacts (id, clinic_id, name, role, phone, email, is_decision_maker)
  values (v_id, p_clinic_id, p_name, p_role, p_phone, p_email, coalesce(p_is_decision_maker, false))
  returning * into v_result;
  return v_result;
end;
$$;

grant execute on function upsert_contact(text, text, text, text, text, text, boolean) to authenticated;

-- advance_deal_stage: move a deal between the three open stages (either
-- direction — no one-way ratchet, mis-clicks happen). Same ownership
-- lock as everything else: only the clinic's owning rep, or claims
-- ownership if the clinic was unowned.
create function advance_deal_stage(p_deal_id text, p_stage text)
returns deals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rep_id text;
  v_deal deals%rowtype;
  v_clinic clinics%rowtype;
begin
  if p_stage not in ('introduction', 'meeting_set', 'follow_up') then
    raise exception 'Invalid open stage: %', p_stage;
  end if;

  select id into v_rep_id from reps where email = auth.email();
  if v_rep_id is null then
    raise exception 'No rep record matches the authenticated email (%)', auth.email();
  end if;

  select * into v_deal from deals where id = p_deal_id for update;
  if v_deal.id is null then
    raise exception 'Unknown deal: %', p_deal_id;
  end if;
  if v_deal.stage in ('closed_won', 'closed_lost') then
    raise exception 'Deal % is already closed', p_deal_id;
  end if;

  select * into v_clinic from clinics where id = v_deal.clinic_id for update;
  if v_clinic.owner_rep_id is not null and v_clinic.owner_rep_id <> v_rep_id then
    raise exception 'This deal belongs to another rep';
  end if;

  update deals set stage = p_stage where id = p_deal_id returning * into v_deal;
  update clinics set owner_rep_id = coalesce(owner_rep_id, v_rep_id) where id = v_deal.clinic_id;

  return v_deal;
end;
$$;

grant execute on function advance_deal_stage(text, text) to authenticated;

-- close_deal: won moves the clinic to 'active' (today's "reorder"
-- meaning), lost moves it to 'lost'. Locks the deal — no further stage
-- changes once closed (v1 doesn't support reopening or a second deal;
-- see DEALS_SPEC.md section 6).
create function close_deal(p_deal_id text, p_outcome text, p_lost_reason text default null)
returns deals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rep_id text;
  v_deal deals%rowtype;
  v_clinic clinics%rowtype;
begin
  if p_outcome not in ('won', 'lost') then
    raise exception 'Invalid outcome: %', p_outcome;
  end if;

  select id into v_rep_id from reps where email = auth.email();
  if v_rep_id is null then
    raise exception 'No rep record matches the authenticated email (%)', auth.email();
  end if;

  select * into v_deal from deals where id = p_deal_id for update;
  if v_deal.id is null then
    raise exception 'Unknown deal: %', p_deal_id;
  end if;
  if v_deal.stage in ('closed_won', 'closed_lost') then
    raise exception 'Deal % is already closed', p_deal_id;
  end if;

  select * into v_clinic from clinics where id = v_deal.clinic_id for update;
  if v_clinic.owner_rep_id is not null and v_clinic.owner_rep_id <> v_rep_id then
    raise exception 'This deal belongs to another rep';
  end if;

  update deals set
    stage = case when p_outcome = 'won' then 'closed_won' else 'closed_lost' end,
    closed_at = current_date,
    lost_reason = case when p_outcome = 'lost' then p_lost_reason else null end
  where id = p_deal_id
  returning * into v_deal;

  update clinics set
    owner_rep_id = coalesce(owner_rep_id, v_rep_id),
    stage = case when p_outcome = 'won' then 'active' else 'lost' end
  where id = v_deal.clinic_id;

  return v_deal;
end;
$$;

grant execute on function close_deal(text, text, text) to authenticated;

-- reset_demo_data: full rewrite for the new shape. Cleans up any
-- deals/contacts/clinics created during testing (same "not in the 5
-- canonical ids" pattern the clinics cleanup already used), then resets
-- the 5 canonical clinics' deals to fixed demo states.
create or replace function reset_demo_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from certification_attempts where true;
  delete from activities where true;

  delete from contacts where clinic_id not in ('cl1', 'cl2', 'cl3', 'cl4', 'cl5');
  delete from deals where clinic_id not in ('cl1', 'cl2', 'cl3', 'cl4', 'cl5');
  delete from clinics where id not in ('cl1', 'cl2', 'cl3', 'cl4', 'cl5');

  update reps set cert_status = 'certified' where id = 'r1';
  update reps set cert_status = 'not_started' where id = 'r2';
  update reps set cert_status = 'in_progress' where id = 'r3';

  update clinics set owner_rep_id = 'r1', stage = 'active', last_touch_at = '2026-08-28' where id = 'cl1';
  update clinics set owner_rep_id = null, stage = 'in_pipeline', last_touch_at = null where id = 'cl2';
  update clinics set owner_rep_id = 'r2', stage = 'active', last_touch_at = '2026-09-01' where id = 'cl3';
  update clinics set owner_rep_id = 'r3', stage = 'in_pipeline', last_touch_at = '2026-09-02' where id = 'cl4';
  update clinics set owner_rep_id = null, stage = 'in_pipeline', last_touch_at = null where id = 'cl5';

  delete from deals where id like 'deal-seed-%';
  insert into deals (id, clinic_id, stage, next_step, closed_at, opened_at) values
    ('deal-seed-cl1', 'cl1', 'closed_won', 'Confirm first order', '2026-08-28', '2026-08-01'),
    ('deal-seed-cl2', 'cl2', 'introduction', 'Initial drop-in', null, '2026-09-10'),
    ('deal-seed-cl3', 'cl3', 'closed_won', '4-week reorder check-in', '2026-09-01', '2026-08-01'),
    ('deal-seed-cl4', 'cl4', 'follow_up', 'Send provider packet', null, '2026-09-02'),
    ('deal-seed-cl5', 'cl5', 'introduction', 'Initial drop-in', null, '2026-09-10');

  update leads set status = 'new', promoted_clinic_id = null where id not in ('ld2', 'ld9', 'ld16');
  update leads set status = 'contacted', promoted_clinic_id = null where id in ('ld2', 'ld9', 'ld16');
end;
$$;
```

- [ ] **Step 2: Push the migration**

Run: `npx supabase db push`
Expected: `Applying migration 20260911010000_phase1_17_deals_contacts.sql...` then `Finished supabase db push.`

- [ ] **Step 3: Verify the backfill and new shape**

Run (via the Supabase MCP `execute_sql` tool, project id `xlboikexmfymcewfvpog`):
```sql
select c.id, c.stage, d.stage as deal_stage, d.next_step from clinics c join deals d on d.clinic_id = c.id order by c.id;
select conname from pg_constraint where conrelid = 'clinics'::regclass and contype = 'c';
```
Expected: every clinic has exactly one deal row; `cl1`/`cl3` show `deal_stage = closed_won`; `cl2`/`cl5` show `introduction`; `cl4` shows `follow_up`; the constraint list shows the new 3-value `clinics_stage_check`.

- [ ] **Step 4: Regenerate types**

Run: `npx supabase gen types typescript --linked > src/data/database.types.ts`
Expected: command succeeds; `grep -c "deals:" src/data/database.types.ts` and `grep -c "contacts:" src/data/database.types.ts` both return a nonzero count.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260911010000_phase1_17_deals_contacts.sql src/data/database.types.ts
git commit -m "Add deals/contacts tables, rewrite promote_lead/log_activity/reset_demo_data for the new stage shape"
```

---

### Task 2: `schema.ts` and `storeTypes.ts` — new types, `Clinic`/`Activity` shape changes

**Files:**
- Modify: `src/data/schema.ts`
- Modify: `src/data/storeTypes.ts`

**Interfaces:**
- Consumes: nothing (pure types)
- Produces: `DealStage`, `Deal`, `Contact`, `ClinicStatus` (replaces `PipelineStage` on `Clinic.stage`), `Activity.contact_id`, `UpsertContactInput`, `LogActivityInput.contactId`, `AdvanceDealStageResult`/`CloseDealResult` (just `Deal`, no wrapper needed — the RPCs return the row directly)

- [ ] **Step 1: Edit `schema.ts`**

Replace the `PipelineStage`/`Clinic` block:

```ts
export type ClinicStatus = 'in_pipeline' | 'active' | 'lost'

export interface Clinic {
  id: string
  name: string
  city: string
  segment: string
  tier: 'T1' | 'T2' | 'T3'
  cluster: string
  website: string
  owner_rep_id: string | null
  /** What kind of account this is, derived from its deal(s) — not the
   *  sale's own progress, that's Deal.stage now. 'in_pipeline' = has an
   *  open deal, 'active' = most recent deal closed_won (this is what
   *  used to be stage 'reorder'), 'lost' = most recent deal
   *  closed_lost. See DEALS_SPEC.md. */
  stage: ClinicStatus
  last_touch_at: string | null // ISO date
}
```

Add, after the `Clinic` interface:

```ts
export type DealStage = 'introduction' | 'meeting_set' | 'follow_up' | 'closed_won' | 'closed_lost'

/** One sales cycle on a clinic. Replaces the selling-phase portion of
 *  the old clinics.stage — see DEALS_SPEC.md. No owner field: a deal
 *  belongs to whoever owns the clinic (same ownership lock as
 *  activities), not a separate permission concept. */
export interface Deal {
  id: string
  clinic_id: string
  stage: DealStage
  next_step: string | null
  target_close_at: string | null
  closed_at: string | null
  lost_reason: string | null
  opened_at: string // ISO date
}

/** A named person at a clinic — replaces the old single clinics.phone/
 *  clinics.email pair. Clinics only; a lead by definition has nobody
 *  named yet. See DEALS_SPEC.md. */
export interface Contact {
  id: string
  clinic_id: string
  name: string
  role: string | null
  phone: string | null
  email: string | null
  is_decision_maker: boolean
}
```

Edit the `Activity` interface — add one field:

```ts
export interface Activity {
  id: string
  lead_id: string | null
  clinic_id: string | null
  rep_id: string
  type: ActivityType
  notes: string | null
  occurred_at: string // ISO date
  created_at: string // ISO timestamp
  /** Who the interaction was actually with, when known — optional,
   *  logging still works with none picked. See DEALS_SPEC.md. */
  contact_id: string | null
}
```

- [ ] **Step 2: Edit `storeTypes.ts`**

Add `contactId` to `LogActivityInput`:

```ts
export interface LogActivityInput {
  leadId?: string
  clinicId?: string
  type: ActivityType
  notes: string | null
  occurredAt: string // ISO date
  contactId?: string
}
```

Add, after `ProductFormInput`:

```ts
/** Input for the Contacts form. A null/omitted id creates a new
 *  contact; an existing id edits it. Mirrors upsert_contact's
 *  parameters. */
export interface UpsertContactInput {
  id?: string | null
  clinicId: string
  name: string
  role: string | null
  phone: string | null
  email: string | null
  isDecisionMaker: boolean
}
```

- [ ] **Step 3: Verify with a build (expect failures — downstream files aren't updated yet)**

Run: `npm run build 2>&1 | head -60`
Expected: `tsc` errors in `seed.ts`, `mockStore.ts`, `supabaseStore.ts`, `Leads.tsx`, `Pipeline.tsx`, `Dashboard.tsx`, `Analytics.tsx`, `CrmOverview.tsx` — every place that used `phone`/`email`/`next_step`/the old stage values on `Clinic`. This is expected at this point in the plan; Tasks 3-17 fix each one. Do not attempt to fix them here.

- [ ] **Step 4: Commit**

```bash
git add src/data/schema.ts src/data/storeTypes.ts
git commit -m "Add Deal/Contact types, simplify Clinic.stage, add Activity.contact_id"
```

---

### Task 3: `seed.ts` — update `seedClinics`, add `seedDeals`/`seedContacts`

**Files:**
- Modify: `src/data/seed.ts`

**Interfaces:**
- Consumes: `Clinic`, `Deal`, `Contact` from `./schema` (Task 2)
- Produces: `seedClinics` (new shape), `seedDeals`, `seedContacts` — consumed by `mockStore.ts` (Task 4)

- [ ] **Step 1: Update the import list**

```ts
import type {
  CertificationModule,
  Clinic,
  Contact,
  Deal,
  Lead,
  LicensedState,
  Order,
  PatientRefill,
  Product,
  ProductChangeLog,
  Rep,
} from './schema'
```

- [ ] **Step 2: Replace `seedClinics`**

```ts
export const seedClinics: Clinic[] = [
  { id: 'cl1', name: 'Vixen Wellness', city: 'Rockwall', segment: 'med spa', tier: 'T1', cluster: 'Rockwall–Fate', website: 'vixenwellness.com', owner_rep_id: 'r1', stage: 'active', last_touch_at: '2026-08-28' },
  { id: 'cl2', name: 'Sculpted MD', city: 'Fate', segment: 'med spa', tier: 'T1', cluster: 'Rockwall–Fate', website: 'sculptedmd.com', owner_rep_id: null, stage: 'in_pipeline', last_touch_at: null },
  { id: 'cl3', name: "Game Day Men's Health", city: 'Houston', segment: 'TRT', tier: 'T1', cluster: 'North Houston', website: 'gamedaymenshealth.com', owner_rep_id: 'r2', stage: 'active', last_touch_at: '2026-09-01' },
  { id: 'cl4', name: 'Cypress Renewal Clinic', city: 'Cypress', segment: 'wellness', tier: 'T2', cluster: 'Cypress', website: 'cypressrenewal.com', owner_rep_id: 'r3', stage: 'in_pipeline', last_touch_at: '2026-09-02' },
  { id: 'cl5', name: 'Heights Aesthetic Bar', city: 'Houston', segment: 'med spa', tier: 'T2', cluster: 'North Houston', website: 'heightsaestheticbar.com', owner_rep_id: null, stage: 'in_pipeline', last_touch_at: null },
]
```

- [ ] **Step 3: Add `seedDeals` and `seedContacts`, right after `seedClinics`**

```ts
// One opening deal per clinic — see supabase/migrations/
// 20260911010000_phase1_17_deals_contacts.sql for the same mapping
// applied to the real backend's pre-existing rows.
export const seedDeals: Deal[] = [
  { id: 'deal-seed-cl1', clinic_id: 'cl1', stage: 'closed_won', next_step: 'Confirm first order', target_close_at: null, closed_at: '2026-08-28', lost_reason: null, opened_at: '2026-08-01' },
  { id: 'deal-seed-cl2', clinic_id: 'cl2', stage: 'introduction', next_step: 'Initial drop-in', target_close_at: null, closed_at: null, lost_reason: null, opened_at: '2026-09-10' },
  { id: 'deal-seed-cl3', clinic_id: 'cl3', stage: 'closed_won', next_step: '4-week reorder check-in', target_close_at: null, closed_at: '2026-08-01', lost_reason: null, opened_at: '2026-08-01' },
  { id: 'deal-seed-cl4', clinic_id: 'cl4', stage: 'follow_up', next_step: 'Send provider packet', target_close_at: null, closed_at: null, lost_reason: null, opened_at: '2026-09-02' },
  { id: 'deal-seed-cl5', clinic_id: 'cl5', stage: 'introduction', next_step: 'Initial drop-in', target_close_at: null, closed_at: null, lost_reason: null, opened_at: '2026-09-10' },
]

// No seeded contacts by default — reps add their own during the demo,
// same as the old clinics.phone/email fields started empty too.
export const seedContacts: Contact[] = []
```

- [ ] **Step 4: Build check (only `seed.ts`'s own errors should be gone now)**

Run: `npm run build 2>&1 | grep "seed.ts"`
Expected: no output (empty) — `seed.ts` itself now type-checks; other files still error, expected until later tasks.

- [ ] **Step 5: Commit**

```bash
git add src/data/seed.ts
git commit -m "Update seed data for the new Clinic/Deal/Contact shape"
```

---

### Task 4: `mockStore.ts` — deals/contacts CRUD, rewritten `promoteLead`/`logActivity`/`resetDemoData`

**Files:**
- Modify: `src/data/mockStore.ts`

**Interfaces:**
- Consumes: `Deal`, `Contact` (Task 2), `seedDeals`, `seedContacts` (Task 3)
- Produces: `listDeals(clinicId?: string): Promise<Deal[]>`, `listContacts(clinicId: string): Promise<Contact[]>`, `upsertContact(input: UpsertContactInput, repId: string): Promise<Contact>`, `advanceDealStage(dealId: string, stage: 'introduction' | 'meeting_set' | 'follow_up', repId: string): Promise<Deal>`, `closeDeal(dealId: string, outcome: 'won' | 'lost', lostReason: string | null, repId: string): Promise<Deal>` — all consumed by `store.ts` (Task 6) and the UI (Tasks 9-13)

- [ ] **Step 1: Update imports**

```ts
import type {
  Activity,
  CertificationAttempt,
  CertificationModule,
  Clinic,
  Contact,
  Deal,
  Lead,
  LicensedState,
  Order,
  PatientRefill,
  Product,
  ProductChangeLog,
  RefillStatus,
  RefillWithStatus,
  Rep,
} from './schema'
import {
  seedCertificationModules,
  seedClinics,
  seedContacts,
  seedDeals,
  seedLeads,
  seedLicensedStates,
  seedOrders,
  seedPatientRefills,
  seedProductChangeLog,
  seedProducts,
  seedReps,
} from './seed'
import type {
  AssistantResult,
  LogActivityInput,
  LogActivityResult,
  MagicLinkResult,
  NewLeadInput,
  ProductFormInput,
  PublicProduct,
  SheetSyncResult,
  UpsertContactInput,
} from './storeTypes'
```

- [ ] **Step 2: Add `deals`/`contacts` to `DbShape`, `seedDb`, and `loadDb`'s backfill**

```ts
interface DbShape {
  products: Product[]
  productChangeLog: ProductChangeLog[]
  clinics: Clinic[]
  leads: Lead[]
  activities: Activity[]
  orders: Order[]
  deals: Deal[]
  contacts: Contact[]
  reps: Rep[]
  patientRefills: PatientRefill[]
  licensedStates: LicensedState[]
  certificationModules: CertificationModule[]
  certificationAttempts: CertificationAttempt[]
}

function seedDb(): DbShape {
  return {
    products: structuredClone(seedProducts),
    productChangeLog: structuredClone(seedProductChangeLog),
    clinics: structuredClone(seedClinics),
    leads: structuredClone(seedLeads),
    activities: [],
    orders: structuredClone(seedOrders),
    deals: structuredClone(seedDeals),
    contacts: structuredClone(seedContacts),
    reps: structuredClone(seedReps),
    patientRefills: structuredClone(seedPatientRefills),
    licensedStates: structuredClone(seedLicensedStates),
    certificationModules: structuredClone(seedCertificationModules),
    certificationAttempts: [],
  }
}

function loadDb(): DbShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DbShape
      // orders/deals/contacts were added after some browsers already had
      // a persisted db — backfill rather than forcing everyone to hit
      // "reset demo data".
      parsed.orders ??= structuredClone(seedOrders)
      parsed.deals ??= structuredClone(seedDeals)
      parsed.contacts ??= structuredClone(seedContacts)
      return parsed
    }
  } catch {
    // fall through to seed
  }
  return seedDb()
}
```

- [ ] **Step 3: Replace `resetDemoData`**

```ts
/** Wipes all local state back to seed data. Used by the "reset demo" control. */
export async function resetDemoData(): Promise<void> {
  db = seedDb()
  persist()
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}
```

(No change needed here — `seedDb()` already rebuilds `deals`/`contacts` from the updated seed arrays. This step is a no-op confirmation; skip editing, move to Step 4.)

- [ ] **Step 4: Rewrite the clinic-path stage bump inside `logActivity`, and add `contact_id`**

Find this block inside `logActivity` (the clinic path):

```ts
    db.activities.push({
      id: activityId,
      lead_id: null,
      clinic_id: input.clinicId,
      rep_id: repId,
      type: input.type,
      notes: input.notes,
      occurred_at: input.occurredAt,
      created_at: new Date().toISOString(),
    })

    if (!clinic.owner_rep_id) {
      clinic.owner_rep_id = repId
      if (clinic.stage === 'identify') clinic.stage = 'drop_in'
    }
    clinic.last_touch_at = input.occurredAt
```

Replace with:

```ts
    db.activities.push({
      id: activityId,
      lead_id: null,
      clinic_id: input.clinicId,
      rep_id: repId,
      type: input.type,
      notes: input.notes,
      occurred_at: input.occurredAt,
      created_at: new Date().toISOString(),
      contact_id: input.contactId ?? null,
    })

    if (!clinic.owner_rep_id) {
      clinic.owner_rep_id = repId
    }
    clinic.last_touch_at = input.occurredAt
```

Then find the lead-path `db.activities.push` a few lines below (still inside `logActivity`) and add `contact_id: null` to it too (a lead has no clinic yet, so no contact either):

```ts
  db.activities.push({
    id: activityId,
    lead_id: input.leadId!,
    clinic_id: null,
    rep_id: repId,
    type: input.type,
    notes: input.notes,
    occurred_at: input.occurredAt,
    created_at: new Date().toISOString(),
    contact_id: null,
  })
```

Then find the `if (input.type === 'visit') { ... }` block inside the lead path and replace the clinic-creation part — remove `phone`/`email`/`next_step` from the `Clinic` literal (they no longer exist on the type), and add the opening `Deal` plus an optional `Contact`:

```ts
  let promotedClinicId: string | null = null
  if (input.type === 'visit') {
    let id = slugify(lead.name) || 'clinic'
    let suffix = 2
    while (db.clinics.some((c) => c.id === id)) {
      id = `${slugify(lead.name) || 'clinic'}-${suffix}`
      suffix += 1
    }
    const clinic: Clinic = {
      id,
      name: lead.name,
      city: lead.city,
      segment: lead.segment,
      tier: lead.tier,
      cluster: lead.cluster,
      website: lead.website ?? '',
      owner_rep_id: repId,
      stage: 'in_pipeline',
      last_touch_at: input.occurredAt,
    }
    db.clinics.push(clinic)
    db.deals.push({
      id: `deal-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      clinic_id: id,
      stage: 'introduction',
      next_step: 'Follow up after visit',
      target_close_at: null,
      closed_at: null,
      lost_reason: null,
      opened_at: input.occurredAt,
    })
    if (lead.phone || lead.email) {
      db.contacts.push({
        id: `contact-${id}`,
        clinic_id: id,
        name: 'Main contact',
        role: null,
        phone: lead.phone,
        email: lead.email,
        is_decision_maker: false,
      })
    }
    lead.status = 'promoted'
    lead.promoted_clinic_id = id
    promotedClinicId = id
  } else if (lead.status === 'new') {
    lead.status = 'contacted'
  }
```

- [ ] **Step 5: Rewrite `promoteLead`**

```ts
/** Promotes a lead into a real, owned clinic AND its opening deal, in
 *  one step — "I looked at this and I'm working it now." Same effect
 *  as logging a 'visit' activity on the lead. Matches promote_lead() in
 *  the phase1_17 migration. */
export async function promoteLead(leadId: string, repId: string, nextStep = 'Discovery call'): Promise<Clinic> {
  const lead = db.leads.find((l) => l.id === leadId)
  if (!lead) throw new Error(`Unknown lead: ${leadId}`)
  if (lead.status === 'promoted') throw new Error(`${lead.name} has already been promoted (clinic ${lead.promoted_clinic_id})`)

  let id = slugify(lead.name) || 'clinic'
  let suffix = 2
  while (db.clinics.some((c) => c.id === id)) {
    id = `${slugify(lead.name) || 'clinic'}-${suffix}`
    suffix += 1
  }

  const clinic: Clinic = {
    id,
    name: lead.name,
    city: lead.city,
    segment: lead.segment,
    tier: lead.tier,
    cluster: lead.cluster,
    website: lead.website ?? '',
    owner_rep_id: repId,
    stage: 'in_pipeline',
    last_touch_at: isoDate(new Date()),
  }
  db.clinics.push(clinic)
  db.deals.push({
    id: `deal-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    clinic_id: id,
    stage: 'introduction',
    next_step: nextStep,
    target_close_at: null,
    closed_at: null,
    lost_reason: null,
    opened_at: isoDate(new Date()),
  })
  if (lead.phone || lead.email) {
    db.contacts.push({
      id: `contact-${id}`,
      clinic_id: id,
      name: 'Main contact',
      role: null,
      phone: lead.phone,
      email: lead.email,
      is_decision_maker: false,
    })
  }
  lead.status = 'promoted'
  lead.promoted_clinic_id = id
  persist()
  return structuredClone(clinic)
}
```

- [ ] **Step 6: Add `listDeals`, `listContacts`, `upsertContact`, `advanceDealStage`, `closeDeal`**

Add these right after `listOrders`:

```ts
/** All deals, or one clinic's, most recent first. A clinic normally has
 *  exactly one (open or closed) — see DEALS_SPEC.md section 6 on why
 *  this pass never creates a second one. */
export async function listDeals(clinicId?: string): Promise<Deal[]> {
  return structuredClone(
    db.deals
      .filter((d) => !clinicId || d.clinic_id === clinicId)
      .sort((a, b) => (a.opened_at < b.opened_at ? 1 : -1)),
  )
}

export async function listContacts(clinicId: string): Promise<Contact[]> {
  return structuredClone(db.contacts.filter((c) => c.clinic_id === clinicId))
}

/** Contacts aren't ownership-sensitive like activities/deals — any
 *  authenticated rep can add or edit one on any clinic. repId is kept
 *  for interface parity with the real backend, which derives the
 *  caller's identity server-side but doesn't otherwise gate this. */
export async function upsertContact(input: UpsertContactInput, _repId: string): Promise<Contact> {
  if (input.id) {
    const existing = db.contacts.find((c) => c.id === input.id)
    if (!existing) throw new Error(`Unknown contact: ${input.id}`)
    existing.name = input.name
    existing.role = input.role
    existing.phone = input.phone
    existing.email = input.email
    existing.is_decision_maker = input.isDecisionMaker
    persist()
    return structuredClone(existing)
  }
  const contact: Contact = {
    id: `ct-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    clinic_id: input.clinicId,
    name: input.name,
    role: input.role,
    phone: input.phone,
    email: input.email,
    is_decision_maker: input.isDecisionMaker,
  }
  db.contacts.push(contact)
  persist()
  return structuredClone(contact)
}

/** Moves a deal between the three open stages — either direction, no
 *  one-way ratchet. Same ownership lock as logActivity's clinic path. */
export async function advanceDealStage(
  dealId: string,
  stage: 'introduction' | 'meeting_set' | 'follow_up',
  repId: string,
): Promise<Deal> {
  const deal = db.deals.find((d) => d.id === dealId)
  if (!deal) throw new Error(`Unknown deal: ${dealId}`)
  if (deal.stage === 'closed_won' || deal.stage === 'closed_lost') {
    throw new Error(`Deal ${dealId} is already closed`)
  }
  const clinic = db.clinics.find((c) => c.id === deal.clinic_id)
  if (clinic?.owner_rep_id && clinic.owner_rep_id !== repId) {
    throw new Error('This deal belongs to another rep')
  }
  deal.stage = stage
  if (clinic && !clinic.owner_rep_id) clinic.owner_rep_id = repId
  persist()
  return structuredClone(deal)
}

/** Closes a deal won or lost — won moves the clinic to 'active' (today's
 *  "reorder" meaning), lost moves it to 'lost'. Locks the deal; no
 *  reopening in this pass (DEALS_SPEC.md section 6). */
export async function closeDeal(
  dealId: string,
  outcome: 'won' | 'lost',
  lostReason: string | null,
  repId: string,
): Promise<Deal> {
  const deal = db.deals.find((d) => d.id === dealId)
  if (!deal) throw new Error(`Unknown deal: ${dealId}`)
  if (deal.stage === 'closed_won' || deal.stage === 'closed_lost') {
    throw new Error(`Deal ${dealId} is already closed`)
  }
  const clinic = db.clinics.find((c) => c.id === deal.clinic_id)
  if (clinic?.owner_rep_id && clinic.owner_rep_id !== repId) {
    throw new Error('This deal belongs to another rep')
  }
  deal.stage = outcome === 'won' ? 'closed_won' : 'closed_lost'
  deal.closed_at = isoDate(new Date())
  deal.lost_reason = outcome === 'lost' ? lostReason : null
  if (clinic) {
    if (!clinic.owner_rep_id) clinic.owner_rep_id = repId
    clinic.stage = outcome === 'won' ? 'active' : 'lost'
  }
  persist()
  return structuredClone(deal)
}
```

- [ ] **Step 7: Build check**

Run: `npm run build 2>&1 | grep "mockStore.ts"`
Expected: no output — `mockStore.ts` now type-checks against the Task 2 types. (Other files still error; expected until their tasks.)

- [ ] **Step 8: Commit**

```bash
git add src/data/mockStore.ts
git commit -m "Add deals/contacts CRUD to mockStore, rewrite promoteLead/logActivity for the new shape"
```

---

### Task 5: `supabaseStore.ts` — same functions, calling the new RPCs

**Files:**
- Modify: `src/data/supabaseStore.ts`

**Interfaces:**
- Consumes: `Deal`, `Contact` (Task 2); `advance_deal_stage`, `close_deal`, `upsert_contact` RPCs and `deals`/`contacts` tables (Task 1)
- Produces: same five function signatures as Task 4 (mock/Supabase parity)

- [ ] **Step 1: Update imports**

```ts
import type {
  Activity,
  CertificationAttempt,
  CertificationModule,
  CertificationQuestion,
  Clinic,
  Contact,
  Deal,
  Lead,
  LicensedState,
  Order,
  Product,
  ProductChangeLog,
  RefillStatus,
  RefillWithStatus,
  Rep,
} from './schema'
import type {
  AssistantResult,
  PublicProduct,
  LogActivityInput,
  LogActivityResult,
  MagicLinkResult,
  NewLeadInput,
  ProductFormInput,
  SheetSyncResult,
  UpsertContactInput,
} from './storeTypes'
```

- [ ] **Step 2: Update `logActivity` to pass `p_contact_id`**

```ts
export async function logActivity(input: LogActivityInput, _repId: string): Promise<LogActivityResult> {
  const { data, error } = await db().rpc('log_activity', {
    p_lead_id: (input.leadId ?? null) as string,
    p_clinic_id: (input.clinicId ?? null) as string,
    p_type: input.type,
    p_notes: input.notes as string,
    p_occurred_at: input.occurredAt,
    p_contact_id: (input.contactId ?? null) as string,
  })
  if (error) throw error
  const row = data[0]
  if (!row.ok) {
    if (row.reason === 'owned_by_other') {
      return { ok: false, reason: 'owned_by_other', ownerName: row.owner_name, since: row.since }
    }
    return { ok: false, reason: 'already_promoted', clinicId: row.promoted_clinic_id }
  }
  return { ok: true, activityId: row.activity_id, promotedClinicId: row.promoted_clinic_id }
}
```

- [ ] **Step 3: Add `listDeals`, `listContacts`, `upsertContact`, `advanceDealStage`, `closeDeal`**

Add right after `listOrders`:

```ts
/** All deals, or one clinic's, most recent first. */
export async function listDeals(clinicId?: string): Promise<Deal[]> {
  let query = db().from('deals').select('*').order('opened_at', { ascending: false })
  if (clinicId) query = query.eq('clinic_id', clinicId)
  const { data, error } = await query
  if (error) throw error
  return data as Deal[]
}

export async function listContacts(clinicId: string): Promise<Contact[]> {
  const { data, error } = await db().from('contacts').select('*').eq('clinic_id', clinicId)
  if (error) throw error
  return data as Contact[]
}

// _repId kept for interface parity with mockStore.ts — the real backend
// derives the acting rep from the authenticated session. See
// upsert_contact in the phase1_17 migration.
export async function upsertContact(input: UpsertContactInput, _repId: string): Promise<Contact> {
  const { data, error } = await db().rpc('upsert_contact', {
    p_id: (input.id ?? null) as string,
    p_clinic_id: input.clinicId,
    p_name: input.name,
    p_role: input.role as string,
    p_phone: input.phone as string,
    p_email: input.email as string,
    p_is_decision_maker: input.isDecisionMaker,
  })
  if (error) throw error
  return data as unknown as Contact
}

// _repId kept for interface parity — the real backend derives the
// caller from the session and enforces the ownership lock server-side.
// See advance_deal_stage in the phase1_17 migration.
export async function advanceDealStage(
  dealId: string,
  stage: 'introduction' | 'meeting_set' | 'follow_up',
  _repId: string,
): Promise<Deal> {
  const { data, error } = await db().rpc('advance_deal_stage', { p_deal_id: dealId, p_stage: stage })
  if (error) throw error
  return data as unknown as Deal
}

// _repId kept for interface parity — see close_deal in the phase1_17
// migration for the real ownership check.
export async function closeDeal(
  dealId: string,
  outcome: 'won' | 'lost',
  lostReason: string | null,
  _repId: string,
): Promise<Deal> {
  const { data, error } = await db().rpc('close_deal', {
    p_deal_id: dealId,
    p_outcome: outcome,
    p_lost_reason: lostReason as string,
  })
  if (error) throw error
  return data as unknown as Deal
}
```

- [ ] **Step 4: Build check**

Run: `npm run build 2>&1 | grep "supabaseStore.ts"`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/data/supabaseStore.ts
git commit -m "Add deals/contacts CRUD to supabaseStore, wire log_activity's new contact_id param"
```

---

### Task 6: `store.ts` — wire the new exports

**Files:**
- Modify: `src/data/store.ts`

**Interfaces:**
- Consumes: `listDeals`, `listContacts`, `upsertContact`, `advanceDealStage`, `closeDeal` from both `mockStore` and `supabaseStore` (Tasks 4-5)
- Produces: same, re-exported — consumed by every UI task from here on

- [ ] **Step 1: Add the exports and the new type re-export**

```ts
export type { AssistantResult, PublicProduct, LogActivityInput, LogActivityResult, MagicLinkResult, NewLeadInput, SheetSyncResult, ProductFormInput, UpsertContactInput } from './storeTypes'
```

Add after `export const listOrders = impl.listOrders`:

```ts
export const listDeals = impl.listDeals
export const listContacts = impl.listContacts
export const upsertContact = impl.upsertContact
export const advanceDealStage = impl.advanceDealStage
export const closeDeal = impl.closeDeal
```

- [ ] **Step 2: Full build check**

Run: `npm run build 2>&1 | tail -80`
Expected: remaining errors are only in `Leads.tsx`, `Pipeline.tsx`, `Dashboard.tsx`, `Analytics.tsx`, `CrmOverview.tsx`, `LogActivityForm.tsx`, `ActivityHistory.tsx` — the data layer is now fully consistent. Confirm no errors reference `mockStore.ts`, `supabaseStore.ts`, `seed.ts`, or `schema.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/data/store.ts
git commit -m "Wire deals/contacts store functions through store.ts"
```

---

### Task 7: `LogActivityForm` — optional contact picker

**Files:**
- Modify: `src/components/LogActivityForm.tsx`

**Interfaces:**
- Consumes: `Contact` (Task 2)
- Produces: `LogActivityForm` now takes an optional `contacts: Contact[]` prop; `onSubmit` gains a 4th argument `contactId: string | null` — every caller (Task 11, 12, 13) passes it through to `logActivity`

- [ ] **Step 1: Rewrite the component**

```tsx
import { useState } from 'react'
import type { ActivityType, Contact } from '../data/schema'
import { Note } from './ui'

const TYPES: { value: ActivityType; label: string }[] = [
  { value: 'call', label: 'Call' },
  { value: 'text', label: 'Text' },
  { value: 'visit', label: 'In-person visit' },
  { value: 'email', label: 'Email' },
  { value: 'note', label: 'Note' },
]

const inputClass = 'rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-1.5 text-sm'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Small inline form for logging a call/text/visit/email/note. Shared by
 *  Leads (where a 'visit' promotes), Pipeline/company pages (where every
 *  type just adds to history) — see CRM_SPEC.md and DEALS_SPEC.md.
 *  `contacts`/`defaultContactId` are optional — a lead has no contacts
 *  yet, and a quick log doesn't require picking one. */
export function LogActivityForm({
  isLead = false,
  contacts,
  defaultContactId = null,
  submitting,
  onSubmit,
  onCancel,
}: {
  isLead?: boolean
  contacts?: Contact[]
  defaultContactId?: string | null
  submitting: boolean
  onSubmit: (type: ActivityType, notes: string, occurredAt: string, contactId: string | null) => void
  onCancel: () => void
}) {
  const [type, setType] = useState<ActivityType>('call')
  const [notes, setNotes] = useState('')
  const [occurredAt, setOccurredAt] = useState(today())
  const [contactId, setContactId] = useState<string>(defaultContactId ?? '')

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-sm border border-[var(--surface-line)] p-3">
      <div className="flex flex-wrap gap-2">
        <select value={type} onChange={(e) => setType(e.target.value as ActivityType)} className={inputClass}>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} className={inputClass} />
        {contacts && contacts.length > 0 && (
          <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={inputClass}>
            <option value="">Who did you talk to? (optional)</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.role ? ` (${c.role})` : ''}
              </option>
            ))}
          </select>
        )}
      </div>
      {isLead && type === 'visit' && (
        <Note>This promotes the lead to Pipeline — you'll own it, first step logged as a drop-in.</Note>
      )}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes…"
        rows={2}
        className={inputClass}
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={submitting}
          onClick={() => onSubmit(type, notes.trim(), occurredAt, contactId || null)}
          className="rounded-full bg-[var(--surface-teal)] px-4 py-1.5 text-sm text-white disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Log it'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-[var(--surface-line)] px-4 py-1.5 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build check**

Run: `npm run build 2>&1 | grep -c "LogActivityForm"`
Expected: a nonzero count — callers in `Leads.tsx`/`Pipeline.tsx` still use the old 3-arg `onSubmit` signature. Fixed in Tasks 11/13/14 when those files are rewritten; not an error in this file itself. Confirm with: `npm run build 2>&1 | grep "components/LogActivityForm.tsx"` — expect **no** output (the component's own file type-checks).

- [ ] **Step 3: Commit**

```bash
git add src/components/LogActivityForm.tsx
git commit -m "Add optional contact picker to LogActivityForm"
```

---

### Task 8: `ActivityHistory` — show which contact was involved

**Files:**
- Modify: `src/components/ActivityHistory.tsx`

**Interfaces:**
- Consumes: `Activity.contact_id` (Task 2)
- Produces: `ActivityHistory` gains an optional `contactById: Map<string, string>` prop

- [ ] **Step 1: Rewrite the component**

```tsx
import { useEffect, useState } from 'react'
import type { Activity } from '../data/schema'
import { listActivities } from '../data/store'
import { Note } from './ui'

const TYPE_LABEL: Record<Activity['type'], string> = {
  call: 'Call',
  text: 'Text',
  visit: 'Visit',
  email: 'Email',
  note: 'Note',
}

/** Read-only history list for one lead or clinic. When `contactById` is
 *  given (clinics only — a lead has no contacts yet), shows who the
 *  interaction was with. See CRM_SPEC.md and DEALS_SPEC.md. */
export function ActivityHistory({
  target,
  repById,
  contactById,
}: {
  target: { leadId?: string; clinicId?: string }
  repById: Map<string, string>
  contactById?: Map<string, string>
}) {
  const [activities, setActivities] = useState<Activity[] | null>(null)
  const { leadId, clinicId } = target

  useEffect(() => {
    listActivities({ leadId, clinicId }).then(setActivities)
  }, [leadId, clinicId])

  if (activities === null) return null
  if (activities.length === 0) return <Note>No activity logged yet.</Note>

  return (
    <ul className="mt-2 flex flex-col gap-1.5 text-sm">
      {activities.map((a) => {
        const contactName = a.contact_id ? contactById?.get(a.contact_id) : undefined
        return (
          <li key={a.id} className="border-b border-[var(--surface-line)] pb-1.5">
            <span className="font-mono text-xs tracking-wide text-[var(--surface-ink-soft)] uppercase">
              {a.occurred_at} · {TYPE_LABEL[a.type]} · {repById.get(a.rep_id) ?? 'unknown'}
              {contactName ? ` · with ${contactName}` : ''}
            </span>
            {a.notes && <p className="mt-0.5">{a.notes}</p>}
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 2: Build check**

Run: `npm run build 2>&1 | grep "components/ActivityHistory.tsx"`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/ActivityHistory.tsx
git commit -m "Show which contact an activity was with, when known"
```

---

### Task 9: `DealSection` component — stage selector + close won/lost

**Files:**
- Create: `src/components/DealSection.tsx`

**Interfaces:**
- Consumes: `Deal`, `DealStage` (Task 2); `advanceDealStage`, `closeDeal` (Tasks 4-6)
- Produces: `DealSection({ deal, onChanged }: { deal: Deal; onChanged: () => void })` — used by the company page (Task 11)

- [ ] **Step 1: Write the component**

```tsx
import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import type { Deal, DealStage } from '../data/schema'
import { advanceDealStage, closeDeal } from '../data/store'
import { Card, Note, Pill } from './ui'

const OPEN_STAGES: { value: DealStage; label: string }[] = [
  { value: 'introduction', label: 'Introduction' },
  { value: 'meeting_set', label: 'Meeting set' },
  { value: 'follow_up', label: 'Follow-up meeting' },
]

const LOST_REASONS = ['Lost to competitor', 'Budget', 'No response', 'Not a fit', 'Other']

const inputClass = 'rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-1.5 text-sm'

/** The deal card on a company page — stage selector across the three
 *  open stages (either direction, no one-way ratchet) plus Close Won /
 *  Close Lost. Once closed, locked — no editing. See DEALS_SPEC.md
 *  section 3. */
export function DealSection({ deal, onChanged }: { deal: Deal; onChanged: () => void }) {
  const { currentRep } = useAuth()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [showLostReason, setShowLostReason] = useState(false)
  const [lostReason, setLostReason] = useState(LOST_REASONS[0])

  const isClosed = deal.stage === 'closed_won' || deal.stage === 'closed_lost'

  async function handleStageChange(stage: DealStage) {
    if (!currentRep || stage === deal.stage) return
    setSaving(true)
    setMessage(null)
    try {
      await advanceDealStage(deal.id, stage as 'introduction' | 'meeting_set' | 'follow_up', currentRep.id)
      onChanged()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not update the stage.')
    } finally {
      setSaving(false)
    }
  }

  async function handleClose(outcome: 'won' | 'lost') {
    if (!currentRep) return
    setSaving(true)
    setMessage(null)
    try {
      await closeDeal(deal.id, outcome, outcome === 'lost' ? lostReason : null, currentRep.id)
      setShowLostReason(false)
      onChanged()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not close the deal.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <h3 className="font-display text-lg font-semibold">Deal</h3>

      {isClosed ? (
        <div className="mt-3">
          <Pill tone={deal.stage === 'closed_won' ? 'current' : 'fail'}>
            {deal.stage === 'closed_won' ? 'Closed — Won' : 'Closed — Lost'}
          </Pill>
          {deal.closed_at && <p className="mt-2 text-sm text-[var(--surface-ink-soft)]">Closed {deal.closed_at}</p>}
          {deal.lost_reason && <p className="mt-1 text-sm text-[var(--surface-ink-soft)]">Reason: {deal.lost_reason}</p>}
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {OPEN_STAGES.map((s) => (
              <button
                key={s.value}
                type="button"
                disabled={saving}
                onClick={() => handleStageChange(s.value)}
                className={`rounded-full border px-3 py-1.5 text-sm disabled:opacity-60 ${
                  deal.stage === s.value
                    ? 'border-[var(--surface-teal)] text-[var(--surface-teal)]'
                    : 'border-[var(--surface-line)]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {deal.next_step && <p className="mt-3 text-sm">Next step: {deal.next_step}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleClose('won')}
              className="rounded-full bg-[var(--surface-teal)] px-4 py-1.5 text-sm text-white disabled:opacity-60"
            >
              Close — Won
            </button>
            {!showLostReason ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => setShowLostReason(true)}
                className="rounded-full border border-[var(--surface-line)] px-4 py-1.5 text-sm disabled:opacity-60"
              >
                Close — Lost
              </button>
            ) : (
              <>
                <select value={lostReason} onChange={(e) => setLostReason(e.target.value)} className={inputClass}>
                  {LOST_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleClose('lost')}
                  className="rounded-full border border-[var(--surface-vermilion)] px-4 py-1.5 text-sm text-[var(--surface-vermilion)] disabled:opacity-60"
                >
                  Confirm lost
                </button>
              </>
            )}
          </div>
        </>
      )}

      {message && <p className="mt-3 text-sm text-[var(--surface-vermilion)]">{message}</p>}
      {!deal.next_step && !isClosed && <Note>No next step set yet.</Note>}
    </Card>
  )
}
```

- [ ] **Step 2: Build check**

Run: `npm run build 2>&1 | grep "components/DealSection.tsx"`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/DealSection.tsx
git commit -m "Add DealSection component (stage selector, close won/lost)"
```

---

### Task 10: `ContactsSection` component — list + add-contact form

**Files:**
- Create: `src/components/ContactsSection.tsx`

**Interfaces:**
- Consumes: `Contact` (Task 2); `listContacts`, `upsertContact` (Tasks 4-6)
- Produces: `ContactsSection({ clinicId, onLogActivity }: { clinicId: string; onLogActivity: (contact: Contact) => void })` — used by the company page (Task 11); `onLogActivity` lets the company page open its `LogActivityForm` pre-filled with the clicked contact

- [ ] **Step 1: Write the component**

```tsx
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import type { Contact } from '../data/schema'
import { listContacts, upsertContact } from '../data/store'
import { Card, Note, Pill } from './ui'

const inputClass = 'rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-1.5 text-sm'

const BLANK = { name: '', role: '', phone: '', email: '', isDecisionMaker: false }

/** Contacts tab on the company page — the list, an add-contact form, and
 *  a "Log activity" shortcut per person. See DEALS_SPEC.md section 3. */
export function ContactsSection({
  clinicId,
  onLogActivity,
}: {
  clinicId: string
  onLogActivity: (contact: Contact) => void
}) {
  const { currentRep } = useAuth()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)

  function refresh() {
    listContacts(clinicId).then(setContacts)
  }

  useEffect(refresh, [clinicId])

  async function handleSubmit() {
    if (!currentRep || !form.name.trim()) return
    setSaving(true)
    try {
      await upsertContact(
        {
          clinicId,
          name: form.name.trim(),
          role: form.role.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          isDecisionMaker: form.isDecisionMaker,
        },
        currentRep.id,
      )
      setForm(BLANK)
      setShowForm(false)
      refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Contacts</h3>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-full border border-[var(--surface-line)] px-3 py-1 text-xs"
          >
            Add contact
          </button>
        )}
      </div>

      {contacts.length === 0 && !showForm && <Note>No contacts yet.</Note>}

      {contacts.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {contacts.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--surface-line)] pb-2">
              <div>
                <span className="font-semibold">{c.name}</span>
                {c.role && <span className="ml-2 text-sm text-[var(--surface-ink-soft)]">{c.role}</span>}
                {c.is_decision_maker && (
                  <span className="ml-2">
                    <Pill tone="current">Decision maker</Pill>
                  </span>
                )}
                <div className="font-mono text-xs text-[var(--surface-ink-soft)]">
                  {c.phone ?? '—'} {c.email ? `· ${c.email}` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onLogActivity(c)}
                className="rounded-full border border-[var(--surface-line)] px-3 py-1 text-xs"
              >
                Log activity
              </button>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <div className="mt-3 flex flex-col gap-2 rounded-sm border border-[var(--surface-line)] p-3">
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
          />
          <input
            placeholder="Role (e.g. Provider, Office Manager)"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className={inputClass}
          />
          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={inputClass}
          />
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputClass}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isDecisionMaker}
              onChange={(e) => setForm({ ...form, isDecisionMaker: e.target.checked })}
            />
            Decision maker
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving || !form.name.trim()}
              onClick={handleSubmit}
              className="rounded-full bg-[var(--surface-teal)] px-4 py-1.5 text-sm text-white disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save contact'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setForm(BLANK)
              }}
              className="rounded-full border border-[var(--surface-line)] px-4 py-1.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
```

- [ ] **Step 2: Build check**

Run: `npm run build 2>&1 | grep "components/ContactsSection.tsx"`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/ContactsSection.tsx
git commit -m "Add ContactsSection component (list, add-contact form, log-activity shortcut)"
```

---

### Task 11: Company page (clinic)

**Files:**
- Create: `src/pages/portal/crm/CompanyPage.tsx`

**Interfaces:**
- Consumes: `DealSection` (Task 9), `ContactsSection` (Task 10), `ActivityHistory` and its `contactById` prop (Task 8), `OrdersHistory`/`orderTotals` (already in repo), `LogActivityForm` and its `contacts`/`defaultContactId` props (Task 7), `listClinics`, `listDeals`, `listContacts`, `listReps`, `listRepProducts`, `logActivity`
- Produces: `CompanyPage` component, mounted at `/portal/crm/clinics/:clinicId` (Task 13 wires the route)

- [ ] **Step 1: Write the component**

```tsx
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthContext'
import type { ActivityType, Clinic, Contact, Deal, Product, Rep } from '../../../data/schema'
import { listClinics, listContacts, listDeals, listOrders, listRepProducts, listReps, logActivity } from '../../../data/store'
import { Card, Note, Pill, SectionHeading } from '../../../components/ui'
import { DealSection } from '../../../components/DealSection'
import { ContactsSection } from '../../../components/ContactsSection'
import { ActivityHistory } from '../../../components/ActivityHistory'
import { LogActivityForm } from '../../../components/LogActivityForm'
import { OrdersHistory } from '../../../components/OrdersHistory'
import { orderTotals, money } from '../../../data/orders'

const STATUS_LABEL: Record<Clinic['stage'], string> = {
  in_pipeline: 'In pipeline',
  active: 'Active account',
  lost: 'Lost',
}

export function CompanyPage() {
  const { clinicId } = useParams<{ clinicId: string }>()
  const { currentRep } = useAuth()
  const [clinic, setClinic] = useState<Clinic | null | undefined>(undefined)
  const [deal, setDeal] = useState<Deal | null>(null)
  const [reps, setReps] = useState<Rep[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orderCount12mo, setOrderCount12mo] = useState(0)
  const [orderValue12mo, setOrderValue12mo] = useState(0)
  const [logTarget, setLogTarget] = useState<{ contactId: string | null } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  function refresh() {
    if (!clinicId) return
    listClinics().then((all) => setClinic(all.find((c) => c.id === clinicId) ?? null))
    listDeals(clinicId).then((deals) => setDeal(deals[0] ?? null))
    listReps().then(setReps)
    listContacts(clinicId).then(setContacts)
    listRepProducts().then(setProducts)
    listOrders(clinicId).then((orders) => {
      const cutoff = new Date()
      cutoff.setFullYear(cutoff.getFullYear() - 1)
      const recent = orders.filter((o) => new Date(`${o.ordered_at}T00:00:00`) >= cutoff)
      const productById = new Map(products.map((p) => [p.id, p]))
      const totals = orderTotals(recent, productById)
      setOrderCount12mo(totals.count)
      setOrderValue12mo(totals.value)
    })
  }

  useEffect(refresh, [clinicId])
  // Recompute the 12-month total once products load (orderTotals needs
  // pricing) — refresh() already re-runs listOrders, but products may
  // arrive after the first pass, so this dependency re-triggers it.
  useEffect(refresh, [products.length])

  const repById = useMemo(() => new Map(reps.map((r) => [r.id, r.name])), [reps])
  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c.name])), [contacts])
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  async function handleLog(type: ActivityType, notes: string, occurredAt: string, contactId: string | null) {
    if (!currentRep || !clinicId) return
    setSubmitting(true)
    setMessage(null)
    const result = await logActivity({ clinicId, type, notes: notes || null, occurredAt, contactId: contactId ?? undefined }, currentRep.id)
    setSubmitting(false)
    if (result.ok) {
      setMessage('Logged.')
      setLogTarget(null)
      refresh()
    } else if (result.reason === 'owned_by_other') {
      setMessage(`Blocked — owned by ${result.ownerName}${result.since ? ` since ${result.since}` : ''}.`)
    }
  }

  if (clinic === undefined) return null
  if (clinic === null) return <Note>Clinic not found.</Note>

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionHeading>{clinic.name}</SectionHeading>
          <p className="mt-1 text-sm text-[var(--surface-ink-soft)]">
            {clinic.city} · {clinic.segment} · {clinic.tier} · {clinic.cluster}
          </p>
        </div>
        <Pill tone={clinic.stage === 'active' ? 'current' : clinic.stage === 'lost' ? 'fail' : 'review'}>
          {STATUS_LABEL[clinic.stage]}
        </Pill>
      </div>
      <p className="mt-1 text-sm text-[var(--surface-ink-soft)]">
        Owner: {clinic.owner_rep_id ? (repById.get(clinic.owner_rep_id) ?? 'unknown') : 'Unowned'}
      </p>

      {message && <p className="mt-4 font-mono text-sm text-[var(--surface-teal)]">{message}</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {deal && <DealSection deal={deal} onChanged={refresh} />}

        <Card>
          <h3 className="font-display text-lg font-semibold">Orders</h3>
          <p className="mt-1 text-sm text-[var(--surface-ink-soft)]">
            Trailing 12 months: <span className="font-mono">{money(orderValue12mo)}</span> · {orderCount12mo} order
            {orderCount12mo === 1 ? '' : 's'}
          </p>
          <div className="mt-3">
            <OrdersHistory clinicId={clinic.id} productById={productById} />
          </div>
        </Card>

        <ContactsSection clinicId={clinic.id} onLogActivity={(contact: Contact) => setLogTarget({ contactId: contact.id })} />

        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Activity history</h3>
            {!logTarget && (
              <button
                type="button"
                onClick={() => setLogTarget({ contactId: null })}
                className="rounded-full border border-[var(--surface-line)] px-3 py-1 text-xs"
              >
                Log activity
              </button>
            )}
          </div>
          {logTarget && (
            <LogActivityForm
              contacts={contacts}
              submitting={submitting}
              defaultContactId={logTarget.contactId}
              onSubmit={handleLog}
              onCancel={() => setLogTarget(null)}
            />
          )}
          <div className="mt-3">
            <ActivityHistory target={{ clinicId: clinic.id }} repById={repById} contactById={contactById} />
          </div>
        </Card>
      </div>

      <p className="mt-6">
        <Link to="/portal/crm/pipeline" className="font-mono text-sm text-[var(--surface-ink-soft)] hover:text-[var(--surface-ink)]">
          ← Back to Deal Pipeline
        </Link>
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Build check**

Run: `npm run build 2>&1 | grep "CompanyPage.tsx"`
Expected: no output. (The route isn't wired yet — Task 13 adds it — so this file is unreachable but should still type-check standalone.)

- [ ] **Step 3: Commit**

```bash
git add src/pages/portal/crm/CompanyPage.tsx
git commit -m "Add company page: deal, contacts, orders, activity history"
```

---

### Task 12: Lead detail page (lightweight)

**Files:**
- Create: `src/pages/portal/crm/LeadDetail.tsx`

**Interfaces:**
- Consumes: `listLeads`, `promoteLead` (existing)
- Produces: `LeadDetail` component, mounted at `/portal/crm/leads/:leadId` (Task 13)

- [ ] **Step 1: Write the component**

```tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthContext'
import type { Lead } from '../../../data/schema'
import { listLeads, promoteLead } from '../../../data/store'
import { Card, Note, SectionHeading } from '../../../components/ui'

/** The lightweight page a lead's name links to — basic info and a way
 *  to promote it. No contacts/deal/orders/activity — none of that
 *  exists before promotion. See DEALS_SPEC.md section 3. */
export function LeadDetail() {
  const { leadId } = useParams<{ leadId: string }>()
  const { currentRep } = useAuth()
  const navigate = useNavigate()
  const [lead, setLead] = useState<Lead | null | undefined>(undefined)
  const [promoting, setPromoting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!leadId) return
    listLeads().then((all) => setLead(all.find((l) => l.id === leadId) ?? null))
  }, [leadId])

  async function handlePromote() {
    if (!lead || !currentRep) return
    setPromoting(true)
    setMessage(null)
    try {
      const clinic = await promoteLead(lead.id, currentRep.id)
      navigate(`/portal/crm/clinics/${clinic.id}`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Promote failed.')
      setPromoting(false)
    }
  }

  if (lead === undefined) return null
  if (lead === null) return <Note>Lead not found.</Note>

  return (
    <div>
      <SectionHeading>{lead.name}</SectionHeading>
      <p className="mt-1 text-sm text-[var(--surface-ink-soft)]">
        {lead.city} · {lead.segment} · {lead.tier} · {lead.cluster}
      </p>

      <Card className="mt-6 max-w-md">
        <Note>
          Nothing's here yet — contacts, a deal, and order history all start once this lead is
          promoted to the pipeline.
        </Note>
        {lead.status === 'promoted' ? (
          <p className="mt-3 text-sm">
            Already promoted —{' '}
            <Link to={`/portal/crm/clinics/${lead.promoted_clinic_id}`} className="text-[var(--surface-teal)]">
              open its company page
            </Link>
            .
          </p>
        ) : (
          <button
            type="button"
            disabled={promoting}
            onClick={handlePromote}
            className="mt-3 rounded-full bg-[var(--surface-teal)] px-4 py-1.5 text-sm text-white disabled:opacity-60"
          >
            {promoting ? 'Promoting…' : 'Promote to pipeline'}
          </button>
        )}
        {message && <p className="mt-3 text-sm text-[var(--surface-vermilion)]">{message}</p>}
      </Card>

      <p className="mt-6">
        <Link to="/portal/crm/leads" className="font-mono text-sm text-[var(--surface-ink-soft)] hover:text-[var(--surface-ink)]">
          ← Back to Leads
        </Link>
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Build check**

Run: `npm run build 2>&1 | grep "LeadDetail.tsx"`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/pages/portal/crm/LeadDetail.tsx
git commit -m "Add lightweight lead detail page"
```

---

### Task 13: Deal Pipeline page + routing + nav label

**Files:**
- Create: `src/pages/portal/crm/DealPipeline.tsx`
- Delete: `src/pages/portal/Pipeline.tsx`
- Modify: `src/App.tsx`
- Modify: `src/layouts/CrmLayout.tsx`

**Interfaces:**
- Consumes: `listDeals`, `listClinics`, `listReps` (existing/Tasks 4-6); `CompanyPage` (Task 11), `LeadDetail` (Task 12)
- Produces: route `/portal/crm/pipeline` now renders `DealPipeline`; new routes `/portal/crm/clinics/:clinicId` and `/portal/crm/leads/:leadId`

- [ ] **Step 1: Write `DealPipeline.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Clinic, Deal, DealStage, Rep } from '../../../data/schema'
import { listClinics, listDeals, listReps } from '../../../data/store'
import { Card, Note, SectionHeading } from '../../../components/ui'

const STAGES: { key: DealStage; label: string }[] = [
  { key: 'introduction', label: 'Introduction' },
  { key: 'meeting_set', label: 'Meeting set' },
  { key: 'follow_up', label: 'Follow-up meeting' },
  { key: 'closed_won', label: 'Close sale' },
  { key: 'closed_lost', label: 'Close lost' },
]

/** Replaces the old flat Pipeline tab. Five stage columns matching the
 *  5-stage deal pipeline; closed columns are historical reference, not
 *  an active working queue. See DEALS_SPEC.md section 4. */
export function DealPipeline() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [reps, setReps] = useState<Rep[]>([])
  const [stage, setStage] = useState<DealStage>('introduction')

  useEffect(() => {
    listDeals().then(setDeals)
    listClinics().then(setClinics)
    listReps().then(setReps)
  }, [])

  const clinicById = useMemo(() => new Map(clinics.map((c) => [c.id, c])), [clinics])
  const repById = useMemo(() => new Map(reps.map((r) => [r.id, r.name])), [reps])
  const counts = useMemo(() => {
    const c: Record<DealStage, number> = { introduction: 0, meeting_set: 0, follow_up: 0, closed_won: 0, closed_lost: 0 }
    for (const d of deals) c[d.stage] += 1
    return c
  }, [deals])
  const visible = deals.filter((d) => d.stage === stage)

  return (
    <div>
      <SectionHeading>Deal Pipeline</SectionHeading>
      <div className="mt-2">
        <Note>Introduction through Close sale/Close lost — every open and closed deal, one stage at a time.</Note>
      </div>

      <nav className="mt-4 flex flex-wrap gap-1 border-b border-[var(--surface-line)]">
        {STAGES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setStage(s.key)}
            className={`border-b-2 px-3 py-2.5 text-sm ${
              stage === s.key
                ? 'border-[var(--surface-teal)] text-[var(--surface-ink)]'
                : 'border-transparent text-[var(--surface-ink-soft)]'
            }`}
          >
            {s.label} ({counts[s.key]})
          </button>
        ))}
      </nav>

      {visible.length === 0 ? (
        <div className="mt-6">
          <Note>Nothing in this stage.</Note>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {visible.map((d) => {
            const clinic = clinicById.get(d.clinic_id)
            if (!clinic) return null
            return (
              <Link key={d.id} to={`/portal/crm/clinics/${clinic.id}`} className="block">
                <Card className="transition-colors hover:border-[var(--surface-teal)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold">{clinic.name}</h3>
                    <span className="font-mono text-xs text-[var(--surface-ink-soft)] uppercase">
                      {clinic.owner_rep_id ? (repById.get(clinic.owner_rep_id) ?? 'unknown') : 'Unowned'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--surface-ink-soft)]">
                    {clinic.city} · {clinic.tier} · {clinic.cluster}
                  </p>
                  {d.next_step && <p className="mt-2 text-sm">Next: {d.next_step}</p>}
                  {d.target_close_at && <p className="mt-1 text-xs text-[var(--surface-ink-soft)]">Target close: {d.target_close_at}</p>}
                  {d.stage === 'closed_lost' && d.lost_reason && (
                    <p className="mt-1 text-xs text-[var(--surface-vermilion)]">Lost: {d.lost_reason}</p>
                  )}
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Delete the old `Pipeline.tsx`**

Run: `rm src/pages/portal/Pipeline.tsx`

- [ ] **Step 3: Update `App.tsx`**

Change the imports:

```tsx
import { CrmOverview } from './pages/portal/crm/CrmOverview'
import { Leads } from './pages/portal/crm/Leads'
import { LeadDetail } from './pages/portal/crm/LeadDetail'
import { DealPipeline } from './pages/portal/crm/DealPipeline'
import { CompanyPage } from './pages/portal/crm/CompanyPage'
import { FindProspects } from './pages/portal/crm/FindProspects'
import { Analytics } from './pages/portal/crm/Analytics'
```

(This removes `import { Pipeline } from './pages/portal/Pipeline'`.)

Change the `crm` route block to:

```tsx
        <Route path="crm" element={<CrmLayout />}>
          <Route index element={<CrmOverview />} />
          <Route path="leads" element={<Leads />} />
          <Route path="leads/:leadId" element={<LeadDetail />} />
          <Route path="pipeline" element={<DealPipeline />} />
          <Route path="clinics/:clinicId" element={<CompanyPage />} />
          <Route path="find-prospects" element={<FindProspects />} />
          <Route path="analytics" element={<Analytics />} />
        </Route>
```

- [ ] **Step 4: Rename the nav label in `CrmLayout.tsx`**

```ts
const crmNavItems = [
  { to: '/portal/crm', label: 'Overview', end: true },
  { to: '/portal/crm/leads', label: 'Leads', end: false },
  { to: '/portal/crm/pipeline', label: 'Deal Pipeline', end: false },
  { to: '/portal/crm/find-prospects', label: 'Find prospects', end: false },
  { to: '/portal/crm/analytics', label: 'Analytics', end: false },
]
```

(Only the `pipeline` row's `label` changes, from `'Pipeline'` to `'Deal Pipeline'`.)

- [ ] **Step 5: Build check**

Run: `npm run build 2>&1 | grep -E "App.tsx|CrmLayout.tsx|DealPipeline.tsx"`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add -A src/pages/portal/crm/DealPipeline.tsx src/pages/portal/Pipeline.tsx src/App.tsx src/layouts/CrmLayout.tsx
git commit -m "Replace flat Pipeline tab with the 5-stage Deal Pipeline, add company/lead detail routes"
```

---

### Task 14: `Leads.tsx` — renamed stage values, 4th "Lost" bucket, link to detail pages

**Files:**
- Modify: `src/pages/portal/crm/Leads.tsx`

**Interfaces:**
- Consumes: `ClinicStatus` (Task 2), `LogActivityForm`'s new signature (Task 7)
- Produces: none new — leaf page

- [ ] **Step 1: Rewrite the file**

```tsx
import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthContext'
import type { ActivityType, Clinic, Lead, Rep } from '../../../data/schema'
import { listClinics, listLeads, listReps, logActivity, promoteLead } from '../../../data/store'
import { Note, Pill, SectionHeading, TableWrap, td, th } from '../../../components/ui'
import { LogActivityForm } from '../../../components/LogActivityForm'
import { ActivityHistory } from '../../../components/ActivityHistory'

type BookState = 'prospecting' | 'pipeline' | 'active' | 'lost'

interface BookRow {
  key: string
  name: string
  city: string
  segment: string
  tier: string
  cluster: string
  state: BookState
  leadId?: string
  clinicId?: string
  ownerName?: string
}

const STATE_LABEL: Record<BookState, string> = {
  prospecting: 'Prospecting',
  pipeline: 'In pipeline',
  active: 'Active account',
  lost: 'Lost',
}

// Row-edge color encodes funnel state — gold (not yet touched) through
// teal (being worked) to vermilion (converted); lost gets a dim, muted
// edge rather than reusing a color that already means something else.
// See CRM_SPEC.md / DEALS_SPEC.md.
const STATE_BORDER: Record<BookState, string> = {
  prospecting: 'border-l-[var(--surface-gold)]',
  pipeline: 'border-l-[var(--surface-teal)]',
  active: 'border-l-[var(--surface-vermilion)]',
  lost: 'border-l-[var(--surface-ink-soft)]',
}

export function Leads() {
  const { currentRep } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [reps, setReps] = useState<Rep[]>([])
  const [cluster, setCluster] = useState('')
  const [tier, setTier] = useState('')
  const [state, setState] = useState('')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [promoting, setPromoting] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [openPanel, setOpenPanel] = useState<{ key: string; kind: 'log' | 'history' } | null>(null)

  function refresh() {
    listLeads().then(setLeads)
    listClinics().then(setClinics)
  }

  useEffect(() => {
    refresh()
    listReps().then(setReps)
  }, [])

  const repById = useMemo(() => new Map(reps.map((r) => [r.id, r.name])), [reps])

  const rows: BookRow[] = useMemo(() => {
    const leadRows: BookRow[] = leads
      .filter((l) => l.status === 'new' || l.status === 'contacted')
      .map((l) => ({
        key: `lead-${l.id}`,
        name: l.name,
        city: l.city,
        segment: l.segment,
        tier: l.tier,
        cluster: l.cluster,
        state: 'prospecting',
        leadId: l.id,
      }))
    const clinicRows: BookRow[] = clinics.map((c) => ({
      key: `clinic-${c.id}`,
      name: c.name,
      city: c.city,
      segment: c.segment,
      tier: c.tier,
      cluster: c.cluster,
      state: c.stage === 'active' ? 'active' : c.stage === 'lost' ? 'lost' : 'pipeline',
      clinicId: c.id,
      ownerName: c.owner_rep_id ? repById.get(c.owner_rep_id) : undefined,
    }))
    return [...leadRows, ...clinicRows].sort((a, b) => a.name.localeCompare(b.name))
  }, [leads, clinics, repById])

  const clusters = useMemo(() => [...new Set(rows.map((r) => r.cluster))].sort(), [rows])

  const filtered = rows.filter(
    (r) =>
      (!cluster || r.cluster === cluster) &&
      (!tier || r.tier === tier) &&
      (!state || r.state === state) &&
      r.name.toLowerCase().includes(search.toLowerCase()),
  )

  async function handlePromote(leadId: string, name: string) {
    if (!currentRep) return
    setPromoting(leadId)
    setMessage(null)
    try {
      await promoteLead(leadId, currentRep.id)
      setMessage(`${name} promoted to pipeline — you're the owner, first step logged as a drop-in.`)
      refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Promote failed.')
    } finally {
      setPromoting(null)
    }
  }

  async function handleLog(row: BookRow, type: ActivityType, notes: string, occurredAt: string, contactId: string | null) {
    if (!currentRep) return
    setSubmitting(true)
    setMessage(null)
    const result = await logActivity(
      { leadId: row.leadId, clinicId: row.clinicId, type, notes: notes || null, occurredAt, contactId: contactId ?? undefined },
      currentRep.id,
    )
    setSubmitting(false)
    if (result.ok) {
      setMessage(
        result.promotedClinicId
          ? `${row.name} promoted to pipeline from the visit — you're the owner.`
          : `Logged for ${row.name}.`,
      )
      setOpenPanel(null)
      refresh()
    } else if (result.reason === 'owned_by_other') {
      setMessage(`Blocked — ${row.name} is owned by ${result.ownerName}${result.since ? ` since ${result.since}` : ''}.`)
    } else {
      setMessage(`${row.name} was already promoted — log against it on its company page instead.`)
    }
  }

  return (
    <div>
      <SectionHeading>Leads</SectionHeading>
      <div className="mt-2">
        <Note>
          Everything in one place — who hasn't been touched yet, who's being worked, and who's
          already ordering. <strong>T1</strong> = strong ICP fit, work first (owner-operated,
          cash-pay, has a prescriber). <strong>T2</strong> = decent fit. <strong>T3</strong> =
          partial or unconfirmed fit, lowest priority.
        </Note>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={cluster}
          onChange={(e) => setCluster(e.target.value)}
          className="rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-1.5 text-sm"
        >
          <option value="">All clusters</option>
          {clusters.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          className="rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-1.5 text-sm"
        >
          <option value="">All tiers</option>
          <option value="T1">T1</option>
          <option value="T2">T2</option>
          <option value="T3">T3</option>
        </select>
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-1.5 text-sm"
        >
          <option value="">All states</option>
          <option value="prospecting">Prospecting</option>
          <option value="pipeline">In pipeline</option>
          <option value="active">Active account</option>
          <option value="lost">Lost</option>
        </select>
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-sm border border-[var(--surface-line)] bg-transparent px-3 py-1.5 text-sm"
        />
      </div>

      {message && <p className="mt-4 font-mono text-sm text-[var(--surface-teal)]">{message}</p>}

      <TableWrap>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>City</th>
              <th className={th}>Segment</th>
              <th className={th}>Tier</th>
              <th className={th}>Cluster</th>
              <th className={th}>State</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const isOpen = openPanel?.key === r.key
              const detailHref = r.leadId ? `/portal/crm/leads/${r.leadId}` : `/portal/crm/clinics/${r.clinicId}`
              return (
                <Fragment key={r.key}>
                  <tr className={`border-l-4 ${STATE_BORDER[r.state]}`}>
                    <td className={td}>
                      <Link to={detailHref} className="text-[var(--surface-teal)] hover:underline">
                        {r.name}
                      </Link>
                    </td>
                    <td className={td}>{r.city}</td>
                    <td className={td}>{r.segment}</td>
                    <td className={td}>{r.tier}</td>
                    <td className={td}>{r.cluster}</td>
                    <td className={td}>
                      {r.state === 'active' ? (
                        <Pill tone="current">{STATE_LABEL[r.state]}</Pill>
                      ) : r.state === 'lost' ? (
                        <Pill tone="open">{STATE_LABEL[r.state]}</Pill>
                      ) : r.state === 'pipeline' ? (
                        <Pill tone={r.ownerName ? 'owned' : 'open'}>
                          {r.ownerName ? `Owned · ${r.ownerName}` : STATE_LABEL[r.state]}
                        </Pill>
                      ) : (
                        <Pill tone="review">{STATE_LABEL[r.state]}</Pill>
                      )}
                    </td>
                    <td className={td}>
                      <div className="flex flex-wrap gap-2">
                        {r.leadId && (
                          <button
                            type="button"
                            disabled={promoting === r.leadId}
                            onClick={() => handlePromote(r.leadId!, r.name)}
                            className="inline-flex min-h-11 items-center rounded-full border border-[var(--surface-line)] px-3 py-2 text-xs disabled:opacity-60 md:min-h-0 md:py-1"
                          >
                            {promoting === r.leadId ? 'Promoting…' : 'Promote to pipeline'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setOpenPanel(isOpen && openPanel?.kind === 'log' ? null : { key: r.key, kind: 'log' })}
                          className="inline-flex min-h-11 items-center rounded-full border border-[var(--surface-line)] px-3 py-2 text-xs md:min-h-0 md:py-1"
                        >
                          Log activity
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenPanel(isOpen && openPanel?.kind === 'history' ? null : { key: r.key, kind: 'history' })}
                          className="inline-flex min-h-11 items-center rounded-full border border-[var(--surface-line)] px-3 py-2 text-xs md:min-h-0 md:py-1"
                        >
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={7} className={td}>
                        {openPanel.kind === 'log' ? (
                          <LogActivityForm
                            isLead={Boolean(r.leadId)}
                            submitting={submitting}
                            onSubmit={(type, notes, occurredAt, contactId) => handleLog(r, type, notes, occurredAt, contactId)}
                            onCancel={() => setOpenPanel(null)}
                          />
                        ) : (
                          <ActivityHistory target={{ leadId: r.leadId, clinicId: r.clinicId }} repById={repById} />
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </TableWrap>
    </div>
  )
}
```

- [ ] **Step 2: Build check**

Run: `npm run build 2>&1 | grep "crm/Leads.tsx"`
Expected: no output.

- [ ] **Step 3: Lint check**

Run: `npm run lint 2>&1 | grep "Leads.tsx"`
Expected: no new warnings beyond the pre-existing `AuthContext.tsx` ones (unrelated file).

- [ ] **Step 4: Commit**

```bash
git add src/pages/portal/crm/Leads.tsx
git commit -m "Update Leads for renamed clinic stages, add Lost bucket and detail-page links"
```

---

### Task 15: `Dashboard.tsx` — renamed stage values, deal-stage territory pills

**Files:**
- Modify: `src/pages/portal/Dashboard.tsx`

**Interfaces:**
- Consumes: `ClinicStatus`, `Deal` (Task 2); `listDeals` (Tasks 4-6)
- Produces: none new — leaf page

- [ ] **Step 1: Replace the `PIPELINE_STAGES`/`STAGE_LABEL` block and the territory-pills logic**

Find and remove:

```tsx
const PIPELINE_STAGES: PipelineStage[] = [
  'identify',
  'drop_in',
  'discovery',
  'solution',
  'onboard',
  'reorder',
]

const STAGE_LABEL: Record<PipelineStage, string> = {
  identify: 'Identify',
  drop_in: 'Drop-in',
  discovery: 'Discovery',
  solution: 'Solution',
  onboard: 'Onboard',
  reorder: 'Reorder',
}
```

Replace with:

```tsx
const DEAL_STAGES: DealStage[] = ['introduction', 'meeting_set', 'follow_up', 'closed_won', 'closed_lost']

const DEAL_STAGE_LABEL: Record<DealStage, string> = {
  introduction: 'Introduction',
  meeting_set: 'Meeting set',
  follow_up: 'Follow-up',
  closed_won: 'Won',
  closed_lost: 'Lost',
}
```

Update the type import at the top:

```tsx
import type { CertStatus, Clinic, Deal, DealStage, Order, Product, ProductChangeLog, Rep } from '../../data/schema'
```

Add `listDeals` to the store import:

```tsx
import {
  listClinics,
  listDeals,
  listOrders,
  listPendingReview,
  listProductChangeLog,
  listRefills,
  listRepProducts,
  listReps,
} from '../../data/store'
```

- [ ] **Step 2: Replace the `stageCounts` computation**

Find:

```tsx
  const stageCounts = useMemo(() => {
    const counts = Object.fromEntries(PIPELINE_STAGES.map((s) => [s, 0])) as Record<
      PipelineStage,
      number
    >
    for (const clinic of owned) counts[clinic.stage] += 1
    return counts
  }, [owned])
```

Replace with (add a `deals` state near the other `useState` calls first):

```tsx
  const [deals, setDeals] = useState<Deal[]>([])
```

Add to `refresh()`:

```tsx
    listDeals().then(setDeals)
```

Then:

```tsx
  const dealStageCounts = useMemo(() => {
    const ownedIds = new Set(owned.map((c) => c.id))
    const counts = Object.fromEntries(DEAL_STAGES.map((s) => [s, 0])) as Record<DealStage, number>
    for (const deal of deals) {
      if (ownedIds.has(deal.clinic_id)) counts[deal.stage] += 1
    }
    return counts
  }, [owned, deals])
```

- [ ] **Step 3: Update the "Your territory" card's pill rendering**

Find:

```tsx
            <div className="mt-3 flex flex-wrap gap-2">
              {PIPELINE_STAGES.map((stage) => (
                <Pill key={stage} tone={stageCounts[stage] > 0 ? 'current' : 'open'}>
                  {STAGE_LABEL[stage]} {stageCounts[stage]}
                </Pill>
              ))}
            </div>
```

Replace with:

```tsx
            <div className="mt-3 flex flex-wrap gap-2">
              {DEAL_STAGES.map((stage) => (
                <Pill key={stage} tone={dealStageCounts[stage] > 0 ? 'current' : 'open'}>
                  {DEAL_STAGE_LABEL[stage]} {dealStageCounts[stage]}
                </Pill>
              ))}
            </div>
```

- [ ] **Step 4: Update the "Active clinics" filter (`stage === 'reorder'` → `stage === 'active'`)**

Find:

```tsx
  const activeClinics = useMemo(
    () => owned.filter((c) => c.stage === 'reorder'),
    [owned],
  )
```

Replace with:

```tsx
  const activeClinics = useMemo(
    () => owned.filter((c) => c.stage === 'active'),
    [owned],
  )
```

- [ ] **Step 5: Fix the "Active clinics" table — the Contact column reads `clinics.phone`/`clinics.email`, which Task 1's migration drops**

The Active clinics table (built in an earlier session pass, before this plan) has a "Contact" column showing `c.phone`/`c.email` directly off the clinic row. Task 2 removes those fields from `Clinic` — that info now lives in `contacts`, which belongs on the company page (Task 11), not duplicated here. Fix: drop the Contact column entirely and make the clinic name link to its company page instead, so "who to call" is one click away rather than duplicated.

Find:

```tsx
              <tr>
                <th className={th}>Clinic</th>
                <th className={th}>Contact</th>
                <th className={th}>Order volume</th>
                <th className={th} />
              </tr>
```

Replace with:

```tsx
              <tr>
                <th className={th}>Clinic</th>
                <th className={th}>Order volume</th>
                <th className={th} />
              </tr>
```

Find:

```tsx
                      <td className={td}>
                        {c.name}
                        <div className="text-xs text-[var(--surface-ink-soft)]">{c.city}</div>
                      </td>
                      <td className={tdMono}>
                        {c.phone ?? '—'}
                        {c.email && <div>{c.email}</div>}
                      </td>
                      <td className={td}>
```

Replace with:

```tsx
                      <td className={td}>
                        <Link to={`/portal/crm/clinics/${c.id}`} className="text-[var(--surface-teal)] hover:underline">
                          {c.name}
                        </Link>
                        <div className="text-xs text-[var(--surface-ink-soft)]">{c.city}</div>
                      </td>
                      <td className={td}>
```

Find (the expandable Orders/History panel row — `colSpan` drops from 4 to 3, matching the now-3-column table):

```tsx
                    {isOpen && (
                      <tr>
                        <td colSpan={4} className={td}>
```

Replace with:

```tsx
                    {isOpen && (
                      <tr>
                        <td colSpan={3} className={td}>
```

(`Link` is already imported from `react-router-dom` in this file, from the existing Quick Actions/Needs Attention cards — no new import needed.)

- [ ] **Step 6: Build check**

Run: `npm run build 2>&1 | grep "Dashboard.tsx"`
Expected: no output.

- [ ] **Step 7: Manual verification**

Run: `npm run dev -- --port 5180` (background), then via Playwright: clear localStorage, sign in as `dana@integrativeconcepts.com` (owns `cl3`, an active clinic), navigate to `/portal/dashboard`. Expected: "Active clinics" still shows Game Day Men's Health with real order data (unchanged from before this plan) in a now-3-column table (Clinic/Order volume/actions), the clinic name links to `/portal/crm/clinics/cl3`; "Your territory" pills now read Introduction/Meeting set/Follow-up/Won/Lost instead of Identify/Drop-in/Discovery/Solution/Onboard/Reorder.

- [ ] **Step 8: Commit**

```bash
git add src/pages/portal/Dashboard.tsx
git commit -m "Update Dashboard for renamed clinic stages and deal-stage territory pills"
```

---

### Task 16: `Analytics.tsx` — renamed stage values in the funnel

**Files:**
- Modify: `src/pages/portal/crm/Analytics.tsx`

**Interfaces:**
- Consumes: `ClinicStatus` (Task 2)
- Produces: none new — leaf page

- [ ] **Step 1: Update the funnel/breakdown calculations**

Find:

```tsx
  const prospecting = leads.filter((l) => l.status === 'new' || l.status === 'contacted').length
  const pipeline = clinics.filter((c) => c.stage !== 'reorder').length
  const active = clinics.filter((c) => c.stage === 'reorder').length
```

Replace with:

```tsx
  const prospecting = leads.filter((l) => l.status === 'new' || l.status === 'contacted').length
  const pipeline = clinics.filter((c) => c.stage === 'in_pipeline').length
  const active = clinics.filter((c) => c.stage === 'active').length
```

Find (inside the `counts` helper):

```tsx
  function counts(pred: (t: string, cl: string) => boolean) {
    return {
      prospecting: leads.filter((l) => (l.status === 'new' || l.status === 'contacted') && pred(l.tier, l.cluster)).length,
      pipeline: clinics.filter((c) => c.stage !== 'reorder' && pred(c.tier, c.cluster)).length,
      active: clinics.filter((c) => c.stage === 'reorder' && pred(c.tier, c.cluster)).length,
    }
  }
```

Replace with:

```tsx
  function counts(pred: (t: string, cl: string) => boolean) {
    return {
      prospecting: leads.filter((l) => (l.status === 'new' || l.status === 'contacted') && pred(l.tier, l.cluster)).length,
      pipeline: clinics.filter((c) => c.stage === 'in_pipeline' && pred(c.tier, c.cluster)).length,
      active: clinics.filter((c) => c.stage === 'active' && pred(c.tier, c.cluster)).length,
    }
  }
```

(Deliberately not counting `'lost'` clinics anywhere in this funnel — Analytics is about the live funnel shape, same scope decision as Leads.tsx's headline three states in Task 14.)

- [ ] **Step 2: Build check**

Run: `npm run build 2>&1 | grep "crm/Analytics.tsx"`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/pages/portal/crm/Analytics.tsx
git commit -m "Update Analytics funnel for renamed clinic stages"
```

---

### Task 17: `CrmOverview.tsx` — renamed stage values

**Files:**
- Modify: `src/pages/portal/crm/CrmOverview.tsx`

**Interfaces:**
- Consumes: `ClinicStatus` (Task 2)
- Produces: none new — leaf page

- [ ] **Step 1: Update the three tile counts**

Find:

```tsx
  const prospecting = leads.filter((l) => l.status === 'new' || l.status === 'contacted').length
  const pipeline = clinics.filter((c) => c.stage !== 'reorder').length
  const active = clinics.filter((c) => c.stage === 'reorder').length
```

Replace with:

```tsx
  const prospecting = leads.filter((l) => l.status === 'new' || l.status === 'contacted').length
  const pipeline = clinics.filter((c) => c.stage === 'in_pipeline').length
  const active = clinics.filter((c) => c.stage === 'active').length
```

- [ ] **Step 2: Full build check — should now be clean everywhere**

Run: `npm run build 2>&1 | tail -40`
Expected: `✓ built in ...` with no errors at all.

- [ ] **Step 3: Full lint check**

Run: `npm run lint 2>&1 | tail -20`
Expected: only the two pre-existing `AuthContext.tsx` warnings (unrelated to this plan) — nothing new.

- [ ] **Step 4: Commit**

```bash
git add src/pages/portal/crm/CrmOverview.tsx
git commit -m "Update CRM overview tiles for renamed clinic stages"
```

---

### Task 18: Manual end-to-end verification + docs pointer update

**Files:**
- Modify: `CRM_SPEC.md`
- Modify: `CRM_USER_GUIDE.md`

**Interfaces:**
- Consumes: nothing (docs + verification only)
- Produces: nothing — final task

- [ ] **Step 1: Push the migration to make sure the real backend matches (if not already done in Task 1)**

Run: `npx supabase db push` — expected: `Already up to date` if Task 1 already pushed it; otherwise it applies now.

- [ ] **Step 2: Manual verification against the mock store (fast iteration)**

Run: `npm run dev -- --port 5181` in the background. Via Playwright: clear localStorage, sign in as `marcus@integrativeconcepts.com`, then:
1. Navigate to `/portal/crm` — expect the Overview page with 3 tiles and 4 cards (unchanged from before this plan, just reading renamed stage values now).
2. Navigate to `/portal/crm/pipeline` — expect the new 5-tab Deal Pipeline; click "Introduction" — expect `cl2`/`cl5` to appear; click "Close sale" — expect `cl1`/`cl3`.
3. Click a deal card (e.g. `cl2` Sculpted MD) — expect it to land on `/portal/crm/clinics/cl2`, showing the Deal section (stage buttons), an empty Contacts list with an "Add contact" button, an Orders section (empty for this clinic), and Activity history.
4. On that page, click "Add contact", fill in a name, save — expect it to appear in the list with a "Log activity" button.
5. Click that contact's "Log activity" button — expect the `LogActivityForm` to open with that contact pre-selected in the picker.
6. In the Deal section, click "Meeting set" — expect the stage buttons to update and the deal to move columns if you go back to `/portal/crm/pipeline`.
7. Click "Close — Won" — expect the Deal section to lock and show "Closed — Won"; navigate to `/portal/crm/leads` — expect Sculpted MD's row to now show the "Active account" pill.
8. Navigate to `/portal/crm/leads`, click a lead name (e.g. one still `status: 'new'`) — expect the lightweight `LeadDetail` page with a "Promote to pipeline" button, no contacts/deal/orders sections.
9. Click "reset demo data" (bottom-left) — expect everything above to revert (Sculpted MD back to `in_pipeline`/Introduction, the added contact gone).

- [ ] **Step 3: Manual verification against the real Supabase backend**

If a local `.env` with `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` is available, repeat step 2's flow signed in with a real magic-link session instead of the mock "pick a rep" login, to confirm the RPCs (`advance_deal_stage`, `close_deal`, `upsert_contact`, the rewritten `log_activity`/`promote_lead`) behave identically to the mock store. If no local `.env` exists, verify directly against the deployed Vercel URL instead.

- [ ] **Step 4: Update `CRM_SPEC.md`**

Add, after the existing section 13:

```markdown
## 14. Superseded by DEALS_SPEC.md

Sections 3 (the Pipeline tab) and 7 (activity logging's clinic-stage
bump) describe the pre-2026-09-11 shape. As of `DEALS_SPEC.md`: the
flat Pipeline tab is now the 5-stage Deal Pipeline; `clinics.stage` is
`in_pipeline`/`active`/`lost` (was `identify`/`drop_in`/`discovery`/
`solution`/`onboard`/`reorder`); the sale's own progress lives on a
`deals` row, not `clinics.stage`; `clinics.phone`/`email`/`next_step`
are gone, replaced by `contacts` and `deals.next_step`. Read
`DEALS_SPEC.md` for the current shape of all of this — this section is
a pointer, not a duplicate.
```

- [ ] **Step 5: Update `CRM_USER_GUIDE.md`**

Find the "Pipeline: what you're actively working" section and replace its content with:

```markdown
## Deal Pipeline: where every sale actually stands

Five tabs — **Introduction, Meeting set, Follow-up meeting, Close sale,
Close lost** — each showing the deals currently at that stage. Click any
card to open that clinic's **company page**: its current deal (with
buttons to move it between the three open stages, or close it won or
lost), its contacts, its order history, and its full activity log, all
in one place.

**Adding a contact**: on a company page, click **Add contact** — name,
role, phone, email, and whether they're the decision maker. Once
they're added, **Log activity** next to their name pre-fills who you
talked to, so the history says "Visit · you · with Dr. Smith," not just
"Visit · you."

**Closing a deal**: **Close — Won** moves the clinic to Active account
(what used to be called "reorder"). **Close — Lost** asks for a reason
(lost to competitor, budget, no response, not a fit, other) — that's
what makes lost-deal data useful to look back on later instead of just
disappearing.

If you try to act on a deal or log an activity against something
someone else already owns, you'll be told who and since when — that's
not a bug, that's the point. Ask an admin if you think it's wrong.
```

- [ ] **Step 6: Final commit**

```bash
git add CRM_SPEC.md CRM_USER_GUIDE.md
git commit -m "Point CRM_SPEC.md/CRM_USER_GUIDE.md at the Deal Pipeline shape, verify end-to-end"
git push
```

---

## Self-Review Notes

- **Spec coverage**: §2 (data model) → Tasks 1-2. §3 (company page) → Tasks 9-12. §4 (Deal Pipeline) → Task 13. §5 (downstream updates) → Tasks 14-17. §6 (explicit non-goals: no multi-deal history, no dollar value, no stage-change audit log, no auto contact sync) → none of Tasks 1-18 build any of these; confirmed absent by design, not by omission. §7 (build order) → matches this plan's task order exactly.
- **Type consistency checked**: `Deal`/`Contact` (Task 2) → `seedDeals`/`seedContacts` (Task 3) → `mockStore`/`supabaseStore` signatures (Tasks 4-5) → `store.ts` re-exports (Task 6) → every UI consumer (Tasks 7-17) uses the same field names (`clinic_id`, `is_decision_maker`, `next_step`, etc.) and the same function signatures (`listDeals(clinicId?: string)`, `advanceDealStage(dealId, stage, repId)`, `closeDeal(dealId, outcome, lostReason, repId)`) throughout — no renamed function caught a second name downstream.
- **Placeholder scan**: no task ends in prose-only "add error handling" — every step shows the actual code. `DealSection`/`ContactsSection`/`CompanyPage`/`LeadDetail`/`DealPipeline` are complete, runnable components, not sketches.
