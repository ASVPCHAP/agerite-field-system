import type {
  CertificationModule,
  Clinic,
  Lead,
  LicensedState,
  Order,
  PatientRefill,
  Product,
  ProductChangeLog,
  Rep,
} from './schema'

// Mirrors the sample data already shown to the client (agerite-prototype.html)
// so continuity holds across the hidden demo and this real build.

export const seedReps: Rep[] = [
  { id: 'r1', name: 'Marcus Reyes', email: 'marcus@integrativeconcepts.com', territory: 'Rockwall–Fate', hire_date: '2025-02-10', cert_status: 'certified', role: 'rep', is_leadership: false },
  { id: 'r2', name: 'Dana Okafor', email: 'dana@integrativeconcepts.com', territory: 'North Houston', hire_date: '2025-11-01', cert_status: 'not_started', role: 'rep', is_leadership: false },
  { id: 'r3', name: 'Priya Chandra', email: 'priya@integrativeconcepts.com', territory: 'Cypress', hire_date: '2026-04-15', cert_status: 'in_progress', role: 'rep', is_leadership: false },
  { id: 'r4', name: 'Cindy R.', email: 'ageritepharmacy@gmail.com', territory: 'PIC', hire_date: '2025-01-01', cert_status: 'certified', role: 'admin', is_leadership: true },
  { id: 'r5', name: 'Anthony Chapman', email: 'anthony@rockwallpartners.com', territory: 'Rockwall Partners', hire_date: '2026-09-09', cert_status: 'not_started', role: 'rep', is_leadership: true },
  { id: 'r6', name: 'Melissa Carroll', email: 'sales@ageritepharmacy.com', territory: 'Integrative Concepts', hire_date: '2026-09-10', cert_status: 'certified', role: 'rep', is_leadership: true },
  { id: 'r7', name: 'Ron Carroll', email: 'lsb@ageritepharmacy.com', territory: 'Integrative Concepts', hire_date: '2026-09-10', cert_status: 'certified', role: 'rep', is_leadership: true },
]

