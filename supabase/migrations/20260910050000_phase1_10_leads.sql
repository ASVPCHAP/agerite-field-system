-- Leads: the raw, not-yet-engaged prospect list, upstream of clinics. See
-- CRM_SPEC.md. Deliberately has no owner/stage/contact fields — those only
-- make sense once a rep has actually decided to work something, which is
-- exactly what promote_lead() below marks.
create table leads (
  id text primary key,
  name text not null,
  city text not null,
  segment text not null,
  tier text not null check (tier in ('T1', 'T2', 'T3')),
  cluster text not null,
  website text,
  status text not null default 'new' check (status in ('new', 'contacted', 'promoted', 'disqualified')),
  promoted_clinic_id text references clinics(id),
  created_at date not null default current_date
);

alter table leads enable row level security;
create policy "authenticated read leads" on leads for select to authenticated using (true);
grant select on leads to authenticated;

-- Promotes a lead into a real, owned clinics row — "I looked at this and
-- I'm working it now," in one atomic step. Mirrors log_clinic_contact's
-- ownership-claim semantics (ownership + stage bump together) rather than
-- creating an unowned clinic a rep would then have to separately claim.
-- Same auth.email()-derived-identity pattern as every other mutation since
-- phase1_8 — no client-supplied rep id.
create function promote_lead(p_lead_id text, p_next_step text default 'Discovery call')
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

  insert into clinics (id, name, city, segment, tier, cluster, website, owner_rep_id, stage, last_touch_at, next_step)
  values (v_candidate, v_lead.name, v_lead.city, v_lead.segment, v_lead.tier, v_lead.cluster, v_lead.website, v_rep_id, 'drop_in', current_date, p_next_step)
  returning * into v_result;

  update leads set status = 'promoted', promoted_clinic_id = v_candidate where id = p_lead_id;

  return v_result;
end;
$$;

grant execute on function promote_lead(text, text) to authenticated;
