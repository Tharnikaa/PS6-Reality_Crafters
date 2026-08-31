const fs = require('fs');
const path = require('path');

const HOTSPOTS = {
  apollo_hospital: { lat: 13.0604, lng: 80.2496, name: "Greams Road near Apollo Children's Hospital, Thousand Lights", fac_type: 'HOSPITAL', fac_name: "Apollo Children's Hospital", fac_dist: 45 },
  tnagar_market:   { lat: 13.0415, lng: 80.2335, name: "Ranganathan Street near T. Nagar Bus Terminus", fac_type: 'SCHOOL', fac_name: "T. Nagar Girls Higher Secondary School", fac_dist: 120 },
  velachery_hub:   { lat: 12.9800, lng: 80.2170, name: "Velachery Main Road near Bypass Junction", fac_type: 'SCHOOL', fac_name: "Velachery DAV School", fac_dist: 180 },
  mmc_hospital:    { lat: 13.0815, lng: 80.2720, name: "Poonamallee High Road near Madras Medical College, Park Town", fac_type: 'HOSPITAL', fac_name: "Madras Medical College", fac_dist: 30 },
  guindy_kathipara:{ lat: 13.0067, lng: 80.2030, name: "GST Road near Kathipara Junction, Guindy", fac_type: null, fac_name: null, fac_dist: null },
  chromepet_gst:   { lat: 12.9516, lng: 80.1415, name: "GST Road near Chromepet Flyover & MIT Bridge", fac_type: null, fac_name: null, fac_dist: null },
  mylapore_luz:    { lat: 13.0368, lng: 80.2676, name: "Luz Church Road near Mylapore Tank", fac_type: null, fac_name: null, fac_dist: null },
  adyar_signal:    { lat: 13.0012, lng: 80.2565, name: "Lattice Bridge (LB) Road near Adyar Signal", fac_type: null, fac_name: null, fac_dist: null },
  nungambakkam:    { lat: 13.0626, lng: 80.2405, name: "Nungambakkam High Road near Sterling Road Junction", fac_type: null, fac_name: null, fac_dist: null },
  egmore_station:  { lat: 13.0784, lng: 80.2607, name: "Gandhi Irwin Road near Egmore Railway Station", fac_type: null, fac_name: null, fac_dist: null },
  tambaram_mkt:    { lat: 12.9249, lng: 80.1000, name: "Shanmugam Road near Tambaram West Bus Stand", fac_type: null, fac_name: null, fac_dist: null },
  koyambedu_mkt:   { lat: 13.0694, lng: 80.1948, name: "Koyambedu Wholesale Market Main Entrance Road", fac_type: null, fac_name: null, fac_dist: null },
  sholinganallur:  { lat: 12.9010, lng: 80.2279, name: "OMR IT Corridor near Sholinganallur Signal", fac_type: null, fac_name: null, fac_dist: null },
  porur_junction:  { lat: 13.0382, lng: 80.1565, name: "Arcot Road near Porur Roundtana Junction", fac_type: null, fac_name: null, fac_dist: null }
};

