-- Advisor flagged slugify() with a mutable search_path — pin it like every
-- other function here.
create or replace function slugify(input text)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(both '-' from regexp_replace(lower(trim(input)), '[^a-z0-9]+', '-', 'g'));
$$;
