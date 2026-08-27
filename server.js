// ============================================================
// CivicResolve — Express.js Backend
// ============================================================
// Written in plain JavaScript + Express + Supabase/PostgreSQL.
// No ORMs, no ML libraries, no complex GIS packages.
// Every important function is written out step-by-step so it
// can be explained clearly to hackathon judges.
// ============================================================

require('dotenv').config();
const express = require('express');
const path    = require('path');
const multer  = require('multer');
const { createClient } = require('@supabase/supabase-js');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Supabase Client ──────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-supabase-project')) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Supabase database integration initialized.');
} else {
  console.warn('Supabase URL/Key missing. Operating with in-memory fallback.');
}

const { detectSpam } = require('./backend/pipeline/spamDetection');

// ── Multer — memory storage (required for Vercel serverless) ─
// Vercel does not allow writing to disk, so we keep the file
// in memory and upload it straight to Supabase Storage.
const upload = multer({ storage: multer.memoryStorage() });

// ── Middleware ───────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// IN-MEMORY FALLBACK DATA
// Used only when Supabase is not configured (local dev).
// In production the Supabase DB is used instead.
// ============================================================
// ZERO DUMMY DATA ENFORCEMENT: Empty reports list
let fallbackReports = [];

// ============================================================
// KNOWN FACILITIES — Schools & Hospitals in Chennai
// Used by findNearbyFacility() to check the 500-metre radius.
// In a real system this would come from a database table.
// ============================================================
const knownFacilities = [
  { id: 1, name: 'Government General Hospital',          type: 'HOSPITAL', lat: 13.0827, lng: 80.2707 },
  { id: 2, name: "Apollo Children's Hospital",           type: 'HOSPITAL', lat: 13.0604, lng: 80.2496 },
  { id: 3, name: 'Madras Medical College',               type: 'SCHOOL',   lat: 13.0815, lng: 80.2720 },
  { id: 4, name: 'T. Nagar Girls Higher Secondary School', type: 'SCHOOL', lat: 13.0415, lng: 80.2335 },
  { id: 5, name: 'Velachery DAV School',                 type: 'SCHOOL',   lat: 12.9800, lng: 80.2170 }
];

