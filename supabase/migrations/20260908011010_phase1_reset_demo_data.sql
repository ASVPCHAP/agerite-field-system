create or replace function reset_demo_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from certification_attempts;

  update reps set cert_status = 'certified' where id = 'r1';
  update reps set cert_status = 'not_started' where id = 'r2';
  update reps set cert_status = 'in_progress' where id = 'r3';

  update clinics set owner_rep_id = 'r1', stage = 'onboard', last_touch_at = '2026-08-28', next_step = 'Confirm first order' where id = 'cl1';
  update clinics set owner_rep_id = null, stage = 'identify', last_touch_at = null, next_step = 'Initial drop-in' where id = 'cl2';
  update clinics set owner_rep_id = 'r2', stage = 'reorder', last_touch_at = '2026-09-01', next_step = '4-week reorder check-in' where id = 'cl3';
  update clinics set owner_rep_id = 'r3', stage = 'discovery', last_touch_at = '2026-09-02', next_step = 'Send provider packet' where id = 'cl4';
  update clinics set owner_rep_id = null, stage = 'identify', last_touch_at = null, next_step = 'Initial drop-in' where id = 'cl5';
end;
$$;

revoke execute on function reset_demo_data() from public;
grant execute on function reset_demo_data() to anon;
