-- Phone/email: nothing needed these until the prospect-finder's AI-research
-- import (CRM_SPEC.md addendum). Nullable — the original 24 seeded leads
-- and all five existing clinics don't have them either.
alter table leads add column phone text;
alter table leads add column email text;
alter table clinics add column phone text;
alter table clinics add column email text;

-- Reps can add new leads directly now (the prospect-finder's batch import
-- after a rep pastes their own AI's research back in) — no identity to
-- derive server-side for this one, unlike every mutation since phase1_8,
-- because a freshly-discovered lead has no owner concept until promoted.
-- A plain insert grant is the right tool here, not a wrapping RPC.
create policy "authenticated insert leads" on leads for insert to authenticated with check (true);
grant insert on leads to authenticated;

-- promote_lead carries phone/email forward so a promoted lead's research
-- isn't silently dropped the moment it becomes a clinic.
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

  insert into clinics (id, name, city, segment, tier, cluster, website, phone, email, owner_rep_id, stage, last_touch_at, next_step)
  values (v_candidate, v_lead.name, v_lead.city, v_lead.segment, v_lead.tier, v_lead.cluster, v_lead.website, v_lead.phone, v_lead.email, v_rep_id, 'drop_in', current_date, p_next_step)
  returning * into v_result;

  update leads set status = 'promoted', promoted_clinic_id = v_candidate where id = p_lead_id;

  return v_result;
end;
$$;