const COMPLAINT_TEMPLATES = [
  { id: 'REP-2392', spot: 'apollo_hospital', desc: 'Huge crater-like pothole right outside hospital emergency entrance causing ambulance slowdown', cat: 'Pothole & Surface Damage', dept: 'Highways & Roads', sev: 5, dup: 5, priLevel: 'CRITICAL', priScore: 92, img: '/road_resolved.jpg', phone: '+91 98401 11001', high_traffic: true },
  { id: 'REP-7659', spot: 'apollo_hospital', desc: 'Dangerous deep pothole on Greams road. Two-wheelers constantly skidding here', cat: 'Pothole & Surface Damage', dept: 'Highways & Roads', sev: 5, dup: 5, priLevel: 'CRITICAL', priScore: 92, img: '/road_resolved.jpg', phone: '+91 94440 22002', high_traffic: true },
  { id: 'REP-6617', spot: 'apollo_hospital', desc: 'Broken asphalt and cave-in on Greams road near pediatric clinic', cat: 'Pothole & Surface Damage', dept: 'Highways & Roads', sev: 4, dup: 5, priLevel: 'CRITICAL', priScore: 88, img: '/road_resolved.jpg', phone: '+91 98840 33003', high_traffic: true },
  { id: 'REP-7638', spot: 'apollo_hospital', desc: 'Severe road surface damage blocking traffic flow near hospital lane', cat: 'Pothole & Surface Damage', dept: 'Highways & Roads', sev: 5, dup: 5, priLevel: 'CRITICAL', priScore: 92, img: '/road_resolved.jpg', phone: '+91 97910 44004', high_traffic: true },
  { id: 'REP-3655', spot: 'apollo_hospital', desc: 'Road crater expanding after recent rain, risk of fatal accident for bikes', cat: 'Pothole & Surface Damage', dept: 'Highways & Roads', sev: 5, dup: 5, priLevel: 'CRITICAL', priScore: 92, img: '/road_resolved.jpg', phone: '+91 91760 55005', high_traffic: true },

  { id: 'REP-6582', spot: 'tnagar_market', desc: 'Massive garbage pile overflowing from municipal bin onto pedestrian walking path', cat: 'Garbage Overflow', dept: 'Solid Waste Management', sev: 3, dup: 4, priLevel: 'HIGH', priScore: 74, img: '/waste_resolved.jpg', phone: '+91 98412 12345', high_traffic: true },
  { id: 'REP-1265', spot: 'tnagar_market', desc: 'Uncollected commercial waste and plastic boxes rotting on Ranganathan street', cat: 'Garbage Overflow', dept: 'Solid Waste Management', sev: 3, dup: 4, priLevel: 'HIGH', priScore: 74, img: '/waste_resolved.jpg', phone: '+91 94451 23456', high_traffic: true },
  { id: 'REP-1622', spot: 'tnagar_market', desc: 'Severe garbage overflow attracting stray cattle and foul odor across market', cat: 'Garbage Overflow', dept: 'Solid Waste Management', sev: 4, dup: 4, priLevel: 'HIGH', priScore: 80, img: '/waste_resolved.jpg', phone: '+91 98845 34567', high_traffic: true },
  { id: 'REP-9216', spot: 'tnagar_market', desc: 'Waste dump not cleared for 3 days, choking the street shop entrance', cat: 'Garbage Overflow', dept: 'Solid Waste Management', sev: 3, dup: 4, priLevel: 'HIGH', priScore: 74, img: '/waste_resolved.jpg', phone: '+91 97101 45678', high_traffic: true },

  { id: 'REP-9853', spot: 'velachery_hub', desc: 'Drinking water pipeline ruptured, high volume clean water gushing onto main road', cat: 'Water & Sewage Issue', dept: 'Water & Sewage Board', sev: 4, dup: 4, priLevel: 'HIGH', priScore: 82, img: '/water_resolved.jpg', phone: '+91 98408 90123', high_traffic: true },
  { id: 'REP-5904', spot: 'velachery_hub', desc: 'Underground water pipe burst flooding the entire left lane of bypass road', cat: 'Water & Sewage Issue', dept: 'Water & Sewage Board', sev: 4, dup: 4, priLevel: 'HIGH', priScore: 82, img: '/water_resolved.jpg', phone: '+91 94443 89012', high_traffic: true },
  { id: 'REP-4728', spot: 'velachery_hub', desc: 'Severe water leak creating an artificial pond and traffic jam on Velachery road', cat: 'Water & Sewage Issue', dept: 'Water & Sewage Board', sev: 4, dup: 4, priLevel: 'HIGH', priScore: 82, img: '/water_resolved.jpg', phone: '+91 98842 78901', high_traffic: true },
  { id: 'REP-2235', spot: 'velachery_hub', desc: 'Pipeline leakage weakening road foundation near bypass junction', cat: 'Water & Sewage Issue', dept: 'Water & Sewage Board', sev: 3, dup: 4, priLevel: 'HIGH', priScore: 76, img: '/water_resolved.jpg', phone: '+91 97909 67890', high_traffic: true },

  { id: 'REP-5532', spot: 'mmc_hospital', desc: 'Row of 4 LED streetlights completely dark along Poonamallee High Road', cat: 'Broken Streetlight', dept: 'Electrical Department', sev: 4, dup: 3, priLevel: 'CRITICAL', priScore: 85, img: '/light_resolved.jpg', phone: '+91 98400 56789', high_traffic: true },
  { id: 'REP-4503', spot: 'mmc_hospital', desc: 'Zero illumination at night outside Medical college gate, unsafe for nursing staff', cat: 'Broken Streetlight', dept: 'Electrical Department', sev: 4, dup: 3, priLevel: 'CRITICAL', priScore: 85, img: '/light_resolved.jpg', phone: '+91 94449 45678', high_traffic: true },
  { id: 'REP-4563', spot: 'mmc_hospital', desc: 'Damaged electrical cable box and non-functioning street lamp near junction', cat: 'Broken Streetlight', dept: 'Electrical Department', sev: 4, dup: 3, priLevel: 'CRITICAL', priScore: 85, img: '/light_resolved.jpg', phone: '+91 98841 34567', high_traffic: true },

  { id: 'REP-6909', spot: 'guindy_kathipara', desc: 'Multiple deep potholes right at the ramp ascending towards Guindy flyover', cat: 'Pothole & Surface Damage', dept: 'Highways & Roads', sev: 4, dup: 3, priLevel: 'HIGH', priScore: 80, img: '/road_resolved.jpg', phone: '+91 98415 67890', high_traffic: true },
  { id: 'REP-6453', spot: 'guindy_kathipara', desc: 'Damaged expansion joint and asphalt pits on GST road near Kathipara circle', cat: 'Pothole & Surface Damage', dept: 'Highways & Roads', sev: 3, dup: 3, priLevel: 'HIGH', priScore: 75, img: '/road_resolved.jpg', phone: '+91 94445 78901', high_traffic: true },
  { id: 'REP-8413', spot: 'guindy_kathipara', desc: 'Dangerous road crater at high-speed flyover merge point', cat: 'Pothole & Surface Damage', dept: 'Highways & Roads', sev: 5, dup: 3, priLevel: 'CRITICAL', priScore: 90, img: '/road_resolved.jpg', phone: '+91 98844 89012', high_traffic: true },

  { id: 'REP-7597', spot: 'chromepet_gst', desc: 'Blocked manhole overflowing black sewage water across service road near MIT bridge', cat: 'Water & Sewage Issue', dept: 'Water & Sewage Board', sev: 3, dup: 3, priLevel: 'MEDIUM', priScore: 65, img: '/water_resolved.jpg', phone: '+91 98402 34567', high_traffic: true },
  { id: 'REP-9381', spot: 'chromepet_gst', desc: 'Stagnant sewage water giving unbearable stench near Chromepet railway station', cat: 'Water & Sewage Issue', dept: 'Water & Sewage Board', sev: 3, dup: 3, priLevel: 'MEDIUM', priScore: 65, img: '/water_resolved.jpg', phone: '+91 94446 45678', high_traffic: true },
  { id: 'REP-9371', spot: 'chromepet_gst', desc: 'Drainage blockage spilling onto pedestrian walkway near college bus stop', cat: 'Water & Sewage Issue', dept: 'Water & Sewage Board', sev: 4, dup: 3, priLevel: 'HIGH', priScore: 72, img: '/water_resolved.jpg', phone: '+91 98847 56789', high_traffic: true },

  { id: 'REP-8689', spot: 'mylapore_luz', desc: 'Construction debris and coconut shells dumped illegally near temple tank perimeter', cat: 'Garbage Overflow', dept: 'Solid Waste Management', sev: 3, dup: 3, priLevel: 'MEDIUM', priScore: 50, img: '/waste_resolved.jpg', phone: '+91 98406 11223', high_traffic: false },
  { id: 'REP-3647', spot: 'mylapore_luz', desc: 'Solid waste heap uncleared for 48 hours near Luz corner vegetable shops', cat: 'Garbage Overflow', dept: 'Solid Waste Management', sev: 3, dup: 3, priLevel: 'MEDIUM', priScore: 50, img: '/waste_resolved.jpg', phone: '+91 94447 22334', high_traffic: false },
  { id: 'REP-5226', spot: 'mylapore_luz', desc: 'Debris and plastic bags overflowing from community waste bins', cat: 'Garbage Overflow', dept: 'Solid Waste Management', sev: 4, dup: 3, priLevel: 'MEDIUM', priScore: 58, img: '/waste_resolved.jpg', phone: '+91 98848 33445', high_traffic: false },

  { id: 'REP-9442', spot: 'adyar_signal', desc: 'Flickering and dead sodium vapor streetlamp at busy pedestrian crossing', cat: 'Broken Streetlight', dept: 'Electrical Department', sev: 3, dup: 2, priLevel: 'HIGH', priScore: 70, img: '/light_resolved.jpg', phone: '+91 98418 44556', high_traffic: true },
  { id: 'REP-4949', spot: 'adyar_signal', desc: 'Pitch black road stretch near LB road signal causing near-misses for cyclists', cat: 'Broken Streetlight', dept: 'Electrical Department', sev: 3, dup: 2, priLevel: 'HIGH', priScore: 70, img: '/light_resolved.jpg', phone: '+91 94448 55667', high_traffic: true },

  { id: 'REP-3971', spot: 'nungambakkam', desc: 'Sharp pothole edges puncturing car tires near Sterling road turning', cat: 'Pothole & Surface Damage', dept: 'Highways & Roads', sev: 3, dup: 2, priLevel: 'HIGH', priScore: 72, img: '/road_resolved.jpg', phone: '+91 98409 66778', high_traffic: true },
  { id: 'REP-1175', spot: 'nungambakkam', desc: 'Sunken stormwater drain grate creating sudden dip on main highway', cat: 'Pothole & Surface Damage', dept: 'Highways & Roads', sev: 3, dup: 2, priLevel: 'HIGH', priScore: 72, img: '/road_resolved.jpg', phone: '+91 94452 77889', high_traffic: true },

  { id: 'REP-2650', spot: 'koyambedu_mkt', desc: 'Broken manhole slab with exposed iron rebar endangering trucks and loading tempos', cat: 'Water & Sewage Issue', dept: 'Water & Sewage Board', sev: 4, dup: 3, priLevel: 'MEDIUM', priScore: 60, img: '/water_resolved.jpg', phone: '+91 98410 88990', high_traffic: false },
  { id: 'REP-1613', spot: 'koyambedu_mkt', desc: 'Open drainage ditch near flower market gate with no warning barricade', cat: 'Water & Sewage Issue', dept: 'Water & Sewage Board', sev: 3, dup: 3, priLevel: 'MEDIUM', priScore: 55, img: '/water_resolved.jpg', phone: '+91 94453 99001', high_traffic: false },
  { id: 'REP-3561', spot: 'koyambedu_mkt', desc: 'Damaged culvert causing sewage backflow near wholesale vegetable gate', cat: 'Water & Sewage Issue', dept: 'Water & Sewage Board', sev: 3, dup: 3, priLevel: 'MEDIUM', priScore: 55, img: '/water_resolved.jpg', phone: '+91 98849 00112', high_traffic: false },

  { id: 'REP-1432', spot: 'sholinganallur', desc: 'E-waste and cafeteria food garbage dumped on OMR service lane near tech park', cat: 'Garbage Overflow', dept: 'Solid Waste Management', sev: 3, dup: 2, priLevel: 'HIGH', priScore: 70, img: '/waste_resolved.jpg', phone: '+91 98413 11224', high_traffic: true },
  { id: 'REP-3434', spot: 'sholinganallur', desc: 'Overflowing dumpsters spilling onto bike lane on IT expressway', cat: 'Garbage Overflow', dept: 'Solid Waste Management', sev: 3, dup: 2, priLevel: 'HIGH', priScore: 70, img: '/waste_resolved.jpg', phone: '+91 94454 22335', high_traffic: true },

  { id: 'REP-5583', spot: 'porur_junction', desc: 'Overhead street lighting pole leaning dangerously over Arcot road', cat: 'Broken Streetlight', dept: 'Electrical Department', sev: 4, dup: 2, priLevel: 'HIGH', priScore: 78, img: '/light_resolved.jpg', phone: '+91 98414 33446', high_traffic: true },
  { id: 'REP-4283', spot: 'porur_junction', desc: 'Exposed high voltage wiring at the base of street lamp post', cat: 'Broken Streetlight', dept: 'Electrical Department', sev: 3, dup: 2, priLevel: 'HIGH', priScore: 72, img: '/light_resolved.jpg', phone: '+91 94455 44557', high_traffic: true },

  { id: 'REP-6112', spot: 'tambaram_mkt', desc: 'Major municipal water valve leaking thousands of liters across market entrance', cat: 'Water & Sewage Issue', dept: 'Water & Sewage Board', sev: 3, dup: 2, priLevel: 'HIGH', priScore: 70, img: '/water_resolved.jpg', phone: '+91 98416 55668', high_traffic: true },
  { id: 'REP-3036', spot: 'tambaram_mkt', desc: 'Drinking water distribution line split open near railway foot overbridge', cat: 'Water & Sewage Issue', dept: 'Water & Sewage Board', sev: 4, dup: 2, priLevel: 'HIGH', priScore: 78, img: '/water_resolved.jpg', phone: '+91 94456 66779', high_traffic: true },

  { id: 'REP-9719', spot: 'egmore_station', desc: 'Cracked concrete slab on platform exit road causing pedestrian trips', cat: 'Pothole & Surface Damage', dept: 'Highways & Roads', sev: 3, dup: 1, priLevel: 'HIGH', priScore: 70, img: '/road_resolved.jpg', phone: '+91 98417 77880', high_traffic: true },
  { id: 'REP-1446', spot: 'egmore_station', desc: 'Foul garbage dump outside parcel office building attracting stray dogs', cat: 'Garbage Overflow', dept: 'Solid Waste Management', sev: 3, dup: 1, priLevel: 'HIGH', priScore: 70, img: '/waste_resolved.jpg', phone: '+91 94457 88991', high_traffic: true },
  { id: 'REP-4938', spot: 'porur_junction', desc: 'Pothole cluster under construction metro pier on Arcot road', cat: 'Pothole & Surface Damage', dept: 'Highways & Roads', sev: 3, dup: 1, priLevel: 'HIGH', priScore: 72, img: '/road_resolved.jpg', phone: '+91 98419 99002', high_traffic: true },
  { id: 'REP-4842', spot: 'sholinganallur', desc: 'High mast light out of order at Sholinganallur main roundabout', cat: 'Broken Streetlight', dept: 'Electrical Department', sev: 3, dup: 1, priLevel: 'HIGH', priScore: 70, img: '/light_resolved.jpg', phone: '+91 94458 00113', high_traffic: true },
  { id: 'REP-4417', spot: 'koyambedu_mkt', desc: 'Foul-smelling rotten vegetable debris blocking truck bay 4', cat: 'Garbage Overflow', dept: 'Solid Waste Management', sev: 3, dup: 1, priLevel: 'MEDIUM', priScore: 50, img: '/waste_resolved.jpg', phone: '+91 98420 11225', high_traffic: false },
  { id: 'REP-4681', spot: 'nungambakkam', desc: 'Street lamp pole damaged after tree branch fall during storm', cat: 'Broken Streetlight', dept: 'Electrical Department', sev: 3, dup: 1, priLevel: 'HIGH', priScore: 70, img: '/light_resolved.jpg', phone: '+91 94459 22336', high_traffic: true },
  { id: 'REP-2772', spot: 'adyar_signal', desc: 'Sewage inspection chamber overflowing into stormwater gutter', cat: 'Water & Sewage Issue', dept: 'Water & Sewage Board', sev: 3, dup: 1, priLevel: 'HIGH', priScore: 70, img: '/water_resolved.jpg', phone: '+91 98421 33447', high_traffic: true },
  { id: 'REP-7117', spot: 'mylapore_luz', desc: 'Deep trench dug for utility cables left unpaved with sharp gravel', cat: 'Pothole & Surface Damage', dept: 'Highways & Roads', sev: 3, dup: 1, priLevel: 'MEDIUM', priScore: 45, img: '/road_resolved.jpg', phone: '+91 94460 44558', high_traffic: false },
  { id: 'REP-2542', spot: 'chromepet_gst', desc: 'Street light circuit breaker tripping every night leaving entire stretch dark', cat: 'Broken Streetlight', dept: 'Electrical Department', sev: 3, dup: 1, priLevel: 'MEDIUM', priScore: 60, img: '/light_resolved.jpg', phone: '+91 98422 55669', high_traffic: true },
  { id: 'REP-1833', spot: 'guindy_kathipara', desc: 'Fallen road divider curb stone obstructing left turn into airport lane', cat: 'Pothole & Surface Damage', dept: 'Highways & Roads', sev: 3, dup: 1, priLevel: 'HIGH', priScore: 75, img: '/road_resolved.jpg', phone: '+91 94461 66780', high_traffic: true },
  { id: 'REP-5593', spot: 'mmc_hospital', desc: 'Broken water fountain and leaking supply pipe inside public hospital campus road', cat: 'Water & Sewage Issue', dept: 'Water & Sewage Board', sev: 4, dup: 1, priLevel: 'CRITICAL', priScore: 82, img: '/water_resolved.jpg', phone: '+91 98423 77891', high_traffic: true },
  { id: 'REP-4379', spot: 'velachery_hub', desc: 'Garbage bins overturned by stray animals scattering plastic onto road', cat: 'Garbage Overflow', dept: 'Solid Waste Management', sev: 3, dup: 1, priLevel: 'HIGH', priScore: 72, img: '/waste_resolved.jpg', phone: '+91 94462 88902', high_traffic: true },
  { id: 'REP-5787', spot: 'tnagar_market', desc: 'Exposed live streetlight cable near bus stop shelter where commuters wait', cat: 'Broken Streetlight', dept: 'Electrical Department', sev: 3, dup: 1, priLevel: 'MEDIUM', priScore: 60, img: '/light_resolved.jpg', phone: '+91 98424 99013', high_traffic: true }
];

