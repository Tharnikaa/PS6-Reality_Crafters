-- ============================================================
-- CivicResolve — Supabase PostgreSQL Schema
-- ============================================================
-- Run this entire file once in the Supabase SQL Editor.
-- It is safe to run multiple times — IF NOT EXISTS prevents
-- errors if the table or columns already exist.
-- ============================================================

-- ── Table: civic_reports ─────────────────────────────────────
-- All citizen issue reports are stored here.
-- Priority fields are calculated by the backend triage pipeline
-- and stored directly on each row (no separate issues table).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS civic_reports (
  id               TEXT PRIMARY KEY,
  category         TEXT NOT NULL,
  department       TEXT NOT NULL,
  description      TEXT,
  location         TEXT,
  lat              DOUBLE PRECISION,
  lng              DOUBLE PRECISION,
  status           TEXT DEFAULT 'Pending',

  -- Severity drives the colour badge in the frontend (1–5).
  -- Derived from priority_level by the backend — never random.
  severity         INT DEFAULT 2,

  -- How many open reports exist for the same issue cluster.
  -- All reports in a cluster share the same value.
  duplicates_count INT DEFAULT 1,

  image_url        TEXT,
  timestamp        TIMESTAMPTZ DEFAULT NOW(),
  reporter_phone   TEXT,

  -- ── Priority fields (calculated by triage pipeline) ──────
  -- Final weighted score (0–100).
  priority_score   INT DEFAULT 0,

  -- CRITICAL / HIGH / MEDIUM / LOW
  priority_level   TEXT DEFAULT 'LOW',

  -- TRUE if a school or hospital is within 500 metres.
  nearby_facility  BOOLEAN DEFAULT FALSE,

  -- SCHOOL or HOSPITAL
  facility_type    TEXT,

  -- Human-readable facility name
  facility_name    TEXT,

  -- Distance to closest facility in metres (rounded integer)
  facility_distance DOUBLE PRECISION,

  -- TRUE if the location string contains a major-road keyword
  -- (salai, bypass, highway, main road, expressway, arterial).
  -- This is road-TYPE classification, NOT real-time traffic.
  high_traffic_area BOOLEAN DEFAULT FALSE
);

-- ── ALTER TABLE — add priority columns if running on an ──────
-- existing database that was created before this update.
-- These statements are safe to run even if the columns exist.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE civic_reports ADD COLUMN IF NOT EXISTS priority_score    INT              DEFAULT 0;
ALTER TABLE civic_reports ADD COLUMN IF NOT EXISTS priority_level    TEXT             DEFAULT 'LOW';
ALTER TABLE civic_reports ADD COLUMN IF NOT EXISTS nearby_facility   BOOLEAN          DEFAULT FALSE;
ALTER TABLE civic_reports ADD COLUMN IF NOT EXISTS facility_type     TEXT;
ALTER TABLE civic_reports ADD COLUMN IF NOT EXISTS facility_name     TEXT;
ALTER TABLE civic_reports ADD COLUMN IF NOT EXISTS facility_distance DOUBLE PRECISION;
ALTER TABLE civic_reports ADD COLUMN IF NOT EXISTS high_traffic_area BOOLEAN          DEFAULT FALSE;
ALTER TABLE civic_reports ADD COLUMN IF NOT EXISTS issue_id          TEXT;

-- ── Table: staff_details ──────────────────────────────────────
-- Stores municipal department staff / officials and authentication passwords.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_details (
  id           TEXT PRIMARY KEY,                  -- e.g. STF-101
  name         TEXT NOT NULL,                     -- Full staff name
  email        TEXT UNIQUE NOT NULL,              -- Official email address
  password     TEXT NOT NULL,                     -- Authentication password
  department   TEXT NOT NULL,                     -- Responsible city department
  role         TEXT DEFAULT 'Official',           -- Official / Supervisor / Admin
  zone         TEXT DEFAULT 'Zone A',             -- Assigned city zone (Zone A, Zone B, etc.)
  phone        TEXT,                              -- Contact phone number
  active       BOOLEAN DEFAULT TRUE,              -- Employment active status
  created_at   TIMESTAMPTZ DEFAULT NOW()          -- Account creation timestamp
);

ALTER TABLE staff_details ENABLE ROW LEVEL SECURITY;

-- ── Row Level Security (RLS) ──────────────────────────────────
-- Allows the frontend/backend to query staff_details via Supabase anon key
-- ─────────────────────────────────────────────────────────────
ALTER TABLE civic_reports ENABLE ROW LEVEL SECURITY;

-- Only create policies if they do not already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'civic_reports' AND policyname = 'Allow public read access'
  ) THEN
    CREATE POLICY "Allow public read access"
      ON civic_reports FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'civic_reports' AND policyname = 'Allow public insert access'
  ) THEN
    CREATE POLICY "Allow public insert access"
      ON civic_reports FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'civic_reports' AND policyname = 'Allow public update access'
  ) THEN
    CREATE POLICY "Allow public update access"
      ON civic_reports FOR UPDATE USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'civic_reports' AND policyname = 'Allow public delete access'
  ) THEN
    CREATE POLICY "Allow public delete access"
      ON civic_reports FOR DELETE USING (true);
  END IF;

  -- staff_details policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'staff_details' AND policyname = 'Allow public read staff access'
  ) THEN
    CREATE POLICY "Allow public read staff access"
      ON staff_details FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'staff_details' AND policyname = 'Allow public insert staff access'
  ) THEN
    CREATE POLICY "Allow public insert staff access"
      ON staff_details FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'staff_details' AND policyname = 'Allow public update staff access'
  ) THEN
    CREATE POLICY "Allow public update staff access"
      ON staff_details FOR UPDATE USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'staff_details' AND policyname = 'Allow public delete staff access'
  ) THEN
    CREATE POLICY "Allow public delete staff access"
      ON staff_details FOR DELETE USING (true);
  END IF;
END
$$;
