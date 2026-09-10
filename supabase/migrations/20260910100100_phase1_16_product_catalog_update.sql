-- Real catalog and pricing from AGErite's own Compounded Peptide
-- Prescribing & Price Guide, Hormones price sheet, GLP Vials & Prefilled
-- Syringes sheet, and internal Peptides/Topicals/Troches/Injections price
-- sheet (all 2026-09-10). Replaces placeholder demo pricing. Mirrors
-- src/data/seed.ts exactly — see CRM_SPEC.md section 12.

-- Corrections to existing products -----------------------------------
update products set concentration = '2 mg/mL', price_5ml = 125, price_5ml_label = '5 mL', price_10ml = 175, price_10ml_label = '10 mL', protocol_duration = '4–12 weeks; extend based on clinical response', rep_note = 'Most-requested recovery peptide.', version = 4, reviewed_by = 'Cindy R., PIC', reviewed_at = '2026-09-10' where id = 'p1';

update products set concentration = '2.5 mg/mL', price_5ml = 125, price_5ml_label = '5 mL', price_10ml = 135, price_10ml_label = '10 mL', protocol_duration = 'Loading 2–2.5 mg 2×/wk × 4–6 wks, then 2 mg weekly/biweekly maintenance', rep_note = 'Concentration confirmed against AGErite''s official prescribing guide.', status = 'current', version = 5, reviewed_by = 'Cindy R., PIC', reviewed_at = '2026-09-10' where id = 'p2';

update products set name = 'CJC-1295 + Ipamorelin', concentration = 'CJC-1295 1 mg/mL + Ipamorelin 2 mg/mL', price_5ml = 150, price_5ml_label = '5 mL', price_10ml = 200, price_10ml_label = '10 mL', protocol_duration = '12–16 weeks on; 2–4 week break', rep_note = 'Nightly, fasted, 30–60 min pre-bed. AGErite sells this as a combo, not CJC-1295 alone.', version = 3, reviewed_by = 'Cindy R., PIC', reviewed_at = '2026-09-10' where id = 'p3';

update products set concentration = '1 mg/mL (1,000 mcg/mL)', price_5ml = null, price_5ml_label = null, price_10ml = 150, price_10ml_label = '10 mL', protocol_duration = '12–16 weeks; combine with CJC-1295 for synergy', rep_note = 'Solo Ipamorelin — 10 mL only, not sold in 5 mL.', version = 2, reviewed_by = 'Cindy R., PIC', reviewed_at = '2026-09-10' where id = 'p4';

update products set price_5ml = 130, price_5ml_label = '5 mL', price_10ml = 250, price_10ml_label = '10 mL', protocol_duration = '26-week cycles; reassess', rep_note = 'Most potent GHRH analog. Caution with glucose intolerance.', version = 3, reviewed_by = 'Cindy R., PIC', reviewed_at = '2026-09-10' where id = 'p5';

update products set name = 'Semaglutide + B12 Vial', concentration = '1,000 mcg/mL + B12 (2.5–5 mg/mL dose-dependent)', price_5ml = null, price_5ml_label = null, price_10ml = 195, price_10ml_label = '5 mg · 5 mL vial', protocol_duration = '4-week supply per vial; dose per titration', rep_note = 'Do not lead with shortage/mail-order language. Full 1–5 mL matrix: see Weight Loss Order Form.', version = 3, reviewed_by = 'Cindy R., PIC', reviewed_at = '2026-09-10' where id = 'p6';

update products set concentration = 'Benzocaine 20% / Lidocaine 6% / Tetracaine 6%', price_5ml = 125, price_5ml_label = '60 g', price_10ml = 240, price_10ml_label = '120 g', protocol_duration = 'Ongoing per provider protocol', version = 2, reviewed_by = 'Cindy R., PIC', reviewed_at = '2026-09-10' where id = 'p7';

