insert into reps (id, name, email, territory, hire_date, cert_status) values
  ('r1', 'Marcus Reyes', 'marcus@integrativeconcepts.com', 'Rockwall–Fate', '2025-02-10', 'certified'),
  ('r2', 'Dana Okafor', 'dana@integrativeconcepts.com', 'North Houston', '2025-11-01', 'not_started'),
  ('r3', 'Priya Chandra', 'priya@integrativeconcepts.com', 'Cypress', '2026-04-15', 'in_progress');

insert into products (id, name, category, concentration, price_5ml, price_10ml, protocol_duration, rep_note, status, version, reviewed_by, reviewed_at) values
  ('p1', 'BPC-157', 'peptide', '5 mg/mL', 125, 225, '4–8 weeks', 'Most-requested recovery peptide. Confirm current concentration before quoting.', 'current', 3, 'Cindy R., PIC', '2026-08-12'),
  ('p2', 'TB-500', 'peptide', '5 mg/mL', 125, 135, '4–8 weeks', 'PIC is re-checking concentration vs. order form before this is confirmed. Do not quote pricing.', 'pending_review', 4, null, null),
  ('p3', 'CJC-1295', 'peptide', '2 mg/mL', 150, 260, '8–12 weeks', 'Often paired with Ipamorelin.', 'current', 2, 'Cindy R., PIC', '2026-07-01'),
  ('p4', 'Ipamorelin', 'peptide', '2 mg/mL', 140, 250, '8–12 weeks', null, 'current', 1, 'Cindy R., PIC', '2026-06-15'),
  ('p5', 'Tesamorelin', 'peptide', '3 mg/mL', 175, null, '12 weeks', 'August pricing is current. Do not use any June sheet.', 'current', 2, 'Cindy R., PIC', '2026-08-01'),
  ('p6', 'Semaglutide', 'weight-loss', '2.5 mg/mL', null, 399, '12–24 weeks', 'Do not lead with shortage/mail-order language.', 'current', 2, 'Cindy R., PIC', '2026-08-20'),
  ('p7', 'BLT Numbing Cream', 'topical', 'Benzocaine/Lidocaine/Tetracaine', null, 45, 'As needed', null, 'current', 1, 'Cindy R., PIC', '2026-05-10');

insert into product_change_log (id, product_id, field_changed, old_value, new_value, changed_by, changed_at) values
  ('c1', 'p2', 'concentration', '2.5 mg/mL', '5 mg/mL', 'Cindy R., PIC', '2026-09-05'),
  ('c2', 'p5', 'concentration', '1 mg/mL', '3 mg/mL', 'Cindy R., PIC', '2026-08-01'),
  ('c3', 'p1', 'price_10ml', '$210', '$225', 'Cindy R., PIC', '2026-08-12');

insert into clinics (id, name, city, segment, tier, cluster, website, owner_rep_id, stage, last_touch_at, next_step) values
  ('cl1', 'Vixen Wellness', 'Rockwall', 'med spa', 'T1', 'Rockwall–Fate', 'vixenwellness.com', 'r1', 'onboard', '2026-08-28', 'Confirm first order'),
  ('cl2', 'Sculpted MD', 'Fate', 'med spa', 'T1', 'Rockwall–Fate', 'sculptedmd.com', null, 'identify', null, 'Initial drop-in'),
  ('cl3', 'Game Day Men''s Health', 'Houston', 'TRT', 'T1', 'North Houston', 'gamedaymenshealth.com', 'r2', 'reorder', '2026-09-01', '4-week reorder check-in'),
  ('cl4', 'Cypress Renewal Clinic', 'Cypress', 'wellness', 'T2', 'Cypress', 'cypressrenewal.com', 'r3', 'discovery', '2026-09-02', 'Send provider packet'),
  ('cl5', 'Heights Aesthetic Bar', 'Houston', 'med spa', 'T2', 'North Houston', 'heightsaestheticbar.com', null, 'identify', null, 'Initial drop-in');

insert into patients_refills (id, patient_ref, clinic_id, product_id, started_at, protocol_weeks) values
  ('pr1', 'P-0417', 'cl1', 'p1', '2026-08-01', 6),
  ('pr2', 'P-0418', 'cl1', 'p3', '2026-06-20', 10),
  ('pr3', 'P-0512', 'cl3', 'p6', '2026-06-01', 12),
  ('pr4', 'P-0533', 'cl4', 'p4', '2026-08-20', 10);

insert into licensed_states (id, state_name, status, target_quarter) values
  ('s1', 'Texas', 'confirmed', null),
  ('s2', 'New York', 'confirmed', null),
  ('s3', 'Colorado', 'confirmed', null),
  ('s4', 'Wisconsin', 'confirmed', null),
  ('s5', 'Missouri', 'confirmed', null),
  ('s6', 'New Jersey', 'confirmed', null),
  ('s7', 'Idaho', 'confirmed', null),
  ('s8', 'Florida', 'roadmap', 'Q4 2026'),
  ('s9', 'Arizona', 'roadmap', 'Q1 2027');

insert into certification_modules (id, title, "order", questions) values
  ('m1', 'Peptide Handling & Compliance Basics', 1, '[
    {"prompt": "A brochure and an order form disagree on concentration. What do you do?", "options": ["Use whichever number is higher, to be safe", "Quote nothing until the source of truth confirms it", "Ask the clinic which one they prefer"], "correct_index": 1},
    {"prompt": "A product shows \"pending review\" in the knowledge base. Can you quote its price to a clinic?", "options": ["Yes, the old price still applies", "No — do not quote until it clears review", "Only if the clinic asks twice"], "correct_index": 1},
    {"prompt": "You want to work a clinic that shows another rep as owner. What do you do?", "options": ["Log a contact anyway, first to touch wins twice", "Leave it — ownership is locked to the first rep unless admin reassigns", "Ask the clinic to switch reps"], "correct_index": 1}
  ]'::jsonb);
