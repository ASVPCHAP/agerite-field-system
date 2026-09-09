-- Real auth hardening, paired with the frontend's move to Supabase Auth
-- magic-link (see README "Known gap" and PHASE1_SPEC.md section 2). Before
-- this, every table/function here trusted the `anon` role plus whatever
-- rep-id string the client happened to send — a curl with the published
-- anon key could read everything and, for the three RPCs, act as any rep
-- by simply naming them. This migration does two things together:
--   1. Table/view read access moves from `anon` to `authenticated` (public
--      site keeps reading only `public_products`, unchanged).
--   2. The three mutation RPCs stop taking a client-supplied rep identity
--      and instead resolve it from auth.email() — the verified email on
--      the caller's session — so the identity in every write and every
--      change-log/cert/ownership record is now server-verified, not
--      client-asserted. upsert_product additionally requires role='admin'.
--
-- Ship this together with the frontend change, not before it — the
-- currently-deployed frontend has no real session and calls everything as
-- anon, so it would break the moment this lands on its own.

-- ---------------------------------------------------------------------------
-- 1. Read access: anon -> authenticated (public_products stays anon; that
--    view is the one thing genuinely meant for anonymous visitors).
-- ---------------------------------------------------------------------------

drop policy "anon read reps" on reps;
drop policy "anon read products" on products;
drop policy "anon read product_change_log" on product_change_log;
drop policy "anon read clinics" on clinics;
drop policy "anon read patients_refills" on patients_refills;
drop policy "anon read licensed_states" on licensed_states;
drop policy "anon read certification_modules" on certification_modules;
drop policy "anon read certification_attempts" on certification_attempts;

create policy "authenticated read reps" on reps for select to authenticated using (true);
create policy "authenticated read products" on products for select to authenticated using (true);
create policy "authenticated read product_change_log" on product_change_log for select to authenticated using (true);
create policy "authenticated read clinics" on clinics for select to authenticated using (true);
create policy "authenticated read patients_refills" on patients_refills for select to authenticated using (true);
create policy "authenticated read licensed_states" on licensed_states for select to authenticated using (true);
create policy "authenticated read certification_modules" on certification_modules for select to authenticated using (true);
create policy "authenticated read certification_attempts" on certification_attempts for select to authenticated using (true);

revoke select on reps, products, product_change_log, clinics, patients_refills,
  licensed_states, certification_modules, certification_attempts from anon;
grant select on reps, products, product_change_log, clinics, patients_refills,
  licensed_states, certification_modules, certification_attempts to authenticated;

revoke select on refills_with_status from anon;
grant select on refills_with_status to authenticated;
-- public_products intentionally left as-is: anon keeps select.

-- ---------------------------------------------------------------------------
-- 2. log_clinic_contact — drops p_rep_id; resolves the caller from
--    auth.email(). Ownership claims and "owned by" records are now tied to
--    who actually authenticated, not whatever id the client sent.
-- ---------------------------------------------------------------------------

drop function if exists log_clinic_contact(text, text, date);

