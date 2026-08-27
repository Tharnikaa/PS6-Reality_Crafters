-- ============================================================
-- Civic Issue Reporting: Schema + Public Use Dataset + Priority Logic
-- Target Table: civic_reports & officials
-- Run this in the Supabase SQL editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------- SCHEMA ----------

CREATE TABLE IF NOT EXISTS civic_reports (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  department TEXT NOT NULL,      -- Highways & Roads | Solid Waste Management | Electrical Department | Water Supply & Drainage
  description TEXT,
  location TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  location_gis GEOGRAPHY(Point, 4326),
  status TEXT DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'In Progress', 'Resolved', 'Closed', 'Reopened')),
  severity INT DEFAULT 3,
  duplicates_count INT DEFAULT 1,
  image_url TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  reporter_phone TEXT,
  assigned_to UUID
);

CREATE TABLE IF NOT EXISTS officials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department TEXT NOT NULL,      -- Highways & Roads | Solid Waste Management | Electrical Department | Water Supply & Drainage
  zone TEXT,
  active BOOLEAN DEFAULT true
);

-- Enable RLS and public policies
ALTER TABLE civic_reports ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access') THEN
    CREATE POLICY "Allow public read access" ON civic_reports FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public insert access') THEN
    CREATE POLICY "Allow public insert access" ON civic_reports FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public update access') THEN
    CREATE POLICY "Allow public update access" ON civic_reports FOR UPDATE USING (true);
  END IF;
END $$;

-- ---------- DUMMY OFFICIALS ----------

INSERT INTO officials (id, name, department, zone, active) VALUES
('00000000-0000-0000-0000-000000000001', 'Ramesh Kumar',  'Highways & Roads',       'Zone A', true),
('00000000-0000-0000-0000-000000000002', 'Suresh Babu',   'Highways & Roads',       'Zone B', true),
('00000000-0000-0000-0000-000000000003', 'Lakshmi Priya', 'Water Supply & Drainage', 'Zone A', true),
('00000000-0000-0000-0000-000000000004', 'Karthik Raja',  'Water Supply & Drainage', 'Zone B', true),
('00000000-0000-0000-0000-000000000005', 'Divya Shree',   'Solid Waste Management', 'Zone A', true),
('00000000-0000-0000-0000-000000000006', 'Mohan Das',     'Solid Waste Management', 'Zone B', true),
('00000000-0000-0000-0000-000000000007', 'Anitha R',      'Electrical Department',  'Zone A', true),
('00000000-0000-0000-0000-000000000008', 'Vijay Anand',   'Electrical Department',  'Zone B', true)
ON CONFLICT (id) DO NOTHING;

-- ---------- PUBLIC USE BRANCH SEED DATA ----------

INSERT INTO civic_reports 
  (id, category, department, description, location, lat, lng, location_gis, status, severity, duplicates_count, image_url, timestamp, reporter_phone, assigned_to)
VALUES
('REP-4091', 'Pothole / Road Hazard', 'Highways & Roads',
 'Dangerous crater-sized pothole right after the signal. Causing severe traffic skids and accidents.',
 'Anna Salai, Near Spencers Plaza, Chennai',
 13.0604, 80.2496, ST_SetSRID(ST_MakePoint(80.2496, 13.0604), 4326),
 'In Progress', 4, 5,
 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=500&q=80',
 NOW() - INTERVAL '5 days', '+91 9876543210', '00000000-0000-0000-0000-000000000001'),

('REP-4088', 'Garbage Overflow', 'Solid Waste Management',
 'Community bin overflowing for 3 days. Blocking sidewalk completely and foul smell.',
 'T. Nagar 3rd Main Rd, Chennai',
 13.0418, 80.2341, ST_SetSRID(ST_MakePoint(80.2341, 13.0418), 4326),
 'Pending', 3, 2,
 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=500&q=80',
 NOW() - INTERVAL '2 days', '+91 9123456789', '00000000-0000-0000-0000-000000000005'),

('REP-4072', 'Broken Streetlight', 'Electrical Department',
 'Streetlights not functioning for the entire block near school. Complete darkness.',
 'Velachery Bypass Rd, Chennai',
 12.9815, 80.2180, ST_SetSRID(ST_MakePoint(80.2180, 12.9815), 4326),
 'Resolved', 2, 1,
 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=500&q=80',
 NOW() - INTERVAL '6 days', '+91 9988776655', '00000000-0000-0000-0000-000000000007'),

('REP-4065', 'Water Leakage', 'Water Supply & Drainage',
 'Major underground water pipeline burst leaking drinking water onto road continuously.',
 'Adyar Signal Junction, Chennai',
 13.0067, 80.2570, ST_SetSRID(ST_MakePoint(80.2570, 13.0067), 4326),
 'Pending', 5, 4,
 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?w=500&q=80',
 NOW() - INTERVAL '1 day', '+91 9444332211', '00000000-0000-0000-0000-000000000003'),

('REP-4050', 'Fallen Tree Branch', 'Highways & Roads',
 'Large tree branch hanging precariously over electric wires near hospital.',
 'Kilmauk Garden Rd, Chennai',
 13.0870, 80.2095, ST_SetSRID(ST_MakePoint(80.2095, 13.0870), 4326),
 'In Progress', 4, 3,
 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=500&q=80',
 NOW() - INTERVAL '3 days', '+91 9884011223', '00000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- ---------- PRIORITY LOGIC FUNCTION ----------

CREATE OR REPLACE FUNCTION calculate_priority_score(
  dept text, description text, duplicates_count int, created_at timestamptz
) RETURNS float AS $$
DECLARE
  dept_weight float := CASE dept
    WHEN 'Highways & Roads' THEN 5
    WHEN 'Water Supply & Drainage' THEN 5
    WHEN 'Solid Waste Management' THEN 3
    WHEN 'Electrical Department' THEN 3
    ELSE 1
  END;
  keyword_boost float := CASE
    WHEN description ILIKE '%accident%' OR description ILIKE '%flood%'
      OR description ILIKE '%school%' OR description ILIKE '%hospital%'
      OR description ILIKE '%children%' OR description ILIKE '%collapse%'
      OR description ILIKE '%electric shock%' OR description ILIKE '%fire%'
    THEN 5 ELSE 0
  END;
  days_open float := EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400;
BEGIN
  RETURN dept_weight + keyword_boost + (COALESCE(duplicates_count, 1) * 2) + (days_open * 0.5);
END;
$$ LANGUAGE plpgsql;

-- ---------- PRIORITY QUEUE VIEW ----------

CREATE OR REPLACE VIEW priority_queue AS
SELECT
  id,
  category,
  department,
  description,
  location,
  lat,
  lng,
  status,
  severity,
  duplicates_count,
  image_url,
  timestamp,
  reporter_phone,
  assigned_to,
  ROUND(calculate_priority_score(department, description, duplicates_count, timestamp)::numeric, 1) AS priority_score
FROM civic_reports
WHERE status NOT IN ('Resolved', 'Closed')
ORDER BY priority_score DESC;
