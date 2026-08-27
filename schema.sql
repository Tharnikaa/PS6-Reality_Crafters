-- Create issues table in Supabase PostgreSQL
CREATE TABLE IF NOT EXISTS issues (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  department TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location TEXT,
  report_count INT DEFAULT 1,
  nearby_facility BOOLEAN DEFAULT FALSE,
  facility_type TEXT,
  facility_name TEXT,
  facility_distance DOUBLE PRECISION,
  high_traffic_area BOOLEAN DEFAULT FALSE,
  priority_score INT DEFAULT 0,
  priority_level TEXT DEFAULT 'LOW',
  status TEXT DEFAULT 'OPEN',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create civic_reports table
CREATE TABLE IF NOT EXISTS civic_reports (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  department TEXT NOT NULL,
  description TEXT,
  location TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  status TEXT DEFAULT 'Pending',
  severity INT DEFAULT 0,
  duplicates_count INT DEFAULT 1,
  image_url TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  reporter_phone TEXT,
  issue_id INT REFERENCES issues(id)
);

-- Enable Row Level Security (RLS) and grant read/write policies for anon access
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to issues" ON issues FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to issues" ON issues FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to issues" ON issues FOR UPDATE USING (true);

ALTER TABLE civic_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON civic_reports FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON civic_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON civic_reports FOR UPDATE USING (true);
