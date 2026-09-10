-- Preview order history for the SiCompounding B2B Order API integration —
-- see CRM_SPEC.md section 9. Shaped to match what that API is expected to
-- return once it's actually wired up, so swapping this table's rows for
-- live API calls later is a data-source change, not a rebuild. Read-only
-- from the client: nothing in the UI creates or edits an order, so there's
-- no write grant/RPC here, unlike activities/clinics.
create table orders (
  id text primary key,
  clinic_id text not null references clinics(id),
  product_id text not null references products(id),
  size text not null check (size in ('5ml', '10ml')),
  quantity int not null check (quantity > 0),
  status text not null check (status in ('submitted', 'processing', 'shipped', 'delivered')),
  ordered_at date not null
);

alter table orders enable row level security;
create policy "authenticated read orders" on orders for select to authenticated using (true);
grant select on orders to authenticated;

insert into orders (id, clinic_id, product_id, size, quantity, status, ordered_at) values
  ('o1', 'cl3', 'p6', '10ml', 3, 'delivered', '2026-06-05'),
  ('o2', 'cl3', 'p6', '10ml', 4, 'delivered', '2026-07-08'),
  ('o3', 'cl3', 'p3', '10ml', 2, 'delivered', '2026-07-22'),
  ('o4', 'cl3', 'p6', '10ml', 5, 'delivered', '2026-08-10'),
  ('o5', 'cl3', 'p4', '10ml', 3, 'shipped', '2026-08-30'),
  ('o6', 'cl3', 'p6', '10ml', 4, 'processing', '2026-09-06');
