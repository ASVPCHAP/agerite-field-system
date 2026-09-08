-- Views should enforce the querying role's RLS/grants, not the view
-- owner's (the advisor flagged these as security-definer-like otherwise).
alter view public_products set (security_invoker = true);
alter view refills_with_status set (security_invoker = true);

-- Fix: the function's own RETURNS TABLE column "owner_rep_id" shadowed
-- clinics.owner_rep_id as a plpgsql variable inside the function body,
-- making the UPDATE's COALESCE ambiguous. Qualify with the table name.
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
  set owner_rep_id = coalesce(clinics.owner_rep_id, p_rep_id),
      stage = case when clinics.stage = 'identify' then 'drop_in' else clinics.stage end,
      last_touch_at = p_today
  where clinics.id = p_clinic_id;

  return query
    select true, c.owner_rep_id, r.name, c.last_touch_at, c.stage
    from clinics c join reps r on r.id = c.owner_rep_id
    where c.id = p_clinic_id;
end;
$$;

-- Tighten function execute grants to anon only (Postgres grants EXECUTE to
-- PUBLIC by default, which the advisor correctly flagged as also covering
-- authenticated — revoke that, keep anon since there's no real per-rep
-- session yet).
revoke execute on function log_clinic_contact(text, text, date) from public;
revoke execute on function submit_certification_attempt(text, text, int[]) from public;
grant execute on function log_clinic_contact(text, text, date) to anon;
grant execute on function submit_certification_attempt(text, text, int[]) to anon;
