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
-- Constraint drops BEFORE the update: the old constraint only allows the
-- 6 old values, so writing 'in_pipeline'/'active' while it's still active
-- fails (SQLSTATE 23514) — drop it first, write the new values, then add
-- the new constraint back to validate them.
alter table clinics drop constraint clinics_stage_check;

update clinics set stage = case
  when stage in ('identify', 'drop_in', 'discovery', 'solution') then 'in_pipeline'
  when stage in ('onboard', 'reorder') then 'active'
  else 'in_pipeline'
end;

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
