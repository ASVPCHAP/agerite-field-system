-- reset_demo_data() was created before the PUBLIC-execute revoke pattern
-- established for the other two RPCs — bring it in line.
revoke execute on function reset_demo_data() from public;
grant execute on function reset_demo_data() to anon;