// ============================================================
// HELPER — Format a database row into the shape the
//          frontend JavaScript expects.
// ============================================================
function formatReportRow(row) {
  return {
    id:               row.id,
    category:         row.category,
    department:       row.department,
    description:      row.description,
    location:         row.location,
    lat:              row.lat,
    lng:              row.lng,
    status:           row.status,
    severity:         row.severity,
    duplicatesCount:  row.duplicates_count || 1,
    imageUrl:         row.image_url,
    timestamp:        row.timestamp
                        ? new Date(row.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                        : 'Recently',
    reporterPhone:    row.reporter_phone,
    // Priority fields — returned to the frontend for display
    priority_score:     row.priority_score    || 0,
    priority_level:     row.priority_level    || 'LOW',
    nearby_facility:    row.nearby_facility   || false,
    facility_type:      row.facility_type     || null,
    facility_name:      row.facility_name     || null,
    facility_distance:  row.facility_distance || null,
    high_traffic_area:  row.high_traffic_area || false
  };
}

// ============================================================
// IMAGE UPLOAD — Supabase Storage
// Vercel's filesystem is read-only, so we upload images to
// Supabase Storage and return a permanent public URL.
// ============================================================
async function uploadImageToSupabase(buffer, originalname) {
  if (!supabase) {
    // No Supabase configured — return a placeholder image
    return 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=500&q=80';
  }

  const ext      = path.extname(originalname) || '.jpg';
  const filename = `report-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

  const { error } = await supabase.storage
    .from('report-images')
    .upload(filename, buffer, { contentType: 'image/jpeg', upsert: false });

  if (error) {
    console.error('Supabase Storage upload error:', error.message);
    return 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=500&q=80';
  }

  const { data: publicData } = supabase.storage
    .from('report-images')
    .getPublicUrl(filename);

  return publicData.publicUrl;
}

// ============================================================
// STEP 3 — HAVERSINE DISTANCE FORMULA
// ============================================================
// The earth is a sphere, so we cannot measure distance between
// two GPS points using simple flat (Euclidean) geometry.
// The Haversine formula calculates the shortest path along
// the curved surface of the earth between two lat/lng points.
//
// Parameters:
//   lat1, lon1 — latitude and longitude of point A (degrees)
//   lat2, lon2 — latitude and longitude of point B (degrees)
//
// Returns:
//   distance in metres
// ============================================================
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's mean radius in metres (6,371 km)

  // Step 1 — Convert both latitudes from degrees to radians.
  // Trigonometry functions (Math.sin, Math.cos) need radians.
  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;

  // Step 2 — Calculate the difference in latitude and longitude.
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180;

  // Step 3 — Apply the Haversine formula.
  // 'a' represents the square of half the chord length between the two points.
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  // Step 4 — 'c' is the angular distance in radians.
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Step 5 — Multiply by Earth's radius to get metres.
  return R * c;
}

// ============================================================
// STEP 4 — FIND DUPLICATE REPORTS
// ============================================================
// After a new report is saved, we look through existing open
// reports of the SAME CATEGORY and check whether any of them
// are within 100 metres of the new report.
//
// Why 100 metres?
//   GPS accuracy is typically 5–15 metres outdoors.
//   Citizens reporting the same pothole may stand on opposite
//   sides of the street, adding 10–30 m variation.
//   100 m comfortably covers these real-world variations while
//   avoiding accidentally merging two different nearby issues.
//
// Parameters:
//   newReport       — the report just inserted
//   existingReports — array of open reports of the same category
//
// Returns:
//   array of reports that are duplicates of newReport
// ============================================================
function findDuplicateReports(newReport, existingReports) {
  const DUPLICATE_RADIUS_METRES = 100;
  const duplicates = [];

  for (const report of existingReports) {
    // Skip the new report itself (it was already fetched with the others)
    if (report.id === newReport.id) continue;

    // Skip resolved reports — they are old, fixed issues.
    // A new complaint about the same spot is a fresh problem.
    if (report.status === 'Resolved' || report.status === 'RESOLVED') continue;

    // Category must match.
    // A pothole and a garbage pile near each other are NOT duplicates.
    if (report.category !== newReport.category) continue;

    // Calculate geodetic distance between the two GPS positions.
    const distanceMetres = calculateDistance(
      newReport.lat, newReport.lng,
      report.lat,    report.lng
    );

    // If within 100 metres — it is a duplicate of the same issue.
    if (distanceMetres <= DUPLICATE_RADIUS_METRES) {
      duplicates.push(report);
    }
  }

  return duplicates;
}

// ============================================================
// STEP 6 — REPORT SCORE
// ============================================================
// More citizens reporting the same issue means it is more
// urgent and affects more people. We reward higher counts
// with a non-linear (stepped) score so the jump from 1 → 2
// is significant, and the top end is capped at 100.
//
// Weight: 50% of the final priority score.
// ============================================================
function calculateReportScore(reportCount) {
  if (reportCount <= 1) return 20;
  if (reportCount === 2) return 40;
  if (reportCount === 3) return 60;
  if (reportCount === 4) return 75;
  if (reportCount === 5) return 90;
  return 100; // 6 or more reports
}

// ============================================================
// STEP 7 — NEARBY SCHOOL / HOSPITAL DETECTION
// ============================================================
// Issues near schools or hospitals are more dangerous because
// they affect vulnerable people (children, patients, visitors).
// We search within a 500-metre radius.
//
// Why 500 metres?
//   It is roughly a 6-minute walk. A large pothole or flooded
//   road 500 m from a hospital can genuinely delay ambulances.
//
// Parameters:
//   lat, lng — GPS position of the new report
//
// Returns:
//   { found: true,  type, name, distance }  — if a facility is nearby
//   { found: false, type: null, name: null, distance: null }
// ============================================================
function findNearbyFacility(lat, lng) {
  const FACILITY_RADIUS_METRES = 500;
  let closestFacility  = null;
  let closestDistance  = FACILITY_RADIUS_METRES; // start at the maximum allowed distance

  for (const facility of knownFacilities) {
    const dist = calculateDistance(lat, lng, facility.lat, facility.lng);

    // Keep only the nearest facility within the 500 m limit
    if (dist <= FACILITY_RADIUS_METRES && dist < closestDistance) {
      closestDistance  = dist;
      closestFacility  = facility;
    }
  }

  if (closestFacility) {
    return {
      found:    true,
      type:     closestFacility.type,
      name:     closestFacility.name,
      distance: Math.round(closestDistance) // rounded to nearest metre
    };
  }

  return { found: false, type: null, name: null, distance: null };
}

// ============================================================
// STEP 8 — HIGH-TRAFFIC AREA CLASSIFICATION
// ============================================================
// IMPORTANT: This is road-TYPE classification, NOT real-time
// traffic data. We do not have a live traffic API.
//
// Instead, we look at the location/address string and check
// whether it contains keywords that indicate a major road.
//
// Keywords that mean "high-traffic / main road":
//   salai, bypass, highway, main rd, main road,
//   expressway, arterial
//
// Why this approach?
//   It is simple, requires no external API, and is accurate
//   enough for a prototype. Most Chennai main roads contain
//   the word "salai" (Tamil for "road/avenue") in their name.
//
// Weight: 20% of the final priority score.
//
// Parameters:
//   location — address string from the report
//
// Returns:
//   true  — high traffic (major road)
//   false — normal traffic (local or residential road)
// ============================================================
function isHighTrafficArea(location) {
  const locLower = (location || '').toLowerCase();
  const highTrafficKeywords = [
    'salai', 'bypass', 'highway', 'main rd', 'main road', 'expressway', 'arterial'
  ];
  return highTrafficKeywords.some(keyword => locLower.includes(keyword));
}

// ============================================================
// STEP 9 — PRIORITY SCORE FORMULA
// ============================================================
// Combines three weighted factors into one final score (0–100).
//
//   priorityScore = (reportScore × 0.50)
//                + (facilityScore × 0.30)
//                + (trafficScore  × 0.20)
//
// Parameters:
//   reportScore   — 0–100, based on how many citizens reported
//   facilityScore — 100 if school/hospital nearby, else 0
//   trafficScore  — 100 if high-traffic road, else 0
//
// Returns:
//   integer 0–100
// ============================================================
function calculatePriority(reportScore, facilityScore, trafficScore) {
  const score = (reportScore * 0.50) + (facilityScore * 0.30) + (trafficScore * 0.20);
  return Math.round(score);
}

// ============================================================
// STEP 10 — PRIORITY LEVEL
// ============================================================
// Maps the numeric score to a human-readable priority label.
// ============================================================
function getPriorityLevel(score) {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

// ============================================================
// STEP 11 — SEVERITY (for colour-coded badges in the UI)
// ============================================================
// The frontend uses a severity number (1–5) to choose badge
// colours (green → yellow → orange → red).
// We derive severity from the priority level — no random numbers.
//
//   LOW      → 2  (lime green)
//   MEDIUM   → 3  (amber)
//   HIGH     → 4  (orange)
//   CRITICAL → 5  (red)
// ============================================================
function mapPriorityToSeverity(priorityLevel) {
  if (priorityLevel === 'CRITICAL') return 5;
  if (priorityLevel === 'HIGH')     return 4;
  if (priorityLevel === 'MEDIUM')   return 3;
  return 2; // LOW
}

// ============================================================
// CATEGORY / DEPARTMENT CLASSIFIER
// ============================================================
// Classifies the report category and responsible department
// based on keywords in the description.
// (In a real system this could use an AI image classifier.)
// ============================================================
function classifyReport(description) {
  const d = (description || '').toLowerCase();
  if (d.includes('garbage') || d.includes('waste') || d.includes('trash')) {
    return { category: 'Garbage Overflow', department: 'Solid Waste Management' };
  }
  if (d.includes('light') || d.includes('lamp') || d.includes('streetlight')) {
    return { category: 'Broken Streetlight', department: 'Electrical Department' };
  }
  if (d.includes('water') || d.includes('drain') || d.includes('sewage') || d.includes('leak')) {
    return { category: 'Water & Sewage Issue', department: 'Water & Sewerage' };
  }
  // Default — most common civic issue
  return { category: 'Pothole & Surface Damage', department: 'Highways & Roads' };
}

// ============================================================
// REST API ENDPOINTS
// ============================================================

// ── GET /api/reports ─────────────────────────────────────────
// Returns all reports, optionally filtered by department.
// Used by the frontend to populate both the citizen view and
// the admin queue.
// ─────────────────────────────────────────────────────────────
app.get('/api/reports', async (req, res) => {
  const { department } = req.query;

  if (supabase) {
    try {
      let query = supabase
        .from('civic_reports')
        .select('*')
        .order('timestamp', { ascending: false });

      if (department && department !== 'All') {
        query = query.eq('department', department);
      }

      const { data, error } = await query;
      if (error) throw error;
      return res.json((data || []).map(formatReportRow));
    } catch (err) {
      console.error('GET /api/reports Supabase error, using fallback:', err.message);
    }
  }

  // In-memory fallback
  let results = fallbackReports;
  if (department && department !== 'All') {
    results = fallbackReports.filter(r => r.department === department);
  }
  res.json(results);
});

// ── GET /api/reports/prioritized ─────────────────────────────
// Returns all open reports sorted by priority_score descending.
// NOTE: This route must be registered BEFORE /api/reports/:id
//       so Express does not mistake "prioritized" for an :id.
// ─────────────────────────────────────────────────────────────
app.get('/api/reports/prioritized', async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('civic_reports')
        .select('*')
        .neq('status', 'Resolved')
        .neq('status', 'RESOLVED')
        .order('priority_score', { ascending: false });

      if (error) throw error;
      return res.json({ success: true, reports: (data || []).map(formatReportRow) });
    } catch (err) {
      console.error('GET /api/reports/prioritized error, using fallback:', err.message);
    }
  }

  const active = fallbackReports
    .filter(r => r.status !== 'Resolved' && r.status !== 'RESOLVED')
    .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));

  res.json({ success: true, reports: active });
});

// ── POST /api/reports — COMPLETE TRIAGE PIPELINE ─────────────
//
// This is the most important route. It follows all 20 steps:
//
//  1.  Receive the form data (description, location, lat, lng, image)
//  2.  Upload image to Supabase Storage
//  3.  Classify category and department from description keywords
//  4.  Build the initial report object with safe default values
//  5.  INSERT the report into civic_reports FIRST
//      (the citizen's report is always saved before anything else)
//  6.  Fetch existing open reports of the same category
//  7.  Call findDuplicateReports() → identify duplicates within 100 m
//  8.  Calculate duplicateCount = duplicates.length + 1 (new report included)
//  9.  Call findNearbyFacility() → check within 500 m
// 10.  Call isHighTrafficArea() → keyword-based road classification
// 11.  Call calculateReportScore() with duplicateCount
// 12.  Calculate facilityScore (100 / 0)
// 13.  Calculate trafficScore  (100 / 0)
// 14.  Call calculatePriority() → weighted average
// 15.  Call getPriorityLevel() → CRITICAL / HIGH / MEDIUM / LOW
// 16.  Call mapPriorityToSeverity() → 2 / 3 / 4 / 5
// 17.  UPDATE the new report in the DB with all calculated fields
// 18.  UPDATE all duplicate reports with the new duplicates_count,
//       priority_score, priority_level, and severity
// 19.  Return enriched response to the frontend
//
// If any step 6–18 fails, the report is already saved (step 5),
// so the citizen's submission is never lost.
// ─────────────────────────────────────────────────────────────
app.post('/api/reports', upload.single('image'), async (req, res) => {
  const { description, location, lat, lng, reporterPhone } = req.body;

  // ── 1. Upload image ──────────────────────────────────────
  let imageUrl = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=500&q=80';
  if (req.file) {
    imageUrl = await uploadImageToSupabase(req.file.buffer, req.file.originalname);
  } else if (req.body.imageUrl) {
    imageUrl = req.body.imageUrl;
  }

  // ── 2. Classify category & department ───────────────────
  const { category, department } = classifyReport(description);

  const newLat      = parseFloat(lat) || 13.0827;
  const newLng      = parseFloat(lng) || 80.2707;
  const reportLoc   = location || 'Anna Salai, Chennai (GPS Locked)';
  const reportId    = `REP-${Math.floor(1000 + Math.random() * 9000)}`;

  // ── 3. Build the initial report object ──────────────────
  // These are safe defaults. All priority fields will be
  // recalculated and updated after the report is saved.
  const initialReport = {
    id:               reportId,
    category,
    department,
    description:      description || '',
    location:         reportLoc,
    lat:              newLat,
    lng:              newLng,
    status:           'Pending',
    severity:         2,        // default LOW, will be updated
    duplicates_count: 1,        // default, will be updated
    image_url:        imageUrl,
    reporter_phone:   reporterPhone || '+91 9876543210',
    priority_score:   0,
    priority_level:   'LOW',
    nearby_facility:  false,
    facility_type:    null,
    facility_name:    null,
    facility_distance: null,
    high_traffic_area: false
  };

  const deviceIdentifier = req.body.device_id || req.body.deviceId || req.headers['x-device-id'] || 'device-default';
  initialReport.device_id = deviceIdentifier;

  // STAGE 1: SPAM DETECTION PIPELINE
  const spamResult = await detectSpam(initialReport);

  if (spamResult.error) {
    if (spamResult.error.code === 'SPAM_CLEANUP_FAILED') {
      return res.status(500).json({ success: false, error: 'Unable to complete spam cleanup.' });
    }
    return res.status(500).json({ success: false, error: spamResult.error.message });
  }

  // IF SPAM -> REJECT REQUEST AND DO NOT INSERT REPORT INTO DATABASE
  if (spamResult.spam && spamResult.spam.isSpam) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        console.warn('[SPAM] Warning: Failed to clean up orphaned local image:', unlinkErr.message);
      }
    }

    return res.status(400).json({
      success: false,
      spam: true,
      deleted: true,
      message: 'Report rejected.'
    });
  }

  // ── 4. SAVE THE REPORT FIRST ─────────────────────────────
  // This must happen before any calculation. If duplicate
  // detection or priority scoring fails later, the citizen's
  // report is already safely stored.
  if (supabase) {
    try {
      const { error } = await supabase
        .from('civic_reports')
        .insert([initialReport]);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to save report to Supabase:', err.message);
      return res.status(500).json({ success: false, message: 'Could not save report. Please try again.' });
    }
  } else {
    // In-memory fallback
    fallbackReports.unshift(formatReportRow(initialReport));
  }

  // ── 5–16. TRIAGE PIPELINE ────────────────────────────────
  // All of this runs AFTER the report is safely saved.
  // Any error here is caught and logged; the report already exists.

  let duplicateCount = 1;
  let facilityResult = { found: false, type: null, name: null, distance: null };
  let isTraffic      = false;
  let priorityScore  = 0;
  let priorityLevel  = 'LOW';
  let severity       = 2;

  try {
    // ── 5. Fetch existing open reports of the same category ──
    let existingReports = [];
    if (supabase) {
      const { data, error } = await supabase
        .from('civic_reports')
        .select('*')
        .eq('category', category)
        .neq('status', 'Resolved')
        .neq('status', 'RESOLVED');

      if (!error) existingReports = data || [];
    } else {
      existingReports = fallbackReports.filter(
        r => r.category === category && r.status !== 'Resolved' && r.status !== 'RESOLVED'
      );
    }

    // ── 6. Find duplicates within 100 metres ────────────────
    const duplicateReports = findDuplicateReports(
      { id: reportId, category, lat: newLat, lng: newLng },
      existingReports
    );

    // ── 7. Calculate total count ─────────────────────────────
    // duplicateReports contains the OTHER matching reports.
    // We add 1 for the new report itself.
    //
    // Example: 3 existing duplicates + this new report = 4 total
    duplicateCount = duplicateReports.length + 1;

    // ── 8. Nearby school or hospital? ───────────────────────
    facilityResult = findNearbyFacility(newLat, newLng);

    // ── 9. High-traffic road? ────────────────────────────────
    isTraffic = isHighTrafficArea(reportLoc);

    // ── 10–13. Calculate scores ──────────────────────────────
    const reportScore   = calculateReportScore(duplicateCount);
    const facilityScore = facilityResult.found ? 100 : 0;
    const trafficScore  = isTraffic ? 100 : 0;

    priorityScore = calculatePriority(reportScore, facilityScore, trafficScore);
    priorityLevel = getPriorityLevel(priorityScore);
    severity      = mapPriorityToSeverity(priorityLevel);

    // ── 14. Update the new report with all calculated fields ─
    const updatePayload = {
      duplicates_count:  duplicateCount,
      priority_score:    priorityScore,
      priority_level:    priorityLevel,
      severity,
      nearby_facility:   facilityResult.found,
      facility_type:     facilityResult.type,
      facility_name:     facilityResult.name,
      facility_distance: facilityResult.distance,
      high_traffic_area: isTraffic
    };

    if (supabase) {
      await supabase
        .from('civic_reports')
        .update(updatePayload)
        .eq('id', reportId);

      // ── 15. Update ALL duplicate reports ──────────────────
      // Every matching report now shows the same cluster count
      // and the recalculated priority.
      //
      // Example result (5 matching reports):
      //   REP-001 → duplicates_count = 5, severity = 5 (CRITICAL)
      //   REP-002 → duplicates_count = 5, severity = 5 (CRITICAL)
      //   REP-003 → duplicates_count = 5, severity = 5 (CRITICAL)
      //   REP-004 → duplicates_count = 5, severity = 5 (CRITICAL)
      //   REP-005 → duplicates_count = 5, severity = 5 (CRITICAL)
      for (const dup of duplicateReports) {
        await supabase
          .from('civic_reports')
          .update({
            duplicates_count: duplicateCount,
            priority_score:   priorityScore,
            priority_level:   priorityLevel,
            severity
          })
          .eq('id', dup.id);
      }
    } else {
      // In-memory fallback update
      for (const r of fallbackReports) {
        const isNew = r.id === reportId;
        const isDup = duplicateReports.some(d => d.id === r.id);

        if (isNew || isDup) {
          r.duplicatesCount  = duplicateCount;
          r.severity         = severity;
          r.priority_score   = priorityScore;
          r.priority_level   = priorityLevel;
        }
        if (isNew) {
          r.nearby_facility   = facilityResult.found;
          r.facility_type     = facilityResult.type;
          r.facility_name     = facilityResult.name;
          r.facility_distance = facilityResult.distance;
          r.high_traffic_area = isTraffic;
        }
      }
    }
  } catch (err) {
    // The citizen's report is already saved — do not reject the request.
    // Log the error and continue with default priority values.
    console.error('Triage pipeline error (report already saved):', err.message);
  }

  // ── 16. Return enriched response to the frontend ─────────
  return res.status(201).json({
    success: true,
    spam: false,
    deleted: false,
    report: {
      ...formatReportRow(initialReport),
      duplicatesCount:   duplicateCount,
      priority_score:    priorityScore,
      priority_level:    priorityLevel,
      nearby_facility:   facilityResult.found,
      facility_type:     facilityResult.type,
      facility_name:     facilityResult.name,
      facility_distance: facilityResult.distance,
      high_traffic_area: isTraffic,
      severity
    }
  });
});

// ── PATCH /api/reports/:id/status ────────────────────────────
// Updates the status of a single report (Pending → Assigned →
// In Progress → Resolved). Used by the admin triage desk.
// ─────────────────────────────────────────────────────────────
app.patch('/api/reports/:id/status', async (req, res) => {
  const { id }     = req.params;
  const { status } = req.body;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('civic_reports')
        .update({ status })
        .eq('id', id)
        .select();

      if (error) throw error;
      if (data && data.length > 0) {
        return res.json({ success: true, report: formatReportRow(data[0]) });
      }
    } catch (err) {
      console.error('PATCH /api/reports/:id/status error, using fallback:', err.message);
    }
  }

  // In-memory fallback
  const report = fallbackReports.find(r => r.id === id);
  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }
  report.status = status;
  res.json({ success: true, report });
});

// ── DELETE /api/reports/:id ───────────────────────────────────
// Deletes a single report and recalculates the priority for
// all remaining reports that were in the same duplicate cluster.
// ─────────────────────────────────────────────────────────────
app.delete('/api/reports/:id', async (req, res) => {
  const { id } = req.params;

  if (supabase) {
    try {
      // Fetch the report before deleting so we know its category & location
      const { data: toDelete, error: fetchErr } = await supabase
        .from('civic_reports')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchErr || !toDelete) {
        return res.status(404).json({ success: false, message: 'Report not found' });
      }

      // Delete the report
      const { error: delErr } = await supabase
        .from('civic_reports')
        .delete()
        .eq('id', id);

      if (delErr) throw delErr;

      // Recalculate priority for remaining reports in the same cluster
      try {
        const { data: remaining } = await supabase
          .from('civic_reports')
          .select('*')
          .eq('category', toDelete.category)
          .neq('status', 'Resolved')
          .neq('status', 'RESOLVED');

        if (remaining && remaining.length > 0) {
          // Find which remaining reports are in the same 100-m cluster
          const clusterMembers = remaining.filter(r => {
            const dist = calculateDistance(toDelete.lat, toDelete.lng, r.lat, r.lng);
            return dist <= 100;
          });

          if (clusterMembers.length > 0) {
            // Pick representative location from first member
            const rep = clusterMembers[0];
            const newCount       = clusterMembers.length;
            const reportScore    = calculateReportScore(newCount);
            const facilityResult = findNearbyFacility(rep.lat, rep.lng);
            const isTraffic      = isHighTrafficArea(rep.location);
            const facilityScore  = facilityResult.found ? 100 : 0;
            const trafficScore   = isTraffic ? 100 : 0;
            const newScore       = calculatePriority(reportScore, facilityScore, trafficScore);
            const newLevel       = getPriorityLevel(newScore);
            const newSeverity    = mapPriorityToSeverity(newLevel);

            for (const member of clusterMembers) {
              await supabase
                .from('civic_reports')
                .update({
                  duplicates_count: newCount,
                  priority_score:   newScore,
                  priority_level:   newLevel,
                  severity:         newSeverity
                })
                .eq('id', member.id);
            }
          }
        }
      } catch (recalcErr) {
        // Non-fatal — the report is already deleted
        console.error('Priority recalculation after delete failed:', recalcErr.message);
      }

      return res.json({ success: true, message: 'Report deleted successfully' });
    } catch (err) {
      console.error('DELETE /api/reports/:id error, using fallback:', err.message);
    }
  }

  // In-memory fallback delete
  const index = fallbackReports.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  const deleted = fallbackReports.splice(index, 1)[0];

  // Recalculate for remaining duplicates in memory
  const remainingDups = fallbackReports.filter(r => {
    if (r.category !== deleted.category) return false;
    if (r.status === 'Resolved' || r.status === 'RESOLVED') return false;
    const dist = calculateDistance(deleted.lat, deleted.lng, r.lat, r.lng);
    return dist <= 100;
  });

  if (remainingDups.length > 0) {
    const newCount      = remainingDups.length;
    const reportScore   = calculateReportScore(newCount);
    const fResult       = findNearbyFacility(remainingDups[0].lat, remainingDups[0].lng);
    const tResult       = isHighTrafficArea(remainingDups[0].location);
    const newScore      = calculatePriority(reportScore, fResult.found ? 100 : 0, tResult ? 100 : 0);
    const newLevel      = getPriorityLevel(newScore);
    const newSeverity   = mapPriorityToSeverity(newLevel);

    for (const r of remainingDups) {
      r.duplicatesCount  = newCount;
      r.priority_score   = newScore;
      r.priority_level   = newLevel;
      r.severity         = newSeverity;
    }
  }

  res.json({ success: true, message: 'Report deleted successfully' });
});

// ── Serve frontend ────────────────────────────────────────────
app.get('/{0,}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start server ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`CivicResolve server running on http://localhost:${PORT}`);
});