-- New products ----------------------------------------------------------
insert into products (id, name, category, concentration, price_5ml, price_5ml_label, price_10ml, price_10ml_label, protocol_duration, rep_note, status, version, reviewed_by, reviewed_at) values
  ('p8', 'GHK-Cu (Injectable)', 'peptide', '6 mg/mL', 110, '5 mL', 160, '10 mL', '4–12 weeks; reassess at 4 weeks', 'Systemic skin rejuvenation; rotate abdomen/thigh sites.', 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p9', 'Wolverine Mix (BPC-157 + TB-500)', 'peptide', 'BPC-157 2 mg/mL · TB-500 2.5 mg/mL', 135, '5 mL', 185, '10 mL', '4–8 weeks; reassess and extend if warranted', 'Combines localized (BPC-157) and systemic (TB-500) repair — musculoskeletal/post-surgical.', 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p10', 'Glow Peptide Mix (GHK-Cu + BPC-157 + TB-500)', 'peptide', 'GHK-Cu 6 mg/mL · BPC-157 2 mg/mL · TB-500 2.5 mg/mL', 150, '5 mL', 175, '10 mL', '4–8 weeks; reassess as indicated', 'Systemic rejuvenation — collagen/skin quality plus tissue repair.', 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p11', 'Sermorelin', 'peptide', '1,000 mcg/mL', null, null, 200, '10 mL', '3–6 months; may continue at maintenance dose long-term', 'Most physiologic GHRH analog.', 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p12', 'DSIP (Injectable)', 'peptide', '1,000 mcg/mL', null, null, 150, '10 mL', '2–4 weeks continuous; 1–2 week rest', null, 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p13', 'PT-141 (Bremelanotide)', 'peptide', '2 mg/mL', null, null, 150, '10 mL', 'As needed; max 1×/24 hrs; max 8 doses/month', 'Do not exceed 2 mg/dose. AEs: nausea, flushing — avoid in CV disease.', 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p14', 'AOD-9604', 'peptide', '1 mg/mL', 175, '5 mL', 250, '10 mL', '8–12 weeks; 4–6 week rest between cycles', 'Does not suppress endogenous GH, raise IGF-1, or affect fasting glucose.', 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p15', 'NAD+', 'peptide', '100 mg/mL', 90, '10 mL', 500, '60 mL', 'IM loading daily × 4–10 days, then 2–3×/week; or SQ daily', 'Also available in 30/50/90/120 mL — see the Peptide Prescribing & Price Guide.', 'current', 1, 'Cindy R., PIC', '2026-09-10'),

  ('p16', 'Semaglutide + B12 Prefilled Syringe', 'weight-loss', '0.25–2.5 mg per syringe, dose-dependent', 85, '0.25 mg × 4 wk', 150, '2.5 mg × 4 wk', '4-week supply; weekly SQ', '6 dose strengths (0.25–2.5 mg) — full pricing: GLP Vials & Prefilled Syringes in Printable Documents.', 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p17', 'Tirzepatide + B3 Prefilled Syringe', 'weight-loss', '2.5–15 mg per syringe, dose-dependent', 135, '2.5 mg × 4 wk', 350, '15 mg × 4 wk', '4-week supply; weekly SQ', '6 dose strengths (2.5–15 mg) — full pricing: GLP Vials & Prefilled Syringes in Printable Documents.', 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p18', 'Tirzepatide + B3 Vial', 'weight-loss', '25 mg/mL + 2 mg B3/mL (10–25 mg/mL dose-dependent)', 60, '10 mg · 1 mL', 650, '25 mg · 8 mL', '4-week supply per vial; 90-day BUD, multidose', 'Full matrix (1–8 mL, 10/25 mg strengths): see GLP Vials & Prefilled Syringes.', 'current', 1, 'Cindy R., PIC', '2026-09-10'),

  ('p19', 'GHK-Cu Cream', 'topical', '2% (2 mg/mL)', 100, '30 mL', null, null, 'Apply 1–2×/day; ongoing per provider protocol', null, 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p20', 'GHK-Cu + Niacinamide Cream', 'topical', 'GHK-Cu 2% + Niacinamide 2%', 150, '30 mL', null, null, '1–2×/day face/neck; ongoing', 'Ideal post-procedure protocol.', 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p21', 'GHK-Cu + Bimatoprost Foam', 'topical', 'GHK-Cu 0.5% + Bimatoprost 0.03%', 150, '30 mL foam', null, null, 'Nightly to scalp; ongoing', 'Hair restoration — may darken skin with prolonged contact.', 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p22', 'BLT Numbing Ointment', 'topical', 'Benzocaine 20% / Lidocaine 6% / Tetracaine 6%', 80, '60 g', 150, '120 g', 'Ongoing per provider protocol', 'Ointment form, distinct SKU from the cream.', 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p23', 'Lidocaine/Tetracaine/Phenylephrine Ointment', 'topical', 'Lidocaine 23% / Tetracaine 7% / Phenylephrine 2%', 150, '100 g', null, null, 'Ongoing per provider protocol', null, 'current', 1, 'Cindy R., PIC', '2026-09-10'),

  ('p24', 'DSIP + Oxytocin Troches', 'troche', 'DSIP 0.5–2 mg + Oxytocin 100–300 IU, prescriber-directed', 55, '30 troches', null, null, 'Nightly; 2–4 week cycles with reassessment', 'Needle-averse patients; no chewing or swallowing.', 'current', 1, 'Cindy R., PIC', '2026-09-10'),

  ('p25', 'Testosterone Cream', 'hormone', 'Custom strength — per Rx', 70, '60 g', null, null, 'Ongoing per provider protocol', 'Custom formulation and pricing available upon request.', 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p26', 'Progesterone Cream', 'hormone', 'Custom strength — per Rx', 70, '60 g', null, null, 'Ongoing per provider protocol', null, 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p27', 'Bi-Est Cream (Estriol-Estradiol)', 'hormone', 'Custom strength — per Rx', 70, '60 g', null, null, 'Ongoing per provider protocol', null, 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p28', 'Estradiol Cream', 'hormone', 'Custom strength — per Rx', 70, '60 g', null, null, 'Ongoing per provider protocol', null, 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p29', 'Testosterone Troche', 'hormone', 'Custom strength — per Rx', 55, '#30', null, null, 'Ongoing per provider protocol', null, 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p30', 'Progesterone Troche', 'hormone', 'Custom strength — per Rx', 55, '#30', null, null, 'Ongoing per provider protocol', null, 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p31', 'Bi-Est Troche', 'hormone', 'Custom strength — per Rx', 60, '#30', null, null, 'Ongoing per provider protocol', null, 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p32', 'Estradiol Troche', 'hormone', 'Custom strength — per Rx', 55, '#30', null, null, 'Ongoing per provider protocol', null, 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p33', 'Testosterone Capsule', 'hormone', 'Custom strength — per Rx', 60, '#30', null, null, 'Ongoing per provider protocol', null, 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p34', 'Progesterone Capsule', 'hormone', 'Custom strength — per Rx', 60, '#30', null, null, 'Ongoing per provider protocol', null, 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p35', 'Bi-Est Capsule', 'hormone', 'Custom strength — per Rx', 70, '#30', null, null, 'Ongoing per provider protocol', null, 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p36', 'Estradiol Capsule', 'hormone', 'Custom strength — per Rx', 60, '#30', null, null, 'Ongoing per provider protocol', null, 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p37', 'Desiccated Thyroid Capsule', 'hormone', 'Custom strength — per Rx', 60, '#30', null, null, 'Ongoing per provider protocol', null, 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p38', 'Liothyronine/Levothyroxine T3/T4 Capsule', 'hormone', 'Custom strength — per Rx', 55, '#30', null, null, 'Ongoing per provider protocol', null, 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p39', 'Liothyronine T3 Capsule', 'hormone', 'Custom strength — per Rx', 50, '#30', null, null, 'Ongoing per provider protocol', null, 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p40', 'Testosterone Cypionate Injectable', 'hormone', '50–200 mg/mL, dose-dependent', 80, '50 mg/mL · 2 mL', 115, '200 mg/mL · 3 mL', 'Ongoing per provider protocol', 'Other strength/vial combinations available — see Hormones Price Sheet.', 'current', 1, 'Cindy R., PIC', '2026-09-10'),

  ('p41', 'PCDC 5%/2%', 'injection', '5% / 2%', 80, '30 mL', 274, '120 mL', 'Per provider protocol', 'Also available at 60/90 mL — see pricing sheet.', 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p42', 'PCDC 10%/4.2%', 'injection', '10% / 4.2%', 95, '30 mL', 290, '120 mL', 'Per provider protocol', 'Also available at 60/90 mL — see pricing sheet.', 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p43', 'Amino Mix', 'injection', 'Per provider formulation', 80, '30 mL', 300, '120 mL', 'Per provider protocol', 'Also available at 60/90 mL — see pricing sheet.', 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p44', 'Ascorbic Acid', 'injection', '500 mg/mL', 25, '10 mL', 200, '120 mL', 'Per provider protocol', 'Also available at 30/60/90 mL — see pricing sheet.', 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p45', 'B-Complex (B1/B2/B3/B5/B6)', 'injection', 'B1, B2, B3, B5, B6 blend', 30, '10 mL', 390, '120 mL', 'Per provider protocol', 'Also available at 30/50/60/90 mL — see pricing sheet.', 'current', 1, 'Cindy R., PIC', '2026-09-10'),
  ('p46', 'Glutathione', 'injection', '200 mg/mL', 160, '30 mL', 600, '120 mL', 'Per provider protocol', 'Also available at 60/90 mL — see pricing sheet.', 'current', 1, 'Cindy R., PIC', '2026-09-10');

-- Change-log entries documenting today's corrections ---------------------
-- (c1-c3 already exist from the original seed migration; this pass
-- continues the sequence rather than colliding with them.)
insert into product_change_log (id, product_id, field_changed, old_value, new_value, changed_by, changed_at) values
  ('c12', 'p2', 'concentration', '5 mg/mL', '2.5 mg/mL', 'Rockwall Partners (price sheet sync)', '2026-09-10'),
  ('c13', 'p2', 'status', 'pending_review', 'current', 'Rockwall Partners (price sheet sync)', '2026-09-10'),
  ('c14', 'p1', 'price_10ml', '$225', '$175', 'Rockwall Partners (price sheet sync)', '2026-09-10'),
  ('c15', 'p3', 'name', 'CJC-1295', 'CJC-1295 + Ipamorelin', 'Rockwall Partners (price sheet sync)', '2026-09-10'),
  ('c16', 'p3', 'price_10ml', '$260', '$200', 'Rockwall Partners (price sheet sync)', '2026-09-10'),
  ('c17', 'p4', 'concentration', '2 mg/mL', '1 mg/mL (1,000 mcg/mL)', 'Rockwall Partners (price sheet sync)', '2026-09-10'),
  ('c18', 'p4', 'price_5ml', '$140 (5 mL)', 'Not sold in 5 mL — 10 mL only', 'Rockwall Partners (price sheet sync)', '2026-09-10'),
  ('c19', 'p5', 'price_5ml', '$175', '$130', 'Rockwall Partners (price sheet sync)', '2026-09-10'),
  ('c20', 'p6', 'name', 'Semaglutide', 'Semaglutide + B12 Vial', 'Rockwall Partners (price sheet sync)', '2026-09-10'),
  ('c21', 'p6', 'price_10ml', '$399', '$195', 'Rockwall Partners (price sheet sync)', '2026-09-10'),
  ('c22', 'p7', 'price_10ml', '$45 (10 mL)', '$240 (120 g)', 'Rockwall Partners (price sheet sync)', '2026-09-10');

-- Stray manual-testing rows from earlier Manage Products QA, never part
-- of seed data and never cleaned up — remove so they don't show as real
-- products on the Pricing tab or public site.
delete from products where id in ('test-peptide-xyz', 'verify-product-form');
