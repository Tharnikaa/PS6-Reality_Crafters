-- ============================================================
-- CivicResolve — 50 Dynamic Complaints Seed Script for Supabase
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/lqyisyqrnmfwqwkycfol/sql)
-- ============================================================

-- 1. Create table civic_reports if it does not exist
CREATE TABLE IF NOT EXISTS civic_reports (
  id                TEXT PRIMARY KEY,
  category          TEXT NOT NULL,
  department        TEXT NOT NULL,
  description       TEXT,
  location          TEXT,
  lat               DOUBLE PRECISION,
  lng               DOUBLE PRECISION,
  status            TEXT DEFAULT 'Pending',
  severity          INT  DEFAULT 2,
  duplicates_count  INT  DEFAULT 1,
  image_url         TEXT,
  timestamp         TIMESTAMPTZ DEFAULT NOW(),
  reporter_phone    TEXT,
  priority_score    INT     DEFAULT 0,
  priority_level    TEXT    DEFAULT 'LOW',
  priority          TEXT    DEFAULT 'Medium Priority',
  priority_reason   TEXT,
  priority_factors  JSONB,
  nearby_facility   BOOLEAN DEFAULT FALSE,
  facility_type     TEXT,
  facility_name     TEXT,
  facility_distance DOUBLE PRECISION,
  high_traffic_area BOOLEAN DEFAULT FALSE,
  master_issue_id   TEXT,
  issue_id          TEXT
);

-- 2. Enable RLS and public policies
ALTER TABLE civic_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON civic_reports;
DROP POLICY IF EXISTS "Allow public insert" ON civic_reports;
DROP POLICY IF EXISTS "Allow public update" ON civic_reports;
DROP POLICY IF EXISTS "Allow public delete" ON civic_reports;

CREATE POLICY "Allow public read"   ON civic_reports FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON civic_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON civic_reports FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON civic_reports FOR DELETE USING (true);

-- 3. Clear old seed data if re-running
DELETE FROM civic_reports;

