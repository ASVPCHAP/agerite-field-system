-- AGErite Field System — Phase 1 schema, mirrors src/data/schema.ts exactly.
-- No column anywhere holds a patient name or date of birth: patients_refills
-- carries a reference code only.

create table reps (
  id text primary key,
  name text not null,
  email text not null unique,
  territory text not null,
  hire_date date not null,
  cert_status text not null default 'not_started'
    check (cert_status in ('not_started','in_progress','certified'))
);

create table products (
  id text primary key,
  name text not null,
  category text not null
    check (category in ('peptide','weight-loss','hormone','topical','troche')),
  concentration text not null,
  price_5ml numeric,
  price_10ml numeric,
  protocol_duration text not null,
  rep_note text,
  status text not null default 'current'
    check (status in ('current','pending_review','archived')),
  version int not null default 1,
  reviewed_by text,
  reviewed_at date
);

create table product_change_log (
  id text primary key,
  product_id text not null references products(id),
  field_changed text not null,
  old_value text not null,
  new_value text not null,
  changed_by text not null,
  changed_at date not null
);

create table clinics (
  id text primary key,
  name text not null,
  city text not null,
  segment text not null,
  tier text not null check (tier in ('T1','T2','T3')),
  cluster text not null,
  website text,
  owner_rep_id text references reps(id),
  stage text not null default 'identify'
    check (stage in ('identify','drop_in','discovery','solution','onboard','reorder')),
  last_touch_at date,
  next_step text
);

create table patients_refills (
  id text primary key,
  patient_ref text not null,
  clinic_id text not null references clinics(id),
  product_id text not null references products(id),
  started_at date not null,
  protocol_weeks int not null
);

create table licensed_states (
  id text primary key,
  state_name text not null,
  status text not null check (status in ('confirmed','roadmap')),
  target_quarter text
);

create table certification_modules (
  id text primary key,
  title text not null,
  "order" int not null,
  questions jsonb not null
);

create table certification_attempts (
  id text primary key,
  rep_id text not null references reps(id),
  module_id text not null references certification_modules(id),
  score int not null,
  passed boolean not null,
  completed_at date not null default current_date
);

-- Approval gate (spec 4.1): masked view for the public surface. Never
-- exposes rep_note, and never returns real concentration/pricing for a
-- pending_review row — the row still appears, flagged, rather than being
-- silently dropped.
create view public_products as
select
  id, name, category,
  case when status = 'pending_review' then 'Under review' else concentration end as concentration,
  case when status = 'pending_review' then null else price_5ml end as price_5ml,
  case when status = 'pending_review' then null else price_10ml end as price_10ml,
  protocol_duration, status, version, reviewed_by, reviewed_at,
  (status = 'pending_review') as under_review
from products
where status <> 'archived';

-- Refill status (spec 4.3): computed in the view, never stored stale.
create view refills_with_status as
select
  pr.*,
  (pr.started_at + (pr.protocol_weeks * 7) * interval '1 day')::date as runs_out_at,
  case
    when (pr.started_at + (pr.protocol_weeks * 7) * interval '1 day')::date < current_date then 'lapsed'
    when (pr.started_at + (pr.protocol_weeks * 7) * interval '1 day')::date <= current_date + 7 then 'due'
    when (pr.started_at + (pr.protocol_weeks * 7) * interval '1 day')::date <= current_date + 14 then 'due_soon'
    else 'on_protocol'
  end as status
from patients_refills pr;

-- Clinic ownership locking (spec 4.2), as an atomic function rather than a
-- client-side check-then-update — closes the race condition two reps
-- tapping "log contact" at the same instant would otherwise hit.
create or replace function log_clinic_contact(p_clinic_id text, p_rep_id text, p_today date default current_date)
returns table(ok boolean, owner_rep_id text, owner_name text, since date, stage text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner text;
begin
  select c.owner_rep_id into v_owner from clinics c where c.id = p_clinic_id for update;

  if v_owner is not null and v_owner <> p_rep_id then
    return query
      select false, v_owner, r.name, c.last_touch_at, c.stage
      from clinics c join reps r on r.id = v_owner
      where c.id = p_clinic_id;
    return;
  end if;

  update clinics
  set owner_rep_id = coalesce(owner_rep_id, p_rep_id),
      stage = case when stage = 'identify' then 'drop_in' else stage end,
      last_touch_at = p_today
  where id = p_clinic_id;

  return query
    select true, c.owner_rep_id, r.name, c.last_touch_at, c.stage
    from clinics c join reps r on r.id = c.owner_rep_id
    where c.id = p_clinic_id;
end;
$$;

-- Certification grading, atomic + server-side so answers/correct_index
-- never round-trip to a client that could just read them off.
create or replace function submit_certification_attempt(p_rep_id text, p_module_id text, p_answers int[])
returns table(score int, total int, passed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_questions jsonb;
  v_total int;
  v_score int := 0;
  i int;
begin
  select questions into v_questions from certification_modules where id = p_module_id;
  v_total := jsonb_array_length(v_questions);

  for i in 0..v_total-1 loop
    if coalesce(p_answers[i+1], -1) = (v_questions->i->>'correct_index')::int then
      v_score := v_score + 1;
    end if;
  end loop;

  insert into certification_attempts (id, rep_id, module_id, score, passed, completed_at)
  values (
    'att-' || extract(epoch from clock_timestamp())::bigint || '-' || floor(random() * 1000)::text,
    p_rep_id, p_module_id, v_score, v_score = v_total, current_date
  );

  update reps set cert_status = case when v_score = v_total then 'certified' else 'in_progress' end
  where id = p_rep_id;

  return query select v_score, v_total, (v_score = v_total);
end;
$$;

-- RLS. No real per-rep Supabase Auth session exists yet (see README) — both
-- the public site and the portal call this project with the same anon key,
-- so this is read access for an internal prototype, not a hardened
-- public/rep boundary. Mutations are locked to the two functions above
-- (SECURITY DEFINER, so they bypass RLS for their own controlled writes);
-- anon has no direct INSERT/UPDATE/DELETE grant on any table.
alter table reps enable row level security;
alter table products enable row level security;
alter table product_change_log enable row level security;
alter table clinics enable row level security;
alter table patients_refills enable row level security;
alter table licensed_states enable row level security;
alter table certification_modules enable row level security;
alter table certification_attempts enable row level security;

create policy "anon read reps" on reps for select to anon using (true);
create policy "anon read products" on products for select to anon using (true);
create policy "anon read product_change_log" on product_change_log for select to anon using (true);
create policy "anon read clinics" on clinics for select to anon using (true);
create policy "anon read patients_refills" on patients_refills for select to anon using (true);
create policy "anon read licensed_states" on licensed_states for select to anon using (true);
create policy "anon read certification_modules" on certification_modules for select to anon using (true);
create policy "anon read certification_attempts" on certification_attempts for select to anon using (true);

grant select on reps, products, product_change_log, clinics, patients_refills,
  licensed_states, certification_modules, certification_attempts to anon;
grant select on public_products, refills_with_status to anon;
grant execute on function log_clinic_contact(text, text, date) to anon;
grant execute on function submit_certification_attempt(text, text, int[]) to anon;
