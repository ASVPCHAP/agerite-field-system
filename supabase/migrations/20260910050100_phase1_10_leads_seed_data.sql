-- Real prospects from agerite-gtm-playbook.html (Part 3, 100-target list),
-- a representative slice (~24 of 100) spanning every real route cluster and
-- all three tiers — enough to demo the Leads/Pipeline/Analytics funnel
-- without hand-transcribing the full list. Names/cities/segments/tiers are
-- verbatim from that doc; the real clusters used here (Rockwall core, Lake
-- cities, etc.) are the actual territory plan, not the placeholder
-- "Rockwall–Fate"/"North Houston"/"Cypress" values already in `clinics` —
-- that mismatch is a known finding for the seed-data audit, not fixed here.
insert into leads (id, name, city, segment, tier, cluster, website, status) values
  ('ld1',  'ReViVe Aesthetics & Healthcare', 'Rockwall', 'Med spa · weight loss · IV', 'T1', 'Rockwall core', 'https://we-revive.com', 'new'),
  ('ld2',  'All About Aesthetics', 'Rockwall', 'Med spa · GLP-1 weight loss', 'T1', 'Rockwall core', 'https://aestheticsrockwall.com', 'contacted'),
  ('ld3',  'The Retreat Restorative & Aesthetics', 'Rockwall', 'Med spa · cosmetic surgery · IV', 'T1', 'Rockwall core', 'https://theretreataesthetics.com', 'new'),
  ('ld4',  'T-Time Wellness', 'Rockwall', 'Men''s health · TRT', 'T1', 'Rockwall core', 'https://ttimewellness.com', 'new'),
  ('ld5',  'Apex Integrative Medicine', 'Rockwall', 'Functional med · BHRT · peptides · weight loss', 'T1', 'Rockwall core', 'https://apexintegrativemed.com', 'new'),
  ('ld6',  'EVEXIAS Medical Center Rockwall', 'Rockwall', 'Hormones · weight loss · peptides', 'T2', 'Rockwall core', 'https://evexiasmedical.com', 'new'),
  ('ld7',  'Low T Center Rockwall', 'Rockwall', 'Men''s health · TRT/HRT · peptides · weight loss', 'T3', 'Rockwall core', 'https://lowtcenter.com', 'new'),
  ('ld8',  'Sukoon Med Spa & Wellness', 'Rowlett', 'Med spa · weight loss · gyn', 'T1', 'Lake cities', 'https://sukoonspa.com', 'new'),
  ('ld9',  'Dr. DeLeon''s Woman''s Health Care', 'Rowlett', 'OB/GYN · HRT · weight loss', 'T2', 'Lake cities', 'https://ddwhc.com', 'contacted'),
  ('ld10', 'Demure Aesthetics and Wellness', 'Wylie', 'Med spa · IV', 'T1', 'Lake cities', 'https://demureaestheticsandwellness.com', 'new'),
  ('ld11', 'Glowy Med Spa', 'Murphy', 'Med spa', 'T1', 'Lake cities', 'https://glowymedspa.com', 'new'),
  ('ld12', 'Golden Diamond MedSpa', 'Garland', 'Med spa', 'T1', 'Garland / Firewheel', null, 'new'),
  ('ld13', 'Sanjiva Med Spa', 'Garland', 'Med spa · weight loss', 'T2', 'Garland / Firewheel', 'https://sanjivamedspa.com', 'new'),
  ('ld14', 'Sculpted MD Garland', 'Garland', 'HRT/TRT · weight loss · aesthetics', 'T3', 'Garland / Firewheel', 'https://sculptedmd.com', 'new'),
  ('ld15', 'My Spa & Laser Center', 'Forney', 'Med spa', 'T1', 'Forney / Terrell / Kaufman', 'https://myspaforney.com', 'new'),
  ('ld16', 'Tripple Kare Clinic', 'Forney', 'Weight loss · med spa', 'T1', 'Forney / Terrell / Kaufman', 'https://tripplekareclinic.com', 'contacted'),
  ('ld17', 'Mymodernmedicine', 'Forney', 'Functional / lifestyle medicine', 'T1', 'Forney / Terrell / Kaufman', 'https://mymodernmedicine.com', 'new'),
  ('ld18', 'U.S. Dermatology Partners Forney', 'Forney', 'Dermatology', 'T2', 'Forney / Terrell / Kaufman', 'https://usdermatologypartners.com', 'new'),
  ('ld19', 'Western Wellness & Esthetics', 'Greenville', 'Med spa', 'T1', 'Greenville / Royse City / Caddo Mills', 'https://westernwellnessaesthetics.llc', 'new'),
  ('ld20', 'Beaute Par Co', 'Greenville', 'IV · wellness med spa', 'T1', 'Greenville / Royse City / Caddo Mills', 'https://beauteparco.com', 'new'),
  ('ld21', 'Sparta Wellness Clinic', 'Caddo Mills', 'Primary care · weight loss · hormones · peptides', 'T1', 'Greenville / Royse City / Caddo Mills', 'https://spartawellnessclinic.com', 'new'),
  ('ld22', 'Hunt Regional Healthcare', 'Greenville', 'Hospital / health system', 'T3', 'Greenville / Royse City / Caddo Mills', 'https://huntregional.org', 'new'),
  ('ld23', 'Gameday Men''s Health Mesquite', 'Mesquite', 'Men''s health · TRT · weight loss', 'T3', 'Mesquite / Sunnyvale', 'https://gamedaymenshealth.com/mesquite-tx', 'new'),
  ('ld24', 'Urgent Care Texas', 'Mesquite', 'Urgent care · weight loss', 'T2', 'Mesquite / Sunnyvale', 'https://urgentcaretexas.com', 'new');
