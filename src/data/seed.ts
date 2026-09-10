import type {
  CertificationModule,
  Clinic,
  Lead,
  LicensedState,
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

export const seedProducts: Product[] = [
  { id: 'p1', name: 'BPC-157', category: 'peptide', concentration: '5 mg/mL', price_5ml: 125, price_10ml: 225, protocol_duration: '4–8 weeks', rep_note: 'Most-requested recovery peptide. Confirm current concentration before quoting.', status: 'current', version: 3, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-08-12' },
  { id: 'p2', name: 'TB-500', category: 'peptide', concentration: '5 mg/mL', price_5ml: 125, price_10ml: 135, protocol_duration: '4–8 weeks', rep_note: 'PIC is re-checking concentration vs. order form before this is confirmed. Do not quote pricing.', status: 'pending_review', version: 4, reviewed_by: null, reviewed_at: null },
  { id: 'p3', name: 'CJC-1295', category: 'peptide', concentration: '2 mg/mL', price_5ml: 150, price_10ml: 260, protocol_duration: '8–12 weeks', rep_note: 'Often paired with Ipamorelin.', status: 'current', version: 2, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-07-01' },
  { id: 'p4', name: 'Ipamorelin', category: 'peptide', concentration: '2 mg/mL', price_5ml: 140, price_10ml: 250, protocol_duration: '8–12 weeks', rep_note: null, status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-06-15' },
  { id: 'p5', name: 'Tesamorelin', category: 'peptide', concentration: '3 mg/mL', price_5ml: 175, price_10ml: null, protocol_duration: '12 weeks', rep_note: 'August pricing is current. Do not use any June sheet.', status: 'current', version: 2, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-08-01' },
  { id: 'p6', name: 'Semaglutide', category: 'weight-loss', concentration: '2.5 mg/mL', price_5ml: null, price_10ml: 399, protocol_duration: '12–24 weeks', rep_note: 'Do not lead with shortage/mail-order language.', status: 'current', version: 2, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-08-20' },
  { id: 'p7', name: 'BLT Numbing Cream', category: 'topical', concentration: 'Benzocaine/Lidocaine/Tetracaine', price_5ml: null, price_10ml: 45, protocol_duration: 'As needed', rep_note: null, status: 'current', version: 1, reviewed_by: 'Cindy R., PIC', reviewed_at: '2026-05-10' },
]

export const seedProductChangeLog: ProductChangeLog[] = [
  { id: 'c1', product_id: 'p2', field_changed: 'concentration', old_value: '2.5 mg/mL', new_value: '5 mg/mL', changed_by: 'Cindy R., PIC', changed_at: '2026-09-05' },
  { id: 'c2', product_id: 'p5', field_changed: 'concentration', old_value: '1 mg/mL', new_value: '3 mg/mL', changed_by: 'Cindy R., PIC', changed_at: '2026-08-01' },
  { id: 'c3', product_id: 'p1', field_changed: 'price_10ml', old_value: '$210', new_value: '$225', changed_by: 'Cindy R., PIC', changed_at: '2026-08-12' },
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