-- 4. Insert 50+ dynamically structured complaints
INSERT INTO civic_reports (
  id, category, department, description, location,
  lat, lng, status, severity, duplicates_count, image_url,
  reporter_phone, priority_score, priority_level, priority,
  nearby_facility, facility_type, facility_name, facility_distance,
  high_traffic_area
) VALUES
  ('REP-2392', 'Pothole & Surface Damage', 'Highways & Roads', 'Huge crater-like pothole right outside hospital emergency entrance causing ambulance slowdown', 'Greams Road near Apollo Children''s Hospital, Thousand Lights', 13.060456, 80.249565, 'Pending', 5, 5, '/road_resolved.jpg', '+91 98401 11001', 92, 'CRITICAL', 'CRITICAL Priority', TRUE, 'HOSPITAL', 'Apollo Children''s Hospital', 45, TRUE),
  ('REP-7659', 'Pothole & Surface Damage', 'Highways & Roads', 'Dangerous deep pothole on Greams road. Two-wheelers constantly skidding here', 'Greams Road near Apollo Children''s Hospital, Thousand Lights', 13.060457, 80.249476, 'Pending', 5, 5, '/road_resolved.jpg', '+91 94440 22002', 92, 'CRITICAL', 'CRITICAL Priority', TRUE, 'HOSPITAL', 'Apollo Children''s Hospital', 45, TRUE),
  ('REP-6617', 'Pothole & Surface Damage', 'Highways & Roads', 'Broken asphalt and cave-in on Greams road near pediatric clinic', 'Greams Road near Apollo Children''s Hospital, Thousand Lights', 13.060480, 80.249515, 'Pending', 4, 5, '/road_resolved.jpg', '+91 98840 33003', 88, 'CRITICAL', 'CRITICAL Priority', TRUE, 'HOSPITAL', 'Apollo Children''s Hospital', 45, TRUE),
  ('REP-7638', 'Pothole & Surface Damage', 'Highways & Roads', 'Severe road surface damage blocking traffic flow near hospital lane', 'Greams Road near Apollo Children''s Hospital, Thousand Lights', 13.060381, 80.249485, 'Pending', 5, 5, '/road_resolved.jpg', '+91 97910 44004', 92, 'CRITICAL', 'CRITICAL Priority', TRUE, 'HOSPITAL', 'Apollo Children''s Hospital', 45, TRUE),
  ('REP-3655', 'Pothole & Surface Damage', 'Highways & Roads', 'Road crater expanding after recent rain, risk of fatal accident for bikes', 'Greams Road near Apollo Children''s Hospital, Thousand Lights', 13.060408, 80.249651, 'Pending', 5, 5, '/road_resolved.jpg', '+91 91760 55005', 92, 'CRITICAL', 'CRITICAL Priority', TRUE, 'HOSPITAL', 'Apollo Children''s Hospital', 45, TRUE),
  ('REP-6582', 'Garbage Overflow', 'Solid Waste Management', 'Massive garbage pile overflowing from municipal bin onto pedestrian walking path', 'Ranganathan Street near T. Nagar Bus Terminus', 13.041492, 80.233530, 'Pending', 3, 4, '/waste_resolved.jpg', '+91 98412 12345', 74, 'HIGH', 'HIGH Priority', TRUE, 'SCHOOL', 'T. Nagar Girls Higher Secondary School', 120, TRUE),
  ('REP-1265', 'Garbage Overflow', 'Solid Waste Management', 'Uncollected commercial waste and plastic boxes rotting on Ranganathan street', 'Ranganathan Street near T. Nagar Bus Terminus', 13.041611, 80.233615, 'Pending', 3, 4, '/waste_resolved.jpg', '+91 94451 23456', 74, 'HIGH', 'HIGH Priority', TRUE, 'SCHOOL', 'T. Nagar Girls Higher Secondary School', 120, TRUE),
  ('REP-1622', 'Garbage Overflow', 'Solid Waste Management', 'Severe garbage overflow attracting stray cattle and foul odor across market', 'Ranganathan Street near T. Nagar Bus Terminus', 13.041491, 80.233486, 'Pending', 4, 4, '/waste_resolved.jpg', '+91 98845 34567', 80, 'HIGH', 'HIGH Priority', TRUE, 'SCHOOL', 'T. Nagar Girls Higher Secondary School', 120, TRUE),
  ('REP-9216', 'Garbage Overflow', 'Solid Waste Management', 'Waste dump not cleared for 3 days, choking the street shop entrance', 'Ranganathan Street near T. Nagar Bus Terminus', 13.041539, 80.233376, 'Pending', 3, 4, '/waste_resolved.jpg', '+91 97101 45678', 74, 'HIGH', 'HIGH Priority', TRUE, 'SCHOOL', 'T. Nagar Girls Higher Secondary School', 120, TRUE),
  ('REP-9853', 'Water & Sewage Issue', 'Water & Sewage Board', 'Drinking water pipeline ruptured, high volume clean water gushing onto main road', 'Velachery Main Road near Bypass Junction', 12.980147, 80.217038, 'Pending', 4, 4, '/water_resolved.jpg', '+91 98408 90123', 82, 'HIGH', 'HIGH Priority', TRUE, 'SCHOOL', 'Velachery DAV School', 180, TRUE),
  ('REP-5904', 'Water & Sewage Issue', 'Water & Sewage Board', 'Underground water pipe burst flooding the entire left lane of bypass road', 'Velachery Main Road near Bypass Junction', 12.979930, 80.216991, 'Pending', 4, 4, '/water_resolved.jpg', '+91 94443 89012', 82, 'HIGH', 'HIGH Priority', TRUE, 'SCHOOL', 'Velachery DAV School', 180, TRUE),
  ('REP-4728', 'Water & Sewage Issue', 'Water & Sewage Board', 'Severe water leak creating an artificial pond and traffic jam on Velachery road', 'Velachery Main Road near Bypass Junction', 12.979881, 80.217110, 'Pending', 4, 4, '/water_resolved.jpg', '+91 98842 78901', 82, 'HIGH', 'HIGH Priority', TRUE, 'SCHOOL', 'Velachery DAV School', 180, TRUE),
  ('REP-2235', 'Water & Sewage Issue', 'Water & Sewage Board', 'Pipeline leakage weakening road foundation near bypass junction', 'Velachery Main Road near Bypass Junction', 12.979855, 80.217035, 'Pending', 3, 4, '/water_resolved.jpg', '+91 97909 67890', 76, 'HIGH', 'HIGH Priority', TRUE, 'SCHOOL', 'Velachery DAV School', 180, TRUE),
  ('REP-5532', 'Broken Streetlight', 'Electrical Department', 'Row of 4 LED streetlights completely dark along Poonamallee High Road', 'Poonamallee High Road near Madras Medical College, Park Town', 13.081616, 80.272105, 'Pending', 4, 3, '/light_resolved.jpg', '+91 98400 56789', 85, 'CRITICAL', 'CRITICAL Priority', TRUE, 'HOSPITAL', 'Madras Medical College', 30, TRUE),
  ('REP-4503', 'Broken Streetlight', 'Electrical Department', 'Zero illumination at night outside Medical college gate, unsafe for nursing staff', 'Poonamallee High Road near Madras Medical College, Park Town', 13.081599, 80.272099, 'Pending', 4, 3, '/light_resolved.jpg', '+91 94449 45678', 85, 'CRITICAL', 'CRITICAL Priority', TRUE, 'HOSPITAL', 'Madras Medical College', 30, TRUE),
  ('REP-4563', 'Broken Streetlight', 'Electrical Department', 'Damaged electrical cable box and non-functioning street lamp near junction', 'Poonamallee High Road near Madras Medical College, Park Town', 13.081593, 80.272057, 'Pending', 4, 3, '/light_resolved.jpg', '+91 98841 34567', 85, 'CRITICAL', 'CRITICAL Priority', TRUE, 'HOSPITAL', 'Madras Medical College', 30, TRUE),
  ('REP-6909', 'Pothole & Surface Damage', 'Highways & Roads', 'Multiple deep potholes right at the ramp ascending towards Guindy flyover', 'GST Road near Kathipara Junction, Guindy', 13.006721, 80.202883, 'Pending', 4, 3, '/road_resolved.jpg', '+91 98415 67890', 80, 'HIGH', 'HIGH Priority', FALSE, NULL, NULL, NULL, TRUE),
  ('REP-6453', 'Pothole & Surface Damage', 'Highways & Roads', 'Damaged expansion joint and asphalt pits on GST road near Kathipara circle', 'GST Road near Kathipara Junction, Guindy', 13.006696, 80.202997, 'Pending', 3, 3, '/road_resolved.jpg', '+91 94445 78901', 75, 'HIGH', 'HIGH Priority', FALSE, NULL, NULL, NULL, TRUE),
  ('REP-8413', 'Pothole & Surface Damage', 'Highways & Roads', 'Dangerous road crater at high-speed flyover merge point', 'GST Road near Kathipara Junction, Guindy', 13.006753, 80.203024, 'Pending', 5, 3, '/road_resolved.jpg', '+91 98844 89012', 90, 'CRITICAL', 'CRITICAL Priority', FALSE, NULL, NULL, NULL, TRUE),
  ('REP-7597', 'Water & Sewage Issue', 'Water & Sewage Board', 'Blocked manhole overflowing black sewage water across service road near MIT bridge', 'GST Road near Chromepet Flyover & MIT Bridge', 12.951593, 80.141511, 'Pending', 3, 3, '/water_resolved.jpg', '+91 98402 34567', 65, 'MEDIUM', 'MEDIUM Priority', FALSE, NULL, NULL, NULL, TRUE),
  ('REP-9381', 'Water & Sewage Issue', 'Water & Sewage Board', 'Stagnant sewage water giving unbearable stench near Chromepet railway station', 'GST Road near Chromepet Flyover & MIT Bridge', 12.951499, 80.141561, 'Pending', 3, 3, '/water_resolved.jpg', '+91 94446 45678', 65, 'MEDIUM', 'MEDIUM Priority', FALSE, NULL, NULL, NULL, TRUE),
  ('REP-9371', 'Water & Sewage Issue', 'Water & Sewage Board', 'Drainage blockage spilling onto pedestrian walkway near college bus stop', 'GST Road near Chromepet Flyover & MIT Bridge', 12.951620, 80.141457, 'Pending', 4, 3, '/water_resolved.jpg', '+91 98847 56789', 72, 'HIGH', 'HIGH Priority', FALSE, NULL, NULL, NULL, TRUE),
  ('REP-8689', 'Garbage Overflow', 'Solid Waste Management', 'Construction debris and coconut shells dumped illegally near temple tank perimeter', 'Luz Church Road near Mylapore Tank', 13.036834, 80.267506, 'Pending', 3, 3, '/waste_resolved.jpg', '+91 98406 11223', 50, 'MEDIUM', 'MEDIUM Priority', FALSE, NULL, NULL, NULL, FALSE),
  ('REP-3647', 'Garbage Overflow', 'Solid Waste Management', 'Solid waste heap uncleared for 48 hours near Luz corner vegetable shops', 'Luz Church Road near Mylapore Tank', 13.036878, 80.267640, 'Pending', 3, 3, '/waste_resolved.jpg', '+91 94447 22334', 50, 'MEDIUM', 'MEDIUM Priority', FALSE, NULL, NULL, NULL, FALSE),
  ('REP-5226', 'Garbage Overflow', 'Solid Waste Management', 'Debris and plastic bags overflowing from community waste bins', 'Luz Church Road near Mylapore Tank', 13.036829, 80.267547, 'Pending', 4, 3, '/waste_resolved.jpg', '+91 98848 33445', 58, 'MEDIUM', 'MEDIUM Priority', FALSE, NULL, NULL, NULL, FALSE),
  ('REP-9442', 'Broken Streetlight', 'Electrical Department', 'Flickering and dead sodium vapor streetlamp at busy pedestrian crossing', 'Lattice Bridge (LB) Road near Adyar Signal', 13.001176, 80.256430, 'Pending', 3, 2, '/light_resolved.jpg', '+91 98418 44556', 70, 'HIGH', 'HIGH Priority', FALSE, NULL, NULL, NULL, TRUE),
  ('REP-4949', 'Broken Streetlight', 'Electrical Department', 'Pitch black road stretch near LB road signal causing near-misses for cyclists', 'Lattice Bridge (LB) Road near Adyar Signal', 13.001288, 80.256521, 'Pending', 3, 2, '/light_resolved.jpg', '+91 94448 55667', 70, 'HIGH', 'HIGH Priority', FALSE, NULL, NULL, NULL, TRUE),
  ('REP-3971', 'Pothole & Surface Damage', 'Highways & Roads', 'Sharp pothole edges puncturing car tires near Sterling road turning', 'Nungambakkam High Road near Sterling Road Junction', 13.062679, 80.240556, 'Pending', 3, 2, '/road_resolved.jpg', '+91 98409 66778', 72, 'HIGH', 'HIGH Priority', FALSE, NULL, NULL, NULL, TRUE),
  ('REP-1175', 'Pothole & Surface Damage', 'Highways & Roads', 'Sunken stormwater drain grate creating sudden dip on main highway', 'Nungambakkam High Road near Sterling Road Junction', 13.062596, 80.240472, 'Pending', 3, 2, '/road_resolved.jpg', '+91 94452 77889', 72, 'HIGH', 'HIGH Priority', FALSE, NULL, NULL, NULL, TRUE),
  ('REP-2650', 'Water & Sewage Issue', 'Water & Sewage Board', 'Broken manhole slab with exposed iron rebar endangering trucks and loading tempos', 'Koyambedu Wholesale Market Main Entrance Road', 13.069435, 80.194839, 'Pending', 4, 3, '/water_resolved.jpg', '+91 98410 88990', 60, 'MEDIUM', 'MEDIUM Priority', FALSE, NULL, NULL, NULL, FALSE),
  ('REP-1613', 'Water & Sewage Issue', 'Water & Sewage Board', 'Open drainage ditch near flower market gate with no warning barricade', 'Koyambedu Wholesale Market Main Entrance Road', 13.069502, 80.194693, 'Pending', 3, 3, '/water_resolved.jpg', '+91 94453 99001', 55, 'MEDIUM', 'MEDIUM Priority', FALSE, NULL, NULL, NULL, FALSE),
  ('REP-3561', 'Water & Sewage Issue', 'Water & Sewage Board', 'Damaged culvert causing sewage backflow near wholesale vegetable gate', 'Koyambedu Wholesale Market Main Entrance Road', 13.069504, 80.194758, 'Pending', 3, 3, '/water_resolved.jpg', '+91 98849 00112', 55, 'MEDIUM', 'MEDIUM Priority', FALSE, NULL, NULL, NULL, FALSE),
  ('REP-1432', 'Garbage Overflow', 'Solid Waste Management', 'E-waste and cafeteria food garbage dumped on OMR service lane near tech park', 'OMR IT Corridor near Sholinganallur Signal', 12.900944, 80.227899, 'Pending', 3, 2, '/waste_resolved.jpg', '+91 98413 11224', 70, 'HIGH', 'HIGH Priority', FALSE, NULL, NULL, NULL, TRUE),
  ('REP-3434', 'Garbage Overflow', 'Solid Waste Management', 'Overflowing dumpsters spilling onto bike lane on IT expressway', 'OMR IT Corridor near Sholinganallur Signal', 12.900926, 80.227945, 'Pending', 3, 2, '/waste_resolved.jpg', '+91 94454 22335', 70, 'HIGH', 'HIGH Priority', FALSE, NULL, NULL, NULL, TRUE),
  ('REP-5583', 'Broken Streetlight', 'Electrical Department', 'Overhead street lighting pole leaning dangerously over Arcot road', 'Arcot Road near Porur Roundtana Junction', 13.038214, 80.156563, 'Pending', 4, 2, '/light_resolved.jpg', '+91 98414 33446', 78, 'HIGH', 'HIGH Priority', FALSE, NULL, NULL, NULL, TRUE),
  ('REP-4283', 'Broken Streetlight', 'Electrical Department', 'Exposed high voltage wiring at the base of street lamp post', 'Arcot Road near Porur Roundtana Junction', 13.038256, 80.156430, 'Pending', 3, 2, '/light_resolved.jpg', '+91 94455 44557', 72, 'HIGH', 'HIGH Priority', FALSE, NULL, NULL, NULL, TRUE),
  ('REP-6112', 'Water & Sewage Issue', 'Water & Sewage Board', 'Major municipal water valve leaking thousands of liters across market entrance', 'Shanmugam Road near Tambaram West Bus Stand', 12.924845, 80.099928, 'Pending', 3, 2, '/water_resolved.jpg', '+91 98416 55668', 70, 'HIGH', 'HIGH Priority', FALSE, NULL, NULL, NULL, TRUE),
  ('REP-3036', 'Water & Sewage Issue', 'Water & Sewage Board', 'Drinking water distribution line split open near railway foot overbridge', 'Shanmugam Road near Tambaram West Bus Stand', 12.924986, 80.100011, 'Pending', 4, 2, '/water_resolved.jpg', '+91 94456 66779', 78, 'HIGH', 'HIGH Priority', FALSE, NULL, NULL, NULL, TRUE),
  ('REP-9719', 'Pothole & Surface Damage', 'Highways & Roads', 'Cracked concrete slab on platform exit road causing pedestrian trips', 'Gandhi Irwin Road near Egmore Railway Station', 13.078329, 80.260832, 'Pending', 3, 1, '/road_resolved.jpg', '+91 98417 77880', 70, 'HIGH', 'HIGH Priority', FALSE, NULL, NULL, NULL, TRUE),
  ('REP-1446', 'Garbage Overflow', 'Solid Waste Management', 'Foul garbage dump outside parcel office building attracting stray dogs', 'Gandhi Irwin Road near Egmore Railway Station', 13.078279, 80.260772, 'Pending', 3, 1, '/waste_resolved.jpg', '+91 94457 88991', 70, 'HIGH', 'HIGH Priority', FALSE, NULL, NULL, NULL, TRUE),
  ('REP-4938', 'Pothole & Surface Damage', 'Highways & Roads', 'Pothole cluster under construction metro pier on Arcot road', 'Arcot Road near Porur Roundtana Junction', 13.038279, 80.156437, 'Pending', 3, 1, '/road_resolved.jpg', '+91 98419 99002', 72, 'HIGH', 'HIGH Priority', FALSE, NULL, NULL, NULL, TRUE),
  ('REP-4842', 'Broken Streetlight', 'Electrical Department', 'High mast light out of order at Sholinganallur main roundabout', 'OMR IT Corridor near Sholinganallur Signal', 12.901028, 80.228025, 'Pending', 3, 1, '/light_resolved.jpg', '+91 94458 00113', 70, 'HIGH', 'HIGH Priority', FALSE, NULL, NULL, NULL, TRUE),
  ('REP-4417', 'Garbage Overflow', 'Solid Waste Management', 'Foul-smelling rotten vegetable debris blocking truck bay 4', 'Koyambedu Wholesale Market Main Entrance Road', 13.069323, 80.194675, 'Pending', 3, 1, '/waste_resolved.jpg', '+91 98420 11225', 50, 'MEDIUM', 'MEDIUM Priority', FALSE, NULL, NULL, NULL, FALSE),
  ('REP-4681', 'Broken Streetlight', 'Electrical Department', 'Street lamp pole damaged after tree branch fall during storm', 'Nungambakkam High Road near Sterling Road Junction', 13.062524, 80.240488, 'Pending', 3, 1, '/light_resolved.jpg', '+91 94459 22336', 70, 'HIGH', 'HIGH Priority', FALSE, NULL, NULL, NULL, TRUE),
  ('REP-2772', 'Water & Sewage Issue', 'Water & Sewage Board', 'Sewage inspection chamber overflowing into stormwater gutter', 'Lattice Bridge (LB) Road near Adyar Signal', 13.001263, 80.256443, 'Pending', 3, 1, '/water_resolved.jpg', '+91 98421 33447', 70, 'HIGH', 'HIGH Priority', FALSE, NULL, NULL, NULL, TRUE),
  ('REP-7117', 'Pothole & Surface Damage', 'Highways & Roads', 'Deep trench dug for utility cables left unpaved with sharp gravel', 'Luz Church Road near Mylapore Tank', 13.036937, 80.267527, 'Pending', 3, 1, '/road_resolved.jpg', '+91 94460 44558', 45, 'MEDIUM', 'MEDIUM Priority', FALSE, NULL, NULL, NULL, FALSE),
  ('REP-2542', 'Broken Streetlight', 'Electrical Department', 'Street light circuit breaker tripping every night leaving entire stretch dark', 'GST Road near Chromepet Flyover & MIT Bridge', 12.951488, 80.141537, 'Pending', 3, 1, '/light_resolved.jpg', '+91 98422 55669', 60, 'MEDIUM', 'MEDIUM Priority', FALSE, NULL, NULL, NULL, TRUE),
  ('REP-1833', 'Pothole & Surface Damage', 'Highways & Roads', 'Fallen road divider curb stone obstructing left turn into airport lane', 'GST Road near Kathipara Junction, Guindy', 13.006779, 80.203024, 'Pending', 3, 1, '/road_resolved.jpg', '+91 94461 66780', 75, 'HIGH', 'HIGH Priority', FALSE, NULL, NULL, NULL, TRUE),
  ('REP-5593', 'Water & Sewage Issue', 'Water & Sewage Board', 'Broken water fountain and leaking supply pipe inside public hospital campus road', 'Poonamallee High Road near Madras Medical College, Park Town', 13.081635, 80.271854, 'Pending', 4, 1, '/water_resolved.jpg', '+91 98423 77891', 82, 'CRITICAL', 'CRITICAL Priority', TRUE, 'HOSPITAL', 'Madras Medical College', 30, TRUE),
  ('REP-4379', 'Garbage Overflow', 'Solid Waste Management', 'Garbage bins overturned by stray animals scattering plastic onto road', 'Velachery Main Road near Bypass Junction', 12.979899, 80.217068, 'Pending', 3, 1, '/waste_resolved.jpg', '+91 94462 88902', 72, 'HIGH', 'HIGH Priority', TRUE, 'SCHOOL', 'Velachery DAV School', 180, TRUE),
  ('REP-5787', 'Broken Streetlight', 'Electrical Department', 'Exposed live streetlight cable near bus stop shelter where commuters wait', 'Ranganathan Street near T. Nagar Bus Terminus', 13.041415, 80.233372, 'Pending', 3, 1, '/light_resolved.jpg', '+91 98424 99013', 60, 'MEDIUM', 'MEDIUM Priority', TRUE, 'SCHOOL', 'T. Nagar Girls Higher Secondary School', 120, TRUE);
