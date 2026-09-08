-- The Sheet sync matches rows by product name (Cindy edits by name, not by
-- our internal id), so name has to be a real upsert key.
alter table products add constraint products_name_key unique (name);
