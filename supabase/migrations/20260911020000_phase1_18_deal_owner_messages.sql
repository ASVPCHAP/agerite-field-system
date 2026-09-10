-- Task 1 review fix: advance_deal_stage/close_deal's ownership-conflict
-- exception didn't name who owns the deal or since when, unlike
-- log_activity's equivalent clinic-path lock. DEALS_SPEC.md section 2
-- says deals should mirror that pattern exactly. Same returns
-- deals/throw-on-conflict shape as before — just a better message.
create or replace function advance_deal_stage(p_deal_id text, p_stage text)
returns deals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rep_id text;
  v_deal deals%rowtype;
  v_clinic clinics%rowtype;
  v_owner_name text;
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
    select r.name into v_owner_name from reps r where r.id = v_clinic.owner_rep_id;
    raise exception 'Owned by % since %', v_owner_name, v_clinic.last_touch_at;
  end if;

  update deals set stage = p_stage where id = p_deal_id returning * into v_deal;
  update clinics set owner_rep_id = coalesce(owner_rep_id, v_rep_id) where id = v_deal.clinic_id;

  return v_deal;
end;
$$;

create or replace function close_deal(p_deal_id text, p_outcome text, p_lost_reason text default null)
returns deals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rep_id text;
  v_deal deals%rowtype;
  v_clinic clinics%rowtype;
  v_owner_name text;
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
    select r.name into v_owner_name from reps r where r.id = v_clinic.owner_rep_id;
    raise exception 'Owned by % since %', v_owner_name, v_clinic.last_touch_at;
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
