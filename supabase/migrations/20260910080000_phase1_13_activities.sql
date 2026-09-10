-- Real interaction history, replacing the old single-value
-- next_step/last_touch_at-only pattern. Attaches to exactly one of
-- lead_id/clinic_id — the check constraint below is the actual polymorphic
-- reference, not just documentation of intent. See CRM_SPEC.md.
create table activities (
  id text primary key,
  lead_id text references leads(id),
  clinic_id text references clinics(id),
  rep_id text not null references reps(id),
  type text not null check (type in ('call', 'text', 'visit', 'email', 'note')),
  notes text,
  occurred_at date not null default current_date,
  created_at timestamptz not null default now(),
  check ((lead_id is not null and clinic_id is null) or (lead_id is null and clinic_id is not null))
);

alter table activities enable row level security;
create policy "authenticated read activities" on activities for select to authenticated using (true);
grant select on activities to authenticated;
-- No insert/update/delete grant — every write goes through log_activity()
-- below, since it has to derive the rep server-side and, for clinics,
-- enforce the same ownership lock as everything else in this app.

-- log_activity replaces log_clinic_contact. Same ownership-lock semantics
-- on a clinic (first touch claims it, blocked-with-owner-name for anyone
-- else); on a lead, logging a 'visit' IS the promotion (same effect as
-- promote_lead, which stays as-is for the standalone "Promote to
-- pipeline" button — this is a second path to the same outcome, not a
-- replacement for it), any other type just bumps status new -> contacted.
create function log_activity(
  p_lead_id text default null,
  p_clinic_id text default null,
  p_type text default null,
  p_notes text default null,
  p_occurred_at date default current_date
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
begin
  if (p_lead_id is null) = (p_clinic_id is null) then
    raise exception 'Exactly one of lead id or clinic id is required';
  end if;
  if p_type not in ('call', 'text', 'visit', 'email', 'note') then
    raise exception 'Invalid activity type: %', p_type;
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

    insert into activities (id, clinic_id, rep_id, type, notes, occurred_at)
    values (v_activity_id, p_clinic_id, v_rep_id, p_type, p_notes, p_occurred_at);

    update clinics set
      owner_rep_id = coalesce(clinics.owner_rep_id, v_rep_id),
      stage = case when clinics.stage = 'identify' then 'drop_in' else clinics.stage end,
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

    insert into clinics (id, name, city, segment, tier, cluster, website, phone, email, owner_rep_id, stage, last_touch_at, next_step)
    values (v_candidate, v_lead.name, v_lead.city, v_lead.segment, v_lead.tier, v_lead.cluster, v_lead.website, v_lead.phone, v_lead.email, v_rep_id, 'drop_in', p_occurred_at, 'Follow up after visit');

    update leads set status = 'promoted', promoted_clinic_id = v_candidate where id = p_lead_id;
    v_new_clinic_id := v_candidate;
  elsif v_lead.status = 'new' then
    update leads set status = 'contacted' where id = p_lead_id;
  end if;

  return query select true, null::text, null::text, null::date, v_activity_id, v_new_clinic_id;
end;
$$;

grant execute on function log_activity(text, text, text, text, date) to authenticated;

-- log_clinic_contact is fully replaced — Pipeline's "log contact" now
-- calls log_activity directly.
drop function if exists log_clinic_contact(text, date);

-- reset_demo_data needs to know about activities too, or testing a log
-- would survive a reset.
create or replace function reset_demo_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from certification_attempts where true;
  delete from activities where true;

  delete from clinics where id not in ('cl1', 'cl2', 'cl3', 'cl4', 'cl5');

  update reps set cert_status = 'certified' where id = 'r1';
  update reps set cert_status = 'not_started' where id = 'r2';
  update reps set cert_status = 'in_progress' where id = 'r3';

  update clinics set owner_rep_id = 'r1', stage = 'onboard', last_touch_at = '2026-08-28', next_step = 'Confirm first order' where id = 'cl1';
  update clinics set owner_rep_id = null, stage = 'identify', last_touch_at = null, next_step = 'Initial drop-in' where id = 'cl2';
  update clinics set owner_rep_id = 'r2', stage = 'reorder', last_touch_at = '2026-09-01', next_step = '4-week reorder check-in' where id = 'cl3';
  update clinics set owner_rep_id = 'r3', stage = 'discovery', last_touch_at = '2026-09-02', next_step = 'Send provider packet' where id = 'cl4';
  update clinics set owner_rep_id = null, stage = 'identify', last_touch_at = null, next_step = 'Initial drop-in' where id = 'cl5';

  update leads set status = 'new', promoted_clinic_id = null where id not in ('ld2', 'ld9', 'ld16');
  update leads set status = 'contacted', promoted_clinic_id = null where id in ('ld2', 'ld9', 'ld16');
end;
$$;