create function log_clinic_contact(p_clinic_id text, p_today date default current_date)
returns table(ok boolean, owner_rep_id text, owner_name text, since date, stage text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rep_id text;
  v_owner text;
begin
  select id into v_rep_id from reps where email = auth.email();
  if v_rep_id is null then
    raise exception 'No rep record matches the authenticated email (%)', auth.email();
  end if;

  select c.owner_rep_id into v_owner from clinics c where c.id = p_clinic_id for update;

  if v_owner is not null and v_owner <> v_rep_id then
    return query
      select false, v_owner, r.name, c.last_touch_at, c.stage
      from clinics c join reps r on r.id = v_owner
      where c.id = p_clinic_id;
    return;
  end if;

  update clinics
  set owner_rep_id = coalesce(clinics.owner_rep_id, v_rep_id),
      stage = case when clinics.stage = 'identify' then 'drop_in' else clinics.stage end,
      last_touch_at = p_today
  where clinics.id = p_clinic_id;

  return query
    select true, c.owner_rep_id, r.name, c.last_touch_at, c.stage
    from clinics c join reps r on r.id = c.owner_rep_id
    where c.id = p_clinic_id;
end;
$$;

grant execute on function log_clinic_contact(text, date) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. submit_certification_attempt — drops p_rep_id; a rep can now only
--    submit (and update the cert_status of) their own attempt.
-- ---------------------------------------------------------------------------

drop function if exists submit_certification_attempt(text, text, int[]);

create function submit_certification_attempt(p_module_id text, p_answers int[])
returns table(score int, total int, passed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rep_id text;
  v_questions jsonb;
  v_total int;
  v_score int := 0;
  i int;
begin
  select id into v_rep_id from reps where email = auth.email();
  if v_rep_id is null then
    raise exception 'No rep record matches the authenticated email (%)', auth.email();
  end if;

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
    v_rep_id, p_module_id, v_score, v_score = v_total, current_date
  );

  update reps set cert_status = case when v_score = v_total then 'certified' else 'in_progress' end
  where id = v_rep_id;

  return query select v_score, v_total, (v_score = v_total);
end;
$$;

grant execute on function submit_certification_attempt(text, int[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. upsert_product — drops p_changed_by; resolves the caller from
--    auth.email() and requires role = 'admin'. This is the actual fix for
--    "any rep could self-approve a pending_review product" — the frontend
--    route guard (RequireAdmin) added earlier only hid the door; this locks
--    it, since the RPC itself was always reachable directly regardless of
--    what the UI shows.
-- ---------------------------------------------------------------------------

drop function if exists upsert_product(text, text, text, text, numeric, numeric, text, text, text, text);

create function upsert_product(
  p_id text,
  p_name text,
  p_category text,
  p_concentration text,
  p_price_5ml numeric,
  p_price_10ml numeric,
  p_protocol_duration text,
  p_status text,
  p_rep_note text
)
returns products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rep_id text;
  v_rep_name text;
  v_role text;
  v_changed_by text;
  v_existing products%rowtype;
  v_id text;
  v_candidate text;
  v_suffix int := 2;
  v_today date := current_date;
  v_result products%rowtype;
  v_status text := coalesce(nullif(trim(p_status), ''), 'current');
begin
  select id, name, role into v_rep_id, v_rep_name, v_role from reps where email = auth.email();
  if v_rep_id is null then
    raise exception 'No rep record matches the authenticated email (%)', auth.email();
  end if;
  if v_role <> 'admin' then
    raise exception 'Only an admin (PIC) can edit products — % is not an admin', v_rep_name;
  end if;
  v_changed_by := v_rep_name || ' (portal edit)';

  if p_id is not null then
    select * into v_existing from products where id = p_id;
  end if;

  if v_existing.id is null then
    v_id := nullif(slugify(p_name), '');
    if v_id is null then v_id := 'product'; end if;
    v_candidate := v_id;
    while exists (select 1 from products where id = v_candidate) loop
      v_candidate := v_id || '-' || v_suffix;
      v_suffix := v_suffix + 1;
    end loop;

    insert into products (id, name, category, concentration, price_5ml, price_10ml, protocol_duration, rep_note, status, version, reviewed_by, reviewed_at)
    values (v_candidate, p_name, p_category, p_concentration, p_price_5ml, p_price_10ml, p_protocol_duration, p_rep_note, v_status, 1, v_changed_by, v_today)
    returning * into v_result;
    return v_result;
  end if;

  if v_existing.name is distinct from p_name then
    insert into product_change_log (id, product_id, field_changed, old_value, new_value, changed_by, changed_at)
    values ('cl-' || v_existing.id || '-' || extract(epoch from clock_timestamp())::bigint || '-' || floor(random() * 1000)::text,
            v_existing.id, 'name', v_existing.name, p_name, v_changed_by, v_today);
  end if;
  if v_existing.category is distinct from p_category then
    insert into product_change_log (id, product_id, field_changed, old_value, new_value, changed_by, changed_at)
    values ('cl-' || v_existing.id || '-' || extract(epoch from clock_timestamp())::bigint || '-' || floor(random() * 1000)::text,
            v_existing.id, 'category', v_existing.category, p_category, v_changed_by, v_today);
  end if;
  if v_existing.concentration is distinct from p_concentration then
    insert into product_change_log (id, product_id, field_changed, old_value, new_value, changed_by, changed_at)
    values ('cl-' || v_existing.id || '-' || extract(epoch from clock_timestamp())::bigint || '-' || floor(random() * 1000)::text,
            v_existing.id, 'concentration', v_existing.concentration, p_concentration, v_changed_by, v_today);
  end if;
  if v_existing.price_5ml is distinct from p_price_5ml then
    insert into product_change_log (id, product_id, field_changed, old_value, new_value, changed_by, changed_at)
    values ('cl-' || v_existing.id || '-' || extract(epoch from clock_timestamp())::bigint || '-' || floor(random() * 1000)::text,
            v_existing.id, 'price_5ml', coalesce('$' || v_existing.price_5ml::text, ''), coalesce('$' || p_price_5ml::text, ''), v_changed_by, v_today);
  end if;
  if v_existing.price_10ml is distinct from p_price_10ml then
    insert into product_change_log (id, product_id, field_changed, old_value, new_value, changed_by, changed_at)
    values ('cl-' || v_existing.id || '-' || extract(epoch from clock_timestamp())::bigint || '-' || floor(random() * 1000)::text,
            v_existing.id, 'price_10ml', coalesce('$' || v_existing.price_10ml::text, ''), coalesce('$' || p_price_10ml::text, ''), v_changed_by, v_today);
  end if;
  if v_existing.protocol_duration is distinct from p_protocol_duration then
    insert into product_change_log (id, product_id, field_changed, old_value, new_value, changed_by, changed_at)
    values ('cl-' || v_existing.id || '-' || extract(epoch from clock_timestamp())::bigint || '-' || floor(random() * 1000)::text,
            v_existing.id, 'protocol_duration', v_existing.protocol_duration, p_protocol_duration, v_changed_by, v_today);
  end if;
  if v_existing.status is distinct from v_status then
    insert into product_change_log (id, product_id, field_changed, old_value, new_value, changed_by, changed_at)
    values ('cl-' || v_existing.id || '-' || extract(epoch from clock_timestamp())::bigint || '-' || floor(random() * 1000)::text,
            v_existing.id, 'status', v_existing.status, v_status, v_changed_by, v_today);
  end if;
  if v_existing.rep_note is distinct from p_rep_note then
    insert into product_change_log (id, product_id, field_changed, old_value, new_value, changed_by, changed_at)
    values ('cl-' || v_existing.id || '-' || extract(epoch from clock_timestamp())::bigint || '-' || floor(random() * 1000)::text,
            v_existing.id, 'rep_note', coalesce(v_existing.rep_note, ''), coalesce(p_rep_note, ''), v_changed_by, v_today);
  end if;

  update products set
    name = p_name, category = p_category, concentration = p_concentration,
    price_5ml = p_price_5ml, price_10ml = p_price_10ml, protocol_duration = p_protocol_duration,
    rep_note = p_rep_note, status = v_status,
    version = v_existing.version + 1, reviewed_by = v_changed_by, reviewed_at = v_today
  where id = v_existing.id
  returning * into v_result;
  return v_result;
end;
$$;

revoke execute on function upsert_product(text, text, text, text, numeric, numeric, text, text, text) from public;
grant execute on function upsert_product(text, text, text, text, numeric, numeric, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. reset_demo_data — no identity to derive (it's a blanket reset), just
--    requires a real session now instead of being callable anonymously.
-- ---------------------------------------------------------------------------

revoke execute on function reset_demo_data() from anon;
grant execute on function reset_demo_data() to authenticated;
