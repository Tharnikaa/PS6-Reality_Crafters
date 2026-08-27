-- ============================================================
-- CivicResolve — Full Setup Script
-- Run this in the Supabase SQL Editor.
-- It drops and recreates civic_reports with all required columns
-- then inserts sample data.
-- SAFE TO RUN: the old table had no real data.
-- ============================================================

-- Step 1: Drop the old incomplete table
DROP TABLE IF EXISTS civic_reports;

-- Step 2: Create the complete table from scratch
CREATE TABLE civic_reports (
  id                TEXT PRIMARY KEY,           -- e.g. REP-4091
  category          TEXT NOT NULL,              -- Pothole, Garbage Overflow, etc.
  department        TEXT NOT NULL,              -- Responsible city department
  description       TEXT,                       -- Citizen's description of the problem
  location          TEXT,                       -- Human-readable address
  lat               DOUBLE PRECISION,           -- GPS latitude
  lng               DOUBLE PRECISION,           -- GPS longitude
  status            TEXT DEFAULT 'Pending',     -- Pending / In Progress / Resolved
  severity          INT  DEFAULT 2,             -- 2=Low, 3=Medium, 4=High, 5=Critical
  duplicates_count  INT  DEFAULT 1,             -- How many citizens reported same issue
  image_url         TEXT,                       -- Photo of the issue
  timestamp         TIMESTAMPTZ DEFAULT NOW(),  -- When the report was submitted
  reporter_phone    TEXT,                       -- Reporter contact number

  -- Priority fields (calculated by triage pipeline in server.js)
  priority_score    INT     DEFAULT 0,          -- Weighted score 0-100
  priority_level    TEXT    DEFAULT 'LOW',      -- CRITICAL / HIGH / MEDIUM / LOW
  nearby_facility   BOOLEAN DEFAULT FALSE,      -- School or hospital within 500m?
  facility_type     TEXT,                       -- SCHOOL or HOSPITAL
  facility_name     TEXT,                       -- e.g. "Apollo Children's Hospital"
  facility_distance DOUBLE PRECISION,           -- Distance in metres (rounded)
  high_traffic_area BOOLEAN DEFAULT FALSE       -- Is it on a major road?
);

-- Step 3: Enable Row Level Security (allows frontend to read/write via anon key)
ALTER TABLE civic_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read"   ON civic_reports FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON civic_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON civic_reports FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON civic_reports FOR DELETE USING (true);

-- ============================================================
-- Step 4: Insert sample data (10 reports across 4 priority levels)
-- ============================================================

INSERT INTO civic_reports (
  id, category, department, description, location,
  lat, lng, status, severity, duplicates_count, image_url,
  reporter_phone, priority_score, priority_level,
  nearby_facility, facility_type, facility_name, facility_distance,
  high_traffic_area
) VALUES

-- CRITICAL — 3 clustered pothole reports, hospital nearby, main road
(
  'REP-4091', 'Pothole & Surface Damage', 'Highways & Roads',
  'Dangerous crater-sized pothole right after the signal. Causing severe traffic skids and accidents.',
  'Anna Salai, Near Spencers Plaza, Chennai',
  13.0604, 80.2496, 'In Progress', 5, 3,
  'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=500&q=80',
  '+91 9876543210', 95, 'CRITICAL', true, 'HOSPITAL', 'Apollo Children''s Hospital', 0, true
),
(
  'REP-4090', 'Pothole & Surface Damage', 'Highways & Roads',
  'Same pothole near Spencer signal — nearly fell off my bike this morning.',
  'Anna Salai, Near Spencers Plaza, Chennai',
  13.0605, 80.2497, 'In Progress', 5, 3,
  'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=500&q=80',
  '+91 9876500001', 95, 'CRITICAL', true, 'HOSPITAL', 'Apollo Children''s Hospital', 10, true
),
(
  'REP-4089', 'Pothole & Surface Damage', 'Highways & Roads',
  'Pothole on Anna Salai has been here for weeks. Vehicles swerving dangerously.',
  'Anna Salai, Near Spencers Plaza, Chennai',
  13.0603, 80.2495, 'In Progress', 5, 3,
  'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=500&q=80',
  '+91 9876500002', 95, 'CRITICAL', true, 'HOSPITAL', 'Apollo Children''s Hospital', 15, true
),

-- HIGH — 2 clustered garbage reports, school nearby, main road
(
  'REP-4088', 'Garbage Overflow', 'Solid Waste Management',
  'Community bin overflowing for 3 days. Blocking sidewalk and spreading disease.',
  'T. Nagar 3rd Main Rd, Chennai',
  13.0418, 80.2341, 'Pending', 4, 2,
  'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=500&q=80',
  '+91 9123456789', 70, 'HIGH', true, 'SCHOOL', 'T. Nagar Girls Higher Secondary School', 60, true
),
(
  'REP-4087', 'Garbage Overflow', 'Solid Waste Management',
  'Same garbage pile near T. Nagar main road. Extremely bad smell.',
  'T. Nagar 3rd Main Rd, Chennai',
  13.0419, 80.2342, 'Pending', 4, 2,
  'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=500&q=80',
  '+91 9123456790', 70, 'HIGH', true, 'SCHOOL', 'T. Nagar Girls Higher Secondary School', 70, true
),

-- MEDIUM — 3 clustered water reports, no facility, local road
(
  'REP-4085', 'Water & Sewage Issue', 'Water & Sewerage',
  'Water pipe burst. Road flooded and water is being wasted since morning.',
  'Adyar 2nd Cross Street, Chennai',
  13.0012, 80.2565, 'Pending', 3, 3,
  'https://images.unsplash.com/photo-1616431218254-b4a6e0714224?w=500&q=80',
  '+91 9555123456', 40, 'MEDIUM', false, null, null, null, false
),
(
  'REP-4084', 'Water & Sewage Issue', 'Water & Sewerage',
  'Street still flooded. Nobody has come to fix it since yesterday.',
  'Adyar 2nd Cross Street, Chennai',
  13.0013, 80.2566, 'Pending', 3, 3,
  'https://images.unsplash.com/photo-1616431218254-b4a6e0714224?w=500&q=80',
  '+91 9555123457', 40, 'MEDIUM', false, null, null, null, false
),
(
  'REP-4083', 'Water & Sewage Issue', 'Water & Sewerage',
  'Flooded street making it impossible to walk. Children unable to reach school.',
  'Adyar 2nd Cross Street, Chennai',
  13.0014, 80.2564, 'Pending', 3, 3,
  'https://images.unsplash.com/photo-1616431218254-b4a6e0714224?w=500&q=80',
  '+91 9555123458', 40, 'MEDIUM', false, null, null, null, false
),

-- LOW — 1 report, no facility, local lane (already resolved)
(
  'REP-4072', 'Broken Streetlight', 'Electrical Department',
  'Streetlights not functioning for the entire block. Complete darkness at night.',
  'Velachery 5th Lane, Chennai',
  12.9815, 80.2180, 'Resolved', 2, 1,
  'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=500&q=80',
  '+91 9988776655', 10, 'LOW', false, null, null, null, false
),
(
  'REP-4071', 'Broken Streetlight', 'Electrical Department',
  'Single streetlamp flickering intermittently at the end of the residential lane.',
  'Mylapore 2nd Main Rd, Chennai',
  13.0335, 80.2680, 'Pending', 2, 1,
  'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=500&q=80',
  '+91 9840123456', 10, 'LOW', false, null, null, null, false
);
