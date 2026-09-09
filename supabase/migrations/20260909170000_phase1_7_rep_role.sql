-- Admin vs rep gating: reps table gains a role. Everything before this
-- migration could self-approve products through Manage Products — this is
-- the missing piece "Cindy, or a designate, is the only publisher"
-- (spec section 5) actually needed.
alter table reps add column role text not null default 'rep' check (role in ('rep', 'admin'));

-- Cindy needs a login-capable row to sit behind the admin gate — the
-- current login model is "pick a rep", and there was no rep-shaped row
-- for her before this. cert_status is irrelevant to an admin but the
-- column is not-null; 'certified' avoids a stray incomplete-cert badge.
insert into reps (id, name, email, territory, hire_date, cert_status, role) values
  ('r4', 'Cindy R.', 'cindy@ageritepharmacy.com', 'PIC', '2025-01-01', 'certified', 'admin');
