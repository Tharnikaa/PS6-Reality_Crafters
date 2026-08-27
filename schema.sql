-- Create civic_reports table in Supabase PostgreSQL
CREATE TABLE IF NOT EXISTS civic_reports (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  department TEXT NOT NULL,
  description TEXT,
  location TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  status TEXT DEFAULT 'Pending',
  severity INT DEFAULT 3,
  duplicates_count INT DEFAULT 1,
  image_url TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  reporter_phone TEXT
);

-- Enable Row Level Security (RLS) and grant read/write policies for anon access
ALTER TABLE civic_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON civic_reports FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON civic_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON civic_reports FOR UPDATE USING (true);
