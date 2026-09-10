-- Sales-analytics assistant access — deliberately independent of `role`.
-- `role = 'admin'` gates Manage Products (a PIC/pharmacy-compliance
-- function specific to Cindy); Ron and Melissa (Integrative Concepts
-- ownership) and Anthony need leadership access without picking up
-- product-editing rights they were never asked to have.
alter table reps add column is_leadership boolean not null default false;

update reps set is_leadership = true where id in ('r4', 'r5');

-- Corrects Cindy's email — seeded as a placeholder (cindy@ageritepharmacy.com)
-- before her real one was known.
update reps set email = 'ageritepharmacy@gmail.com' where id = 'r4';

insert into reps (id, name, email, territory, hire_date, cert_status, role, is_leadership) values
  ('r6', 'Melissa Carroll', 'sales@ageritepharmacy.com', 'Integrative Concepts', current_date, 'certified', 'rep', true),
  ('r7', 'Ron Carroll', 'lsb@ageritepharmacy.com', 'Integrative Concepts', current_date, 'certified', 'rep', true);
