-- Adds a reviewer-testable rep row for Anthony (Rockwall Partners) — the
-- four seeded reps (Marcus/Dana/Priya/Cindy) are AgeRight's real team;
-- neither Anthony nor Claude has inbox access to any of them, so there was
-- no way to verify the actual "rep signs in, reaches the dashboard" happy
-- path end to end. Matches PHASE1_SPEC.md section 9's own definition of
-- done, which names Anthony as the reviewer.
insert into reps (id, name, email, territory, hire_date, cert_status, role) values
  ('r5', 'Anthony Chapman', 'anthony@rockwallpartners.com', 'Rockwall Partners', '2026-09-09', 'not_started', 'rep');