// Real catalog and pricing, straight from AGErite's own Compounded
// Peptide Prescribing & Price Guide, Hormones price sheet, GLP Vials &
// Prefilled Syringes sheet, and internal Peptides/Topicals/Troches/
// Injections price sheet (all 2026-09-10). Replaces the earlier
// placeholder demo pricing entirely. See CRM_SPEC.md section 12 for what
// this doesn't fully capture (GLP-1's full dose matrix, hormones'
// injectable strength/vial combinations) and why — those stay in the
// linked PDFs (Printable Documents) rather than exploding this table into
// 80+ rows. price_5ml/price_10ml are really "price slot A/B" now — the
// *_label fields say what each slot actually is.
export const seedProducts: Product[] = [
  // Peptides — injectable
  { id: 'p1', name: 'BPC-157', category: 'peptide', concentration: '2 mg/mL', price_5ml: 125, price_5ml_label: '5 mL', price_10ml: 175, price_10ml_label: '10 mL', protocol_duration: '4–12 weeks; extend based on clinical response', rep_note: 'Most-requested recovery peptide.', status: 'current', version: 4, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p2', name: 'TB-500', category: 'peptide', concentration: '2.5 mg/mL', price_5ml: 125, price_5ml_label: '5 mL', price_10ml: 135, price_10ml_label: '10 mL', protocol_duration: 'Loading 2–2.5 mg 2×/wk × 4–6 wks, then 2 mg weekly/biweekly maintenance', rep_note: 'Concentration confirmed against AGErite\'s official prescribing guide.', status: 'current', version: 5, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p3', name: 'CJC-1295 + Ipamorelin', category: 'peptide', concentration: 'CJC-1295 1 mg/mL + Ipamorelin 2 mg/mL', price_5ml: 150, price_5ml_label: '5 mL', price_10ml: 200, price_10ml_label: '10 mL', protocol_duration: '12–16 weeks on; 2–4 week break', rep_note: 'Nightly, fasted, 30–60 min pre-bed. AGErite sells this as a combo, not CJC-1295 alone.', status: 'current', version: 3, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p4', name: 'Ipamorelin', category: 'peptide', concentration: '1 mg/mL (1,000 mcg/mL)', price_5ml: null, price_5ml_label: null, price_10ml: 150, price_10ml_label: '10 mL', protocol_duration: '12–16 weeks; combine with CJC-1295 for synergy', rep_note: 'Solo Ipamorelin — 10 mL only, not sold in 5 mL.', status: 'current', version: 2, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p5', name: 'Tesamorelin', category: 'peptide', concentration: '3 mg/mL', price_5ml: 130, price_5ml_label: '5 mL', price_10ml: 250, price_10ml_label: '10 mL', protocol_duration: '26-week cycles; reassess', rep_note: 'Most potent GHRH analog. Caution with glucose intolerance.', status: 'current', version: 3, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p8', name: 'GHK-Cu (Injectable)', category: 'peptide', concentration: '6 mg/mL', price_5ml: 110, price_5ml_label: '5 mL', price_10ml: 160, price_10ml_label: '10 mL', protocol_duration: '4–12 weeks; reassess at 4 weeks', rep_note: 'Systemic skin rejuvenation; rotate abdomen/thigh sites.', status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p9', name: 'Wolverine Mix (BPC-157 + TB-500)', category: 'peptide', concentration: 'BPC-157 2 mg/mL · TB-500 2.5 mg/mL', price_5ml: 135, price_5ml_label: '5 mL', price_10ml: 185, price_10ml_label: '10 mL', protocol_duration: '4–8 weeks; reassess and extend if warranted', rep_note: 'Combines localized (BPC-157) and systemic (TB-500) repair — musculoskeletal/post-surgical.', status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p10', name: 'Glow Peptide Mix (GHK-Cu + BPC-157 + TB-500)', category: 'peptide', concentration: 'GHK-Cu 6 mg/mL · BPC-157 2 mg/mL · TB-500 2.5 mg/mL', price_5ml: 150, price_5ml_label: '5 mL', price_10ml: 175, price_10ml_label: '10 mL', protocol_duration: '4–8 weeks; reassess as indicated', rep_note: 'Systemic rejuvenation — collagen/skin quality plus tissue repair.', status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p11', name: 'Sermorelin', category: 'peptide', concentration: '1,000 mcg/mL', price_5ml: null, price_5ml_label: null, price_10ml: 200, price_10ml_label: '10 mL', protocol_duration: '3–6 months; may continue at maintenance dose long-term', rep_note: 'Most physiologic GHRH analog.', status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p12', name: 'DSIP (Injectable)', category: 'peptide', concentration: '1,000 mcg/mL', price_5ml: null, price_5ml_label: null, price_10ml: 150, price_10ml_label: '10 mL', protocol_duration: '2–4 weeks continuous; 1–2 week rest', rep_note: null, status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p13', name: 'PT-141 (Bremelanotide)', category: 'peptide', concentration: '2 mg/mL', price_5ml: null, price_5ml_label: null, price_10ml: 150, price_10ml_label: '10 mL', protocol_duration: 'As needed; max 1×/24 hrs; max 8 doses/month', rep_note: 'Do not exceed 2 mg/dose. AEs: nausea, flushing — avoid in CV disease.', status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p14', name: 'AOD-9604', category: 'peptide', concentration: '1 mg/mL', price_5ml: 175, price_5ml_label: '5 mL', price_10ml: 250, price_10ml_label: '10 mL', protocol_duration: '8–12 weeks; 4–6 week rest between cycles', rep_note: 'Does not suppress endogenous GH, raise IGF-1, or affect fasting glucose.', status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p15', name: 'NAD+', category: 'peptide', concentration: '100 mg/mL', price_5ml: 90, price_5ml_label: '10 mL', price_10ml: 500, price_10ml_label: '60 mL', protocol_duration: 'IM loading daily × 4–10 days, then 2–3×/week; or SQ daily', rep_note: 'Also available in 30/50/90/120 mL — see the Peptide Prescribing & Price Guide.', status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },

  // Weight loss — GLP-1
  { id: 'p6', name: 'Semaglutide + B12 Vial', category: 'weight-loss', concentration: '1,000 mcg/mL + B12 (2.5–5 mg/mL dose-dependent)', price_5ml: null, price_5ml_label: null, price_10ml: 195, price_10ml_label: '5 mg · 5 mL vial', protocol_duration: '4-week supply per vial; dose per titration', rep_note: 'Do not lead with shortage/mail-order language. Full 1–5 mL matrix: see Weight Loss Order Form.', status: 'current', version: 3, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p16', name: 'Semaglutide + B12 Prefilled Syringe', category: 'weight-loss', concentration: '0.25–2.5 mg per syringe, dose-dependent', price_5ml: 85, price_5ml_label: '0.25 mg × 4 wk', price_10ml: 150, price_10ml_label: '2.5 mg × 4 wk', protocol_duration: '4-week supply; weekly SQ', rep_note: '6 dose strengths (0.25–2.5 mg) — full pricing: GLP Vials & Prefilled Syringes in Printable Documents.', status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p17', name: 'Tirzepatide + B3 Prefilled Syringe', category: 'weight-loss', concentration: '2.5–15 mg per syringe, dose-dependent', price_5ml: 135, price_5ml_label: '2.5 mg × 4 wk', price_10ml: 350, price_10ml_label: '15 mg × 4 wk', protocol_duration: '4-week supply; weekly SQ', rep_note: '6 dose strengths (2.5–15 mg) — full pricing: GLP Vials & Prefilled Syringes in Printable Documents.', status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p18', name: 'Tirzepatide + B3 Vial', category: 'weight-loss', concentration: '25 mg/mL + 2 mg B3/mL (10–25 mg/mL dose-dependent)', price_5ml: 60, price_5ml_label: '10 mg · 1 mL', price_10ml: 650, price_10ml_label: '25 mg · 8 mL', protocol_duration: '4-week supply per vial; 90-day BUD, multidose', rep_note: 'Full matrix (1–8 mL, 10/25 mg strengths): see GLP Vials & Prefilled Syringes.', status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },

  // Topicals
  { id: 'p7', name: 'BLT Numbing Cream', category: 'topical', concentration: 'Benzocaine 20% / Lidocaine 6% / Tetracaine 6%', price_5ml: 125, price_5ml_label: '60 g', price_10ml: 240, price_10ml_label: '120 g', protocol_duration: 'Ongoing per provider protocol', rep_note: null, status: 'current', version: 2, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p19', name: 'GHK-Cu Cream', category: 'topical', concentration: '2% (2 mg/mL)', price_5ml: 100, price_5ml_label: '30 mL', price_10ml: null, price_10ml_label: null, protocol_duration: 'Apply 1–2×/day; ongoing per provider protocol', rep_note: null, status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p20', name: 'GHK-Cu + Niacinamide Cream', category: 'topical', concentration: 'GHK-Cu 2% + Niacinamide 2%', price_5ml: 150, price_5ml_label: '30 mL', price_10ml: null, price_10ml_label: null, protocol_duration: '1–2×/day face/neck; ongoing', rep_note: 'Ideal post-procedure protocol.', status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p21', name: 'GHK-Cu + Bimatoprost Foam', category: 'topical', concentration: 'GHK-Cu 0.5% + Bimatoprost 0.03%', price_5ml: 150, price_5ml_label: '30 mL foam', price_10ml: null, price_10ml_label: null, protocol_duration: 'Nightly to scalp; ongoing', rep_note: 'Hair restoration — may darken skin with prolonged contact.', status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p22', name: 'BLT Numbing Ointment', category: 'topical', concentration: 'Benzocaine 20% / Lidocaine 6% / Tetracaine 6%', price_5ml: 80, price_5ml_label: '60 g', price_10ml: 150, price_10ml_label: '120 g', protocol_duration: 'Ongoing per provider protocol', rep_note: 'Ointment form, distinct SKU from the cream.', status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p23', name: 'Lidocaine/Tetracaine/Phenylephrine Ointment', category: 'topical', concentration: 'Lidocaine 23% / Tetracaine 7% / Phenylephrine 2%', price_5ml: 150, price_5ml_label: '100 g', price_10ml: null, price_10ml_label: null, protocol_duration: 'Ongoing per provider protocol', rep_note: null, status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },

  // Sublingual troches
  { id: 'p24', name: 'DSIP + Oxytocin Troches', category: 'troche', concentration: 'DSIP 0.5–2 mg + Oxytocin 100–300 IU, prescriber-directed', price_5ml: 55, price_5ml_label: '30 troches', price_10ml: null, price_10ml_label: null, protocol_duration: 'Nightly; 2–4 week cycles with reassessment', rep_note: 'Needle-averse patients; no chewing or swallowing.', status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },

  // Hormones — custom-formulated, pricing per AGErite's Hormones sheet
  { id: 'p25', name: 'Testosterone Cream', category: 'hormone', concentration: 'Custom strength — per Rx', price_5ml: 70, price_5ml_label: '60 g', price_10ml: null, price_10ml_label: null, protocol_duration: 'Ongoing per provider protocol', rep_note: 'Custom formulation and pricing available upon request.', status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p26', name: 'Progesterone Cream', category: 'hormone', concentration: 'Custom strength — per Rx', price_5ml: 70, price_5ml_label: '60 g', price_10ml: null, price_10ml_label: null, protocol_duration: 'Ongoing per provider protocol', rep_note: null, status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p27', name: 'Bi-Est Cream (Estriol-Estradiol)', category: 'hormone', concentration: 'Custom strength — per Rx', price_5ml: 70, price_5ml_label: '60 g', price_10ml: null, price_10ml_label: null, protocol_duration: 'Ongoing per provider protocol', rep_note: null, status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p28', name: 'Estradiol Cream', category: 'hormone', concentration: 'Custom strength — per Rx', price_5ml: 70, price_5ml_label: '60 g', price_10ml: null, price_10ml_label: null, protocol_duration: 'Ongoing per provider protocol', rep_note: null, status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p29', name: 'Testosterone Troche', category: 'hormone', concentration: 'Custom strength — per Rx', price_5ml: 55, price_5ml_label: '#30', price_10ml: null, price_10ml_label: null, protocol_duration: 'Ongoing per provider protocol', rep_note: null, status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p30', name: 'Progesterone Troche', category: 'hormone', concentration: 'Custom strength — per Rx', price_5ml: 55, price_5ml_label: '#30', price_10ml: null, price_10ml_label: null, protocol_duration: 'Ongoing per provider protocol', rep_note: null, status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p31', name: 'Bi-Est Troche', category: 'hormone', concentration: 'Custom strength — per Rx', price_5ml: 60, price_5ml_label: '#30', price_10ml: null, price_10ml_label: null, protocol_duration: 'Ongoing per provider protocol', rep_note: null, status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p32', name: 'Estradiol Troche', category: 'hormone', concentration: 'Custom strength — per Rx', price_5ml: 55, price_5ml_label: '#30', price_10ml: null, price_10ml_label: null, protocol_duration: 'Ongoing per provider protocol', rep_note: null, status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p33', name: 'Testosterone Capsule', category: 'hormone', concentration: 'Custom strength — per Rx', price_5ml: 60, price_5ml_label: '#30', price_10ml: null, price_10ml_label: null, protocol_duration: 'Ongoing per provider protocol', rep_note: null, status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p34', name: 'Progesterone Capsule', category: 'hormone', concentration: 'Custom strength — per Rx', price_5ml: 60, price_5ml_label: '#30', price_10ml: null, price_10ml_label: null, protocol_duration: 'Ongoing per provider protocol', rep_note: null, status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p35', name: 'Bi-Est Capsule', category: 'hormone', concentration: 'Custom strength — per Rx', price_5ml: 70, price_5ml_label: '#30', price_10ml: null, price_10ml_label: null, protocol_duration: 'Ongoing per provider protocol', rep_note: null, status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p36', name: 'Estradiol Capsule', category: 'hormone', concentration: 'Custom strength — per Rx', price_5ml: 60, price_5ml_label: '#30', price_10ml: null, price_10ml_label: null, protocol_duration: 'Ongoing per provider protocol', rep_note: null, status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p37', name: 'Desiccated Thyroid Capsule', category: 'hormone', concentration: 'Custom strength — per Rx', price_5ml: 60, price_5ml_label: '#30', price_10ml: null, price_10ml_label: null, protocol_duration: 'Ongoing per provider protocol', rep_note: null, status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p38', name: 'Liothyronine/Levothyroxine T3/T4 Capsule', category: 'hormone', concentration: 'Custom strength — per Rx', price_5ml: 55, price_5ml_label: '#30', price_10ml: null, price_10ml_label: null, protocol_duration: 'Ongoing per provider protocol', rep_note: null, status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p39', name: 'Liothyronine T3 Capsule', category: 'hormone', concentration: 'Custom strength — per Rx', price_5ml: 50, price_5ml_label: '#30', price_10ml: null, price_10ml_label: null, protocol_duration: 'Ongoing per provider protocol', rep_note: null, status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p40', name: 'Testosterone Cypionate Injectable', category: 'hormone', concentration: '50–200 mg/mL, dose-dependent', price_5ml: 80, price_5ml_label: '50 mg/mL · 2 mL', price_10ml: 115, price_10ml_label: '200 mg/mL · 3 mL', protocol_duration: 'Ongoing per provider protocol', rep_note: 'Other strength/vial combinations available — see Hormones Price Sheet.', status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },

  // IV & injectable additives
  { id: 'p41', name: 'PCDC 5%/2%', category: 'injection', concentration: '5% / 2%', price_5ml: 80, price_5ml_label: '30 mL', price_10ml: 274, price_10ml_label: '120 mL', protocol_duration: 'Per provider protocol', rep_note: 'Also available at 60/90 mL — see pricing sheet.', status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p42', name: 'PCDC 10%/4.2%', category: 'injection', concentration: '10% / 4.2%', price_5ml: 95, price_5ml_label: '30 mL', price_10ml: 290, price_10ml_label: '120 mL', protocol_duration: 'Per provider protocol', rep_note: 'Also available at 60/90 mL — see pricing sheet.', status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p43', name: 'Amino Mix', category: 'injection', concentration: 'Per provider formulation', price_5ml: 80, price_5ml_label: '30 mL', price_10ml: 300, price_10ml_label: '120 mL', protocol_duration: 'Per provider protocol', rep_note: 'Also available at 60/90 mL — see pricing sheet.', status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p44', name: 'Ascorbic Acid', category: 'injection', concentration: '500 mg/mL', price_5ml: 25, price_5ml_label: '10 mL', price_10ml: 200, price_10ml_label: '120 mL', protocol_duration: 'Per provider protocol', rep_note: 'Also available at 30/60/90 mL — see pricing sheet.', status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p45', name: 'B-Complex (B1/B2/B3/B5/B6)', category: 'injection', concentration: 'B1, B2, B3, B5, B6 blend', price_5ml: 30, price_5ml_label: '10 mL', price_10ml: 390, price_10ml_label: '120 mL', protocol_duration: 'Per provider protocol', rep_note: 'Also available at 30/50/60/90 mL — see pricing sheet.', status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
  { id: 'p46', name: 'Glutathione', category: 'injection', concentration: '200 mg/mL', price_5ml: 160, price_5ml_label: '30 mL', price_10ml: 600, price_10ml_label: '120 mL', protocol_duration: 'Per provider protocol', rep_note: 'Also available at 60/90 mL — see pricing sheet.', status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-09-10' },
]

export const seedProductChangeLog: ProductChangeLog[] = [
  { id: 'c12', product_id: 'p2', field_changed: 'concentration', old_value: '5 mg/mL', new_value: '2.5 mg/mL', changed_by: 'Rockwall Partners (price sheet sync)', changed_at: '2026-09-10' },
  { id: 'c13', product_id: 'p2', field_changed: 'status', old_value: 'pending_review', new_value: 'current', changed_by: 'Rockwall Partners (price sheet sync)', changed_at: '2026-09-10' },
  { id: 'c14', product_id: 'p1', field_changed: 'price_10ml', old_value: '$225', new_value: '$175', changed_by: 'Rockwall Partners (price sheet sync)', changed_at: '2026-09-10' },
  { id: 'c15', product_id: 'p3', field_changed: 'name', old_value: 'CJC-1295', new_value: 'CJC-1295 + Ipamorelin', changed_by: 'Rockwall Partners (price sheet sync)', changed_at: '2026-09-10' },
  { id: 'c16', product_id: 'p3', field_changed: 'price_10ml', old_value: '$260', new_value: '$200', changed_by: 'Rockwall Partners (price sheet sync)', changed_at: '2026-09-10' },
  { id: 'c17', product_id: 'p4', field_changed: 'concentration', old_value: '2 mg/mL', new_value: '1 mg/mL (1,000 mcg/mL)', changed_by: 'Rockwall Partners (price sheet sync)', changed_at: '2026-09-10' },
  { id: 'c18', product_id: 'p4', field_changed: 'price_5ml', old_value: '$140 (5 mL)', new_value: 'Not sold in 5 mL — 10 mL only', changed_by: 'Rockwall Partners (price sheet sync)', changed_at: '2026-09-10' },
  { id: 'c19', product_id: 'p5', field_changed: 'price_5ml', old_value: '$175', new_value: '$130', changed_by: 'Rockwall Partners (price sheet sync)', changed_at: '2026-09-10' },
  { id: 'c20', product_id: 'p6', field_changed: 'name', old_value: 'Semaglutide', new_value: 'Semaglutide + B12 Vial', changed_by: 'Rockwall Partners (price sheet sync)', changed_at: '2026-09-10' },
  { id: 'c21', product_id: 'p6', field_changed: 'price_10ml', old_value: '$399', new_value: '$195', changed_by: 'Rockwall Partners (price sheet sync)', changed_at: '2026-09-10' },
  { id: 'c22', product_id: 'p7', field_changed: 'price_10ml', old_value: '$45 (10 mL)', new_value: '$240 (120 g)', changed_by: 'Rockwall Partners (price sheet sync)', changed_at: '2026-09-10' },
]

export const seedClinics: Clinic[] = [
  { id: 'cl1', name: 'Vixen Wellness', city: 'Rockwall', segment: 'med spa', tier: 'T1', cluster: 'Rockwall–Fate', website: 'vixenwellness.com', phone: null, email: null, owner_rep_id: 'r1', stage: 'onboard', last_touch_at: '2026-08-28', next_step: 'Confirm first order' },
  { id: 'cl2', name: 'Sculpted MD', city: 'Fate', segment: 'med spa', tier: 'T1', cluster: 'Rockwall–Fate', website: 'sculptedmd.com', phone: null, email: null, owner_rep_id: null, stage: 'identify', last_touch_at: null, next_step: 'Initial drop-in' },
  { id: 'cl3', name: "Game Day Men's Health", city: 'Houston', segment: 'TRT', tier: 'T1', cluster: 'North Houston', website: 'gamedaymenshealth.com', phone: null, email: null, owner_rep_id: 'r2', stage: 'reorder', last_touch_at: '2026-09-01', next_step: '4-week reorder check-in' },
  { id: 'cl4', name: 'Cypress Renewal Clinic', city: 'Cypress', segment: 'wellness', tier: 'T2', cluster: 'Cypress', website: 'cypressrenewal.com', phone: null, email: null, owner_rep_id: 'r3', stage: 'discovery', last_touch_at: '2026-09-02', next_step: 'Send provider packet' },
  { id: 'cl5', name: 'Heights Aesthetic Bar', city: 'Houston', segment: 'med spa', tier: 'T2', cluster: 'North Houston', website: 'heightsaestheticbar.com', phone: null, email: null, owner_rep_id: null, stage: 'identify', last_touch_at: null, next_step: 'Initial drop-in' },
]

// Real prospects from agerite-gtm-playbook.html (Part 3, 100-target list),
// a representative slice spanning every real route cluster and all three
// tiers — see the matching Supabase migration (phase1_10_leads_seed_data)
// for the full rationale. Kept in exact sync with that migration.
export const seedLeads: Lead[] = [
  { id: 'ld1', name: 'ReViVe Aesthetics & Healthcare', city: 'Rockwall', segment: 'Med spa · weight loss · IV', tier: 'T1', cluster: 'Rockwall core', website: 'https://we-revive.com', phone: null, email: null, status: 'new', promoted_clinic_id: null, created_at: '2026-09-10' },
  { id: 'ld2', name: 'All About Aesthetics', city: 'Rockwall', segment: 'Med spa · GLP-1 weight loss', tier: 'T1', cluster: 'Rockwall core', website: 'https://aestheticsrockwall.com', phone: null, email: null, status: 'contacted', promoted_clinic_id: null, created_at: '2026-09-10' },
  { id: 'ld3', name: 'The Retreat Restorative & Aesthetics', city: 'Rockwall', segment: 'Med spa · cosmetic surgery · IV', tier: 'T1', cluster: 'Rockwall core', website: 'https://theretreataesthetics.com', phone: null, email: null, status: 'new', promoted_clinic_id: null, created_at: '2026-09-10' },
  { id: 'ld4', name: "T-Time Wellness", city: 'Rockwall', segment: "Men's health · TRT", tier: 'T1', cluster: 'Rockwall core', website: 'https://ttimewellness.com', phone: null, email: null, status: 'new', promoted_clinic_id: null, created_at: '2026-09-10' },
  { id: 'ld5', name: 'Apex Integrative Medicine', city: 'Rockwall', segment: 'Functional med · BHRT · peptides · weight loss', tier: 'T1', cluster: 'Rockwall core', website: 'https://apexintegrativemed.com', phone: null, email: null, status: 'new', promoted_clinic_id: null, created_at: '2026-09-10' },
  { id: 'ld6', name: 'EVEXIAS Medical Center Rockwall', city: 'Rockwall', segment: 'Hormones · weight loss · peptides', tier: 'T2', cluster: 'Rockwall core', website: 'https://evexiasmedical.com', phone: null, email: null, status: 'new', promoted_clinic_id: null, created_at: '2026-09-10' },
  { id: 'ld7', name: 'Low T Center Rockwall', city: 'Rockwall', segment: "Men's health · TRT/HRT · peptides · weight loss", tier: 'T3', cluster: 'Rockwall core', website: 'https://lowtcenter.com', phone: null, email: null, status: 'new', promoted_clinic_id: null, created_at: '2026-09-10' },
  { id: 'ld8', name: 'Sukoon Med Spa & Wellness', city: 'Rowlett', segment: 'Med spa · weight loss · gyn', tier: 'T1', cluster: 'Lake cities', website: 'https://sukoonspa.com', phone: null, email: null, status: 'new', promoted_clinic_id: null, created_at: '2026-09-10' },
  { id: 'ld9', name: "Dr. DeLeon's Woman's Health Care", city: 'Rowlett', segment: 'OB/GYN · HRT · weight loss', tier: 'T2', cluster: 'Lake cities', website: 'https://ddwhc.com', phone: null, email: null, status: 'contacted', promoted_clinic_id: null, created_at: '2026-09-10' },
  { id: 'ld10', name: 'Demure Aesthetics and Wellness', city: 'Wylie', segment: 'Med spa · IV', tier: 'T1', cluster: 'Lake cities', website: 'https://demureaestheticsandwellness.com', phone: null, email: null, status: 'new', promoted_clinic_id: null, created_at: '2026-09-10' },
  { id: 'ld11', name: 'Glowy Med Spa', city: 'Murphy', segment: 'Med spa', tier: 'T1', cluster: 'Lake cities', website: 'https://glowymedspa.com', phone: null, email: null, status: 'new', promoted_clinic_id: null, created_at: '2026-09-10' },
  { id: 'ld12', name: 'Golden Diamond MedSpa', city: 'Garland', segment: 'Med spa', tier: 'T1', cluster: 'Garland / Firewheel', website: null, phone: null, email: null, status: 'new', promoted_clinic_id: null, created_at: '2026-09-10' },
  { id: 'ld13', name: 'Sanjiva Med Spa', city: 'Garland', segment: 'Med spa · weight loss', tier: 'T2', cluster: 'Garland / Firewheel', website: 'https://sanjivamedspa.com', phone: null, email: null, status: 'new', promoted_clinic_id: null, created_at: '2026-09-10' },
  { id: 'ld14', name: 'Sculpted MD Garland', city: 'Garland', segment: 'HRT/TRT · weight loss · aesthetics', tier: 'T3', cluster: 'Garland / Firewheel', website: 'https://sculptedmd.com', phone: null, email: null, status: 'new', promoted_clinic_id: null, created_at: '2026-09-10' },
  { id: 'ld15', name: 'My Spa & Laser Center', city: 'Forney', segment: 'Med spa', tier: 'T1', cluster: 'Forney / Terrell / Kaufman', website: 'https://myspaforney.com', phone: null, email: null, status: 'new', promoted_clinic_id: null, created_at: '2026-09-10' },
  { id: 'ld16', name: 'Tripple Kare Clinic', city: 'Forney', segment: 'Weight loss · med spa', tier: 'T1', cluster: 'Forney / Terrell / Kaufman', website: 'https://tripplekareclinic.com', phone: null, email: null, status: 'contacted', promoted_clinic_id: null, created_at: '2026-09-10' },
  { id: 'ld17', name: 'Mymodernmedicine', city: 'Forney', segment: 'Functional / lifestyle medicine', tier: 'T1', cluster: 'Forney / Terrell / Kaufman', website: 'https://mymodernmedicine.com', phone: null, email: null, status: 'new', promoted_clinic_id: null, created_at: '2026-09-10' },
  { id: 'ld18', name: 'U.S. Dermatology Partners Forney', city: 'Forney', segment: 'Dermatology', tier: 'T2', cluster: 'Forney / Terrell / Kaufman', website: 'https://usdermatologypartners.com', phone: null, email: null, status: 'new', promoted_clinic_id: null, created_at: '2026-09-10' },
  { id: 'ld19', name: 'Western Wellness & Esthetics', city: 'Greenville', segment: 'Med spa', tier: 'T1', cluster: 'Greenville / Royse City / Caddo Mills', website: 'https://westernwellnessaesthetics.llc', phone: null, email: null, status: 'new', promoted_clinic_id: null, created_at: '2026-09-10' },
  { id: 'ld20', name: 'Beaute Par Co', city: 'Greenville', segment: 'IV · wellness med spa', tier: 'T1', cluster: 'Greenville / Royse City / Caddo Mills', website: 'https://beauteparco.com', phone: null, email: null, status: 'new', promoted_clinic_id: null, created_at: '2026-09-10' },
  { id: 'ld21', name: 'Sparta Wellness Clinic', city: 'Caddo Mills', segment: 'Primary care · weight loss · hormones · peptides', tier: 'T1', cluster: 'Greenville / Royse City / Caddo Mills', website: 'https://spartawellnessclinic.com', phone: null, email: null, status: 'new', promoted_clinic_id: null, created_at: '2026-09-10' },
  { id: 'ld22', name: 'Hunt Regional Healthcare', city: 'Greenville', segment: 'Hospital / health system', tier: 'T3', cluster: 'Greenville / Royse City / Caddo Mills', website: 'https://huntregional.org', phone: null, email: null, status: 'new', promoted_clinic_id: null, created_at: '2026-09-10' },
  { id: 'ld23', name: "Gameday Men's Health Mesquite", city: 'Mesquite', segment: "Men's health · TRT · weight loss", tier: 'T3', cluster: 'Mesquite / Sunnyvale', website: 'https://gamedaymenshealth.com/mesquite-tx', phone: null, email: null, status: 'new', promoted_clinic_id: null, created_at: '2026-09-10' },
  { id: 'ld24', name: 'Urgent Care Texas', city: 'Mesquite', segment: 'Urgent care · weight loss', tier: 'T2', cluster: 'Mesquite / Sunnyvale', website: 'https://urgentcaretexas.com', phone: null, email: null, status: 'new', promoted_clinic_id: null, created_at: '2026-09-10' },
]

// Preview data for the SiCompounding B2B Order API integration — see
// CRM_SPEC.md section 9. Only cl3 (the one seeded reorder-stage clinic)
// has order history; nothing in the UI creates these.
export const seedOrders: Order[] = [
  { id: 'o1', clinic_id: 'cl3', product_id: 'p6', size: '10ml', quantity: 3, status: 'delivered', ordered_at: '2026-06-05' },
  { id: 'o2', clinic_id: 'cl3', product_id: 'p6', size: '10ml', quantity: 4, status: 'delivered', ordered_at: '2026-07-08' },
  { id: 'o3', clinic_id: 'cl3', product_id: 'p3', size: '10ml', quantity: 2, status: 'delivered', ordered_at: '2026-07-22' },
  { id: 'o4', clinic_id: 'cl3', product_id: 'p6', size: '10ml', quantity: 5, status: 'delivered', ordered_at: '2026-08-10' },
  { id: 'o5', clinic_id: 'cl3', product_id: 'p4', size: '10ml', quantity: 3, status: 'shipped', ordered_at: '2026-08-30' },
  { id: 'o6', clinic_id: 'cl3', product_id: 'p6', size: '10ml', quantity: 4, status: 'processing', ordered_at: '2026-09-06' },
]

export const seedPatientRefills: PatientRefill[] = [
  { id: 'pr1', patient_ref: 'P-0417', clinic_id: 'cl1', product_id: 'p1', started_at: '2026-08-01', protocol_weeks: 6 },
  { id: 'pr2', patient_ref: 'P-0418', clinic_id: 'cl1', product_id: 'p3', started_at: '2026-06-20', protocol_weeks: 10 },
  { id: 'pr3', patient_ref: 'P-0512', clinic_id: 'cl3', product_id: 'p6', started_at: '2026-06-01', protocol_weeks: 12 },
  { id: 'pr4', patient_ref: 'P-0533', clinic_id: 'cl4', product_id: 'p4', started_at: '2026-08-20', protocol_weeks: 10 },
]

export const seedLicensedStates: LicensedState[] = [
  { id: 's1', state_name: 'Texas', status: 'confirmed', target_quarter: null },
  { id: 's2', state_name: 'New York', status: 'confirmed', target_quarter: null },
  { id: 's3', state_name: 'Colorado', status: 'confirmed', target_quarter: null },
  { id: 's4', state_name: 'Wisconsin', status: 'confirmed', target_quarter: null },
  { id: 's5', state_name: 'Missouri', status: 'confirmed', target_quarter: null },
  { id: 's6', state_name: 'New Jersey', status: 'confirmed', target_quarter: null },
  { id: 's7', state_name: 'Idaho', status: 'confirmed', target_quarter: null },
  { id: 's8', state_name: 'Florida', status: 'roadmap', target_quarter: 'Q4 2026' },
  { id: 's9', state_name: 'Arizona', status: 'roadmap', target_quarter: 'Q1 2027' },
]

export const seedCertificationModules: CertificationModule[] = [
  {
    id: 'm1',
    title: 'Peptide Handling & Compliance Basics',
    order: 1,
    questions: [
      {
        prompt: 'A brochure and an order form disagree on concentration. What do you do?',
        options: ['Use whichever number is higher, to be safe', 'Quote nothing until the source of truth confirms it', 'Ask the clinic which one they prefer'],
        correct_index: 1,
      },
      {
        prompt: 'A product shows "pending review" in the knowledge base. Can you quote its price to a clinic?',
        options: ['Yes, the old price still applies', 'No — do not quote until it clears review', 'Only if the clinic asks twice'],
        correct_index: 1,
      },
      {
        prompt: 'You want to work a clinic that shows another rep as owner. What do you do?',
        options: ['Log a contact anyway, first to touch wins twice', 'Leave it — ownership is locked to the first rep unless admin reassigns', 'Ask the clinic to switch reps'],
        correct_index: 1,
      },
    ],
  },
]
