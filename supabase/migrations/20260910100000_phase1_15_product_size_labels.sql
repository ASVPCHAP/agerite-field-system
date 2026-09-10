-- AGErite's real catalog doesn't fit two fixed "5mL"/"10mL" columns —
-- hormones price per troche/capsule/60g jar, weight-loss per dose-strength
-- x vial size. Rather than force everything into a mislabeled 5mL/10mL
-- shape, add a label per price slot so each row can say what it actually
-- is. Existing rows get an explicit '5 mL'/'10 mL' backfill so nothing
-- already shown changes meaning; null still falls back to '5 mL'/'10 mL'
-- client-side for anything added later through the normal upsert flow
-- (Manage Products / Sheet sync don't set these yet — see CRM_SPEC.md
-- section 12).
alter table products add column price_5ml_label text;
alter table products add column price_10ml_label text;

update products set price_5ml_label = '5 mL' where price_5ml is not null;
update products set price_10ml_label = '10 mL' where price_10ml is not null;

-- New real product line from AGErite's pricing sheet (PCDC, Amino Mix,
-- Ascorbic Acid, B-Complex, Glutathione) — IV/injectable additives, not
-- peptides.
alter table products drop constraint products_category_check;
alter table products add constraint products_category_check
  check (category in ('peptide','weight-loss','hormone','topical','troche','injection'));

create or replace view public_products as
select
  id, name, category,
  case when status = 'pending_review' then 'Under review' else concentration end as concentration,
  case when status = 'pending_review' then null else price_5ml end as price_5ml,
  case when status = 'pending_review' then null else price_10ml end as price_10ml,
  protocol_duration, status, version, reviewed_by, reviewed_at,
  (status = 'pending_review') as under_review,
  price_5ml_label, price_10ml_label
from products
where status <> 'archived';