let sql = `-- ============================================================
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
`;

const rows = COMPLAINT_TEMPLATES.map((item, idx) => {
  const spot = HOTSPOTS[item.spot] || HOTSPOTS.apollo_hospital;
  const jitterLat = (spot.lat + (Math.random() - 0.5) * 0.0003).toFixed(6);
  const jitterLng = (spot.lng + (Math.random() - 0.5) * 0.0003).toFixed(6);
  const hasFac = !!spot.fac_type;
  const facTypeStr = spot.fac_type ? `'${spot.fac_type}'` : 'NULL';
  const facNameStr = spot.fac_name ? `'${spot.fac_name.replace(/'/g, "''")}'` : 'NULL';
  const facDistStr = spot.fac_dist !== null && spot.fac_dist !== undefined ? spot.fac_dist : 'NULL';
  const highTrafficStr = item.high_traffic ? 'TRUE' : 'FALSE';

  return `  ('${item.id}', '${item.cat.replace(/'/g, "''")}', '${item.dept.replace(/'/g, "''")}', '${item.desc.replace(/'/g, "''")}', '${spot.name.replace(/'/g, "''")}', ${jitterLat}, ${jitterLng}, 'Pending', ${item.sev}, ${item.dup}, '${item.img}', '${item.phone}', ${item.priScore}, '${item.priLevel}', '${item.priLevel} Priority', ${hasFac ? 'TRUE' : 'FALSE'}, ${facTypeStr}, ${facNameStr}, ${facDistStr}, ${highTrafficStr})`;
});

sql += rows.join(',\n') + ';\n';

fs.writeFileSync(path.join(__dirname, '..', 'supabase_seed_50.sql'), sql);
console.log('Successfully generated supabase_seed_50.sql with', rows.length, 'records.');
