-- reset_demo_data() predates leads and knew nothing about promote_lead —
-- without this, promoting a lead during a demo would survive a reset,
-- leaving a stray clinic behind and a lead stuck at status='promoted'.
create or replace function reset_demo_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from certification_attempts where true;

  -- Remove any clinic created by promote_lead since seed (ids outside the
  -- original cl1-cl5 set) before resetting the reps/clinics below, so a
  -- promoted lead's clinic doesn't linger as an orphan.
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
