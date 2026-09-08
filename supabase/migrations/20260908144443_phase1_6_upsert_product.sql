create or replace function slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(trim(input)), '[^a-z0-9]+', '-', 'g'));
$$;

-- Portal "Manage Products" form calls this directly — same diff/change-log
-- behavior as the Sheet sync (sync-products-sheet), so a product edited by
-- hand in the portal and one edited via the Sheet leave an identical trail.
-- Matches by p_id when given (an edit); a null/unknown id creates a new
-- product with a generated slug id, same scheme as the Sheet sync.
create or replace function upsert_product(
  p_id text,
  p_name text,
  p_category text,
  p_concentration text,
  p_price_5ml numeric,
  p_price_10ml numeric,
  p_protocol_duration text,
  p_status text,
  p_rep_note text,
  p_changed_by text
)
returns products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing products%rowtype;
  v_id text;
  v_candidate text;
  v_suffix int := 2;
  v_today date := current_date;
  v_result products%rowtype;
  v_status text := coalesce(nullif(trim(p_status), ''), 'current');
begin
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
    values (v_candidate, p_name, p_category, p_concentration, p_price_5ml, p_price_10ml, p_protocol_duration, p_rep_note, v_status, 1, p_changed_by, v_today)
    returning * into v_result;
    return v_result;
  end if;

  if v_existing.name is distinct from p_name then
    insert into product_change_log (id, product_id, field_changed, old_value, new_value, changed_by, changed_at)
    values ('cl-' || v_existing.id || '-' || extract(epoch from clock_timestamp())::bigint || '-' || floor(random() * 1000)::text,
            v_existing.id, 'name', v_existing.name, p_name, p_changed_by, v_today);
  end if;
  if v_existing.category is distinct from p_category then
    insert into product_change_log (id, product_id, field_changed, old_value, new_value, changed_by, changed_at)
    values ('cl-' || v_existing.id || '-' || extract(epoch from clock_timestamp())::bigint || '-' || floor(random() * 1000)::text,
            v_existing.id, 'category', v_existing.category, p_category, p_changed_by, v_today);
  end if;
  if v_existing.concentration is distinct from p_concentration then
    insert into product_change_log (id, product_id, field_changed, old_value, new_value, changed_by, changed_at)
    values ('cl-' || v_existing.id || '-' || extract(epoch from clock_timestamp())::bigint || '-' || floor(random() * 1000)::text,
            v_existing.id, 'concentration', v_existing.concentration, p_concentration, p_changed_by, v_today);
  end if;
  if v_existing.price_5ml is distinct from p_price_5ml then
    insert into product_change_log (id, product_id, field_changed, old_value, new_value, changed_by, changed_at)
    values ('cl-' || v_existing.id || '-' || extract(epoch from clock_timestamp())::bigint || '-' || floor(random() * 1000)::text,
            v_existing.id, 'price_5ml', coalesce('$' || v_existing.price_5ml::text, ''), coalesce('$' || p_price_5ml::text, ''), p_changed_by, v_today);
  end if;
  if v_existing.price_10ml is distinct from p_price_10ml then
    insert into product_change_log (id, product_id, field_changed, old_value, new_value, changed_by, changed_at)
    values ('cl-' || v_existing.id || '-' || extract(epoch from clock_timestamp())::bigint || '-' || floor(random() * 1000)::text,
            v_existing.id, 'price_10ml', coalesce('$' || v_existing.price_10ml::text, ''), coalesce('$' || p_price_10ml::text, ''), p_changed_by, v_today);
  end if;
  if v_existing.protocol_duration is distinct from p_protocol_duration then
    insert into product_change_log (id, product_id, field_changed, old_value, new_value, changed_by, changed_at)
    values ('cl-' || v_existing.id || '-' || extract(epoch from clock_timestamp())::bigint || '-' || floor(random() * 1000)::text,
            v_existing.id, 'protocol_duration', v_existing.protocol_duration, p_protocol_duration, p_changed_by, v_today);
  end if;
  if v_existing.status is distinct from v_status then
    insert into product_change_log (id, product_id, field_changed, old_value, new_value, changed_by, changed_at)
    values ('cl-' || v_existing.id || '-' || extract(epoch from clock_timestamp())::bigint || '-' || floor(random() * 1000)::text,
            v_existing.id, 'status', v_existing.status, v_status, p_changed_by, v_today);
  end if;
  if v_existing.rep_note is distinct from p_rep_note then
    insert into product_change_log (id, product_id, field_changed, old_value, new_value, changed_by, changed_at)
    values ('cl-' || v_existing.id || '-' || extract(epoch from clock_timestamp())::bigint || '-' || floor(random() * 1000)::text,
            v_existing.id, 'rep_note', coalesce(v_existing.rep_note, ''), coalesce(p_rep_note, ''), p_changed_by, v_today);
  end if;

  update products set
    name = p_name, category = p_category, concentration = p_concentration,
    price_5ml = p_price_5ml, price_10ml = p_price_10ml, protocol_duration = p_protocol_duration,
    rep_note = p_rep_note, status = v_status,
    version = v_existing.version + 1, reviewed_by = p_changed_by, reviewed_at = v_today
  where id = v_existing.id
  returning * into v_result;
  return v_result;
end;
$$;

revoke execute on function upsert_product(text, text, text, text, numeric, numeric, text, text, text, text) from public;
grant execute on function upsert_product(text, text, text, text, numeric, numeric, text, text, text, text) to anon;
