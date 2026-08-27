require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-supabase-project')) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Supabase database integration initialized.');
} else {
  console.warn('Supabase URL/Key missing or default. Operating with mock database fallback.');
}

// Configure multer for local file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'public/uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage: storage });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory Fallback Reports Data
// In-Memory Fallback Reports Data
let fallbackReports = [
  {
    id: "REP-4091",
    category: "Pothole & Surface Damage",
    department: "Highways & Roads",
    description: "Dangerous crater-sized pothole right after the signal. Causing severe traffic skids.",
    location: "Anna Salai, Near Spencers Plaza, Chennai",
    lat: 13.0604,
    lng: 80.2496,
    status: "In Progress",
    severity: 4,
    duplicatesCount: 5,
    imageUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=500&q=80",
    timestamp: "27 Aug 2026, 09:15 AM",
    reporterPhone: "+91 9876543210",
    issue_id: 1
  },
  {
    id: "REP-4088",
    category: "Garbage Overflow",
    department: "Solid Waste Management",
    description: "Community bin overflowing for 3 days. Blocking sidewalk completely.",
    location: "T. Nagar 3rd Main Rd, Chennai",
    lat: 13.0418,
    lng: 80.2341,
    status: "Pending",
    severity: 3,
    duplicatesCount: 2,
    imageUrl: "https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=500&q=80",
    timestamp: "27 Aug 2026, 10:30 AM",
    reporterPhone: "+91 9123456789",
    issue_id: 2
  },
  {
    id: "REP-4072",
    category: "Broken Streetlight",
    department: "Electrical Department",
    description: "Streetlights not functioning for the entire block. Complete darkness.",
    location: "Velachery Bypass Rd, Chennai",
    lat: 12.9815,
    lng: 80.2180,
    status: "Resolved",
    severity: 2,
    duplicatesCount: 1,
    imageUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=500&q=80",
    timestamp: "26 Aug 2026, 06:45 PM",
    reporterPhone: "+91 9988776655",
    issue_id: 3
  }
];

let fallbackIssues = [
  {
    id: 1,
    category: "Pothole & Surface Damage",
    department: "Highways & Roads",
    latitude: 13.0604,
    longitude: 80.2496,
    location: "Anna Salai, Near Spencers Plaza, Chennai",
    report_count: 5,
    nearby_facility: true,
    facility_type: "HOSPITAL",
    facility_name: "Apollo Children's Hospital",
    facility_distance: 0.0,
    high_traffic_area: true,
    priority_score: 95,
    priority_level: "CRITICAL",
    status: "OPEN",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    category: "Garbage Overflow",
    department: "Solid Waste Management",
    latitude: 13.0418,
    longitude: 80.2341,
    location: "T. Nagar 3rd Main Rd, Chennai",
    report_count: 2,
    nearby_facility: true,
    facility_type: "SCHOOL",
    facility_name: "T. Nagar Girls Higher Secondary School",
    facility_distance: 60.0,
    high_traffic_area: true,
    priority_score: 80,
    priority_level: "CRITICAL",
    status: "OPEN",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 3,
    category: "Broken Streetlight",
    department: "Electrical Department",
    latitude: 12.9815,
    longitude: 80.2180,
    location: "Velachery Bypass Rd, Chennai",
    report_count: 1,
    nearby_facility: true,
    facility_type: "SCHOOL",
    facility_name: "Velachery DAV School",
    facility_distance: 190.0,
    high_traffic_area: true,
    priority_score: 50,
    priority_level: "MEDIUM",
    status: "OPEN",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Helper to map DB row object to frontend JSON structure
function formatReportRow(row) {
  return {
    id: row.id,
    category: row.category,
    department: row.department,
    description: row.description,
    location: row.location,
    lat: row.lat,
    lng: row.lng,
    status: row.status,
    severity: row.severity,
    duplicatesCount: row.duplicates_count || 1,
    imageUrl: row.image_url,
    timestamp: row.timestamp ? new Date(row.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently',
    reporterPhone: row.reporter_phone,
    issue_id: row.issue_id
  };
}

// --- Low-Level Priority & Duplicate Detection System ---

// Hardcoded known public facilities (Schools & Hospitals) in Chennai for proximity check
const sampleFacilities = [
  { id: 1, name: "Government General Hospital", type: "HOSPITAL", lat: 13.0827, lng: 80.2707 },
  { id: 2, name: "Apollo Children's Hospital", type: "HOSPITAL", lat: 13.0604, lng: 80.2496 },
  { id: 3, name: "Madras Medical College", type: "SCHOOL", lat: 13.0815, lng: 80.2720 },
  { id: 4, name: "T. Nagar Girls Higher Secondary School", type: "SCHOOL", lat: 13.0415, lng: 80.2335 },
  { id: 5, name: "Velachery DAV School", type: "SCHOOL", lat: 12.9800, lng: 80.2170 }
];

/**
 * Calculates geodetic distance in meters between two lat/lng coordinates using the Haversine formula.
 * The Haversine formula determines the great-circle distance between two points on a sphere given their longitudes and latitudes.
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  
  // Convert degrees to radians
  const radLat1 = lat1 * Math.PI / 180;
  const radLat2 = lat2 * Math.PI / 180;
  const deltaLat = (lat2 - lat1) * Math.PI / 180;
  const deltaLon = (lon2 - lon1) * Math.PI / 180;

  // Apply Haversine formula
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(radLat1) * Math.cos(radLat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Returns the distance in meters
}

/**
 * Calculates the score component based on the total report count.
 * Weight breakdown: 1 report (20 pts), 2 (40 pts), 3 (60 pts), 4 (75 pts), 5 (90 pts), 6+ (100 pts)
 * @param {number} reportCount - Number of reports in the cluster
 * @returns {number} Score from 0 to 100
 */
function calculateReportScore(reportCount) {
  if (reportCount <= 1) return 20;
  if (reportCount === 2) return 40;
  if (reportCount === 3) return 60;
  if (reportCount === 4) return 75;
  if (reportCount === 5) return 90;
  return 100;
}

/**
 * Searches for a duplicate issue cluster of the same category within a 100-meter radius.
 * @param {string} category - Category of the issue
 * @param {number} lat - Latitude of the new report
 * @param {number} lng - Longitude of the new report
 * @param {Array} existingIssues - Array of existing issue clusters
 * @returns {Object|null} The matching issue cluster, or null if none found
 */
function findDuplicateIssue(category, lat, lng, existingIssues) {
  for (const issue of existingIssues) {
    if (issue.status === 'RESOLVED' || issue.status === 'Resolved') continue;
    if (issue.category === category) {
      const dist = calculateDistance(lat, lng, issue.latitude, issue.longitude);
      if (dist <= 100) {
        return issue;
      }
    }
  }
  return null;
}

/**
 * Checks for any nearby public facilities (schools or hospitals) within a 500-meter radius.
 * @param {number} lat - Latitude of the issue
 * @param {number} lng - Longitude of the issue
 * @param {Array} facilitiesList - List of known facilities
 * @returns {Object|null} Closest facility information, or null if none found
 */
function findNearbyFacility(lat, lng, facilitiesList) {
  let closestFacility = null;
  let minDistance = 500; // Search radius limit (500 meters)

  for (const facility of facilitiesList) {
    const dist = calculateDistance(lat, lng, facility.lat, facility.lng);
    if (dist <= 500 && dist < minDistance) {
      minDistance = dist;
      closestFacility = {
        name: facility.name,
        type: facility.type,
        distance: dist
      };
    }
  }
  return closestFacility;
}

/**
 * Classifies whether a location is a high-traffic area based on road type keywords in address.
 * @param {string} location - Location address text
 * @returns {boolean} True if high traffic area, false otherwise
 */
function isHighTrafficRoad(location) {
  const locLower = (location || '').toLowerCase();
  const highTrafficKeywords = ['salai', 'bypass', 'highway', 'main rd', 'main road', 'expressway', 'arterial'];
  return highTrafficKeywords.some(keyword => locLower.includes(keyword));
}

/**
 * Calculates traffic score component. High traffic road yields 100, local road yields 0.
 * @param {string} location - Location address text
 * @returns {number} Score (0 or 100)
 */
function calculateTrafficScore(location) {
  return isHighTrafficRoad(location) ? 100 : 0;
}

/**
 * Computes a weighted priority score between 0 and 100.
 * Weights: Report Count (50%), Proximity Facility (30%), High Traffic Road (20%)
 * @param {number} reportScore - Score component for reports (0-100)
 * @param {number} facilityScore - Score component for facilities (0-100)
 * @param {number} trafficScore - Score component for traffic (0-100)
 * @returns {number} Final priority score rounded to nearest integer (0-100)
 */
function calculatePriority(reportScore, facilityScore, trafficScore) {
  const score = (reportScore * 0.50) + (facilityScore * 0.30) + (trafficScore * 0.20);
  return Math.round(score);
}

/**
 * Maps a numeric priority score to a user-friendly priority level.
 * @param {number} score - Numeric priority score (0-100)
 * @returns {string} Level category (LOW, MEDIUM, HIGH, CRITICAL)
 */
function getPriorityLevel(score) {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

/**
 * Maps a numeric priority score to a severity scale from 2 to 5 for UI badges.
 * @param {number} score - Numeric priority score (0-100)
 * @returns {number} Severity rating (2 to 5)
 */
function mapPriorityToSeverity(score) {
  if (score >= 80) return 5;
  if (score >= 60) return 4;
  if (score >= 40) return 3;
  return 2;
}

// --- REST API ENDPOINTS ---

// GET /api/reports - Fetch reports from Supabase DB or Fallback Memory
app.get('/api/reports', async (req, res) => {
  const { department } = req.query;

  if (supabase) {
    try {
      let query = supabase.from('civic_reports').select('*').order('timestamp', { ascending: false });
      if (department && department !== 'All') {
        query = query.eq('department', department);
      }
      const { data, error } = await query;
      if (error) throw error;
      const formatted = (data || []).map(formatReportRow);
      return res.json(formatted);
    } catch (err) {
      console.error('Supabase fetch error, falling back to memory:', err.message);
    }
  }

  // Fallback memory filtering
  if (department && department !== 'All') {
    const filtered = fallbackReports.filter(r => r.department === department);
    return res.json(filtered);
  }
  res.json(fallbackReports);
});

// POST /api/reports - Create new report in Supabase DB or Fallback Memory
app.post('/api/reports', upload.single('image'), async (req, res) => {
  const { description, location, lat, lng, reporterPhone } = req.body;

  let imageUrl = "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=500&q=80";
  if (req.file) {
    imageUrl = `/uploads/${req.file.filename}`;
  } else if (req.body.imageUrl) {
    imageUrl = req.body.imageUrl;
  }

  // Multimodal AI Classification Mock Logic
  const descLower = (description || '').toLowerCase();
  const isGarbage = descLower.includes('garbage') || descLower.includes('waste');
  const isLight = descLower.includes('light') || descLower.includes('lamp');
  
  let dept = "Highways & Roads";
  let category = "Pothole & Surface Damage";
  if (isGarbage) { dept = "Solid Waste Management"; category = "Garbage Overflow"; }
  if (isLight) { dept = "Electrical Department"; category = "Broken Streetlight"; }

  const newReportLat = parseFloat(lat) || 13.0827;
  const newReportLng = parseFloat(lng) || 80.2707;
  const reportLocation = location || 'Anna Salai, Chennai (GPS Locked)';

  // --- Duplicate Detection and Priority Calculation Logic ---
  let duplicateIssue = null;
  let issueId = null;
  let finalReportCount = 1;
  let priorityScore = 20; // default Low
  let priorityLevel = "LOW";

  // Fetch active issues
  let activeIssues = [];
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .neq('status', 'RESOLVED')
        .neq('status', 'Resolved');
      if (!error && data) {
        activeIssues = data;
      }
    } catch (err) {
      console.error('Error fetching existing issues from Supabase:', err.message);
    }
  } else {
    activeIssues = fallbackIssues;
  }

  // Find duplicate
  duplicateIssue = findDuplicateIssue(category, newReportLat, newReportLng, activeIssues);

  if (duplicateIssue) {
    // Increment report count
    finalReportCount = duplicateIssue.report_count + 1;
    
    // Calculate new priority score
    const reportScore = calculateReportScore(finalReportCount);
    const facilityScore = duplicateIssue.nearby_facility ? 100 : 0;
    const trafficScore = duplicateIssue.high_traffic_area ? 100 : 0;
    priorityScore = calculatePriority(reportScore, facilityScore, trafficScore);
    priorityLevel = getPriorityLevel(priorityScore);
    issueId = duplicateIssue.id;

    const newSeverity = mapPriorityToSeverity(priorityScore);

    // Update existing issue in DB / fallback memory
    if (supabase) {
      try {
        await supabase
          .from('issues')
          .update({
            report_count: finalReportCount,
            priority_score: priorityScore,
            priority_level: priorityLevel,
            updated_at: new Date().toISOString()
          })
          .eq('id', duplicateIssue.id);

        await supabase
          .from('civic_reports')
          .update({
            severity: newSeverity,
            duplicates_count: finalReportCount
          })
          .eq('issue_id', duplicateIssue.id);
      } catch (err) {
        console.error('Error updating existing issue in Supabase:', err.message);
      }
    } else {
      const issue = fallbackIssues.find(i => i.id === duplicateIssue.id);
      if (issue) {
        issue.report_count = finalReportCount;
        issue.priority_score = priorityScore;
        issue.priority_level = priorityLevel;
        issue.updated_at = new Date().toISOString();
      }
      fallbackReports.forEach(r => {
        if (r.issue_id === duplicateIssue.id) {
          r.severity = newSeverity;
          r.duplicatesCount = finalReportCount;
        }
      });
    }
  } else {
    // Create new issue cluster
    const nearbyFacility = findNearbyFacility(newReportLat, newReportLng, sampleFacilities);
    const hasFacility = !!nearbyFacility;
    const isTraffic = isHighTrafficRoad(reportLocation);

    const reportScore = calculateReportScore(1);
    const facilityScore = hasFacility ? 100 : 0;
    const trafficScore = isTraffic ? 100 : 0;

    priorityScore = calculatePriority(reportScore, facilityScore, trafficScore);
    priorityLevel = getPriorityLevel(priorityScore);

    const newIssueData = {
      category: category,
      department: dept,
      latitude: newReportLat,
      longitude: newReportLng,
      location: reportLocation,
      report_count: 1,
      nearby_facility: hasFacility,
      facility_type: nearbyFacility ? nearbyFacility.type : null,
      facility_name: nearbyFacility ? nearbyFacility.name : null,
      facility_distance: nearbyFacility ? parseFloat(nearbyFacility.distance.toFixed(1)) : null,
      high_traffic_area: isTraffic,
      priority_score: priorityScore,
      priority_level: priorityLevel,
      status: 'OPEN'
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('issues')
          .insert([newIssueData])
          .select();
        if (error) throw error;
        if (data && data.length > 0) {
          issueId = data[0].id;
        }
      } catch (err) {
        console.error('Error creating new issue in Supabase:', err.message);
      }
    } else {
      const newId = fallbackIssues.length > 0 ? Math.max(...fallbackIssues.map(i => i.id)) + 1 : 1;
      const localIssue = {
        id: newId,
        ...newIssueData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      fallbackIssues.push(localIssue);
      issueId = newId;
    }
  }

  // Create new report data payload
  const newReportData = {
    id: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
    category: category,
    department: dept,
    description: description || '',
    location: reportLocation,
    lat: newReportLat,
    lng: newReportLng,
    status: "Pending",
    severity: mapPriorityToSeverity(priorityScore),
    duplicates_count: finalReportCount,
    image_url: imageUrl,
    reporter_phone: reporterPhone || "+91 9876543210",
    issue_id: issueId
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('civic_reports')
        .insert([newReportData])
        .select();

      if (error) throw error;
      const createdReport = formatReportRow(data[0]);
      
      const responseReport = {
        ...createdReport,
        is_duplicate: !!duplicateIssue,
        report_count: finalReportCount,
        priority_score: priorityScore,
        priority_level: priorityLevel
      };
      return res.status(201).json({ success: true, report: responseReport });
    } catch (err) {
      console.error('Supabase insert error, saving to memory fallback:', err.message);
    }
  }

  // Fallback memory insert
  const formattedReport = formatReportRow(newReportData);
  fallbackReports.unshift(formattedReport);

  const responseReport = {
    ...formattedReport,
    is_duplicate: !!duplicateIssue,
    report_count: finalReportCount,
    priority_score: priorityScore,
    priority_level: priorityLevel
  };
  res.status(201).json({ success: true, report: responseReport });
});

// PATCH /api/reports/:id/status - Update report status in Supabase DB or Fallback Memory
app.patch('/api/reports/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  let reportToUpdate = null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('civic_reports')
        .update({ status: status })
        .eq('id', id)
        .select();

      if (error) throw error;
      if (data && data.length > 0) {
        reportToUpdate = data[0];
        
        // Sync with parent issue if resolving
        if ((status === 'Resolved' || status === 'RESOLVED') && reportToUpdate.issue_id) {
          await supabase
            .from('issues')
            .update({ status: 'RESOLVED' })
            .eq('id', reportToUpdate.issue_id);
        }
        
        return res.json({ success: true, report: formatReportRow(reportToUpdate) });
      }
    } catch (err) {
      console.error('Supabase update error, trying memory fallback:', err.message);
    }
  }

  // Fallback memory update
  const report = fallbackReports.find(r => r.id === id);
  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  report.status = status;
  if ((status === 'Resolved' || status === 'RESOLVED') && report.issue_id) {
    const issue = fallbackIssues.find(i => i.id === report.issue_id);
    if (issue) {
      issue.status = 'RESOLVED';
    }
  }
  res.json({ success: true, report });
});

// GET /api/issues/prioritized - Get all active issues sorted by priority score
app.get('/api/issues/prioritized', async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .neq('status', 'RESOLVED')
        .neq('status', 'Resolved')
        .order('priority_score', { ascending: false });
      if (error) throw error;
      return res.json({ success: true, issues: data || [] });
    } catch (err) {
      console.error('Supabase prioritized issues fetch error, falling back to memory:', err.message);
    }
  }

  // Fallback memory active issues
  const activeIssues = fallbackIssues.filter(i => i.status !== 'RESOLVED' && i.status !== 'Resolved');
  activeIssues.sort((a, b) => b.priority_score - a.priority_score);
  res.json({ success: true, issues: activeIssues });
});

// GET /api/issues/:issueId - Fetch details of a single issue and all reports in its cluster
app.get('/api/issues/:issueId', async (req, res) => {
  const issueId = parseInt(req.params.issueId);

  if (supabase) {
    try {
      const { data: issueData, error: issueError } = await supabase
        .from('issues')
        .select('*')
        .eq('id', issueId)
        .single();
      if (issueError) throw issueError;

      const { data: reportsData, error: reportsError } = await supabase
        .from('civic_reports')
        .select('*')
        .eq('issue_id', issueId);
      if (reportsError) throw reportsError;

      return res.json({
        success: true,
        issue: issueData,
        reports: (reportsData || []).map(formatReportRow)
      });
    } catch (err) {
      console.error('Supabase issue details fetch error, falling back to memory:', err.message);
    }
  }

  // Fallback memory issue details
  const issue = fallbackIssues.find(i => i.id === issueId);
  if (!issue) {
    return res.status(404).json({ success: false, message: 'Issue not found' });
  }

  const reports = fallbackReports.filter(r => r.issue_id === issueId);
  res.json({
    success: true,
    issue,
    reports
  });
});

// DELETE /api/reports/:id - Delete a report from Supabase DB or Fallback Memory
app.delete('/api/reports/:id', async (req, res) => {
  const { id } = req.params;

  let reportToDelete = null;

  if (supabase) {
    try {
      // Find report first to get its issue_id
      const { data: fetchReport, error: fetchErr } = await supabase
        .from('civic_reports')
        .select('*')
        .eq('id', id)
        .single();

      if (!fetchErr && fetchReport) {
        reportToDelete = fetchReport;

        // Delete report
        const { error: deleteErr } = await supabase
          .from('civic_reports')
          .delete()
          .eq('id', id);

        if (deleteErr) throw deleteErr;

        // Update issue cluster
        if (reportToDelete.issue_id) {
          const { data: issue, error: issueFetchErr } = await supabase
            .from('issues')
            .select('*')
            .eq('id', reportToDelete.issue_id)
            .single();

          if (!issueFetchErr && issue) {
            const newCount = issue.report_count - 1;
            if (newCount <= 0) {
              // Delete issue if no reports left
              await supabase.from('issues').delete().eq('id', issue.id);
            } else {
              // Recalculate priority
              const reportScore = calculateReportScore(newCount);
              const facilityScore = issue.nearby_facility ? 100 : 0;
              const trafficScore = issue.high_traffic_area ? 100 : 0;
              const priorityScore = calculatePriority(reportScore, facilityScore, trafficScore);
              const priorityLevel = getPriorityLevel(priorityScore);
              const newSeverity = mapPriorityToSeverity(priorityScore);

              await supabase
                .from('issues')
                .update({
                  report_count: newCount,
                  priority_score: priorityScore,
                  priority_level: priorityLevel,
                  updated_at: new Date().toISOString()
                })
                .eq('id', issue.id);

              // Cascade updated severity & duplicates count to remaining reports
              await supabase
                .from('civic_reports')
                .update({
                  severity: newSeverity,
                  duplicates_count: newCount
                })
                .eq('issue_id', issue.id);
            }
          }
        }
        return res.json({ success: true, message: 'Report deleted successfully' });
      }
    } catch (err) {
      console.error('Supabase delete error, trying memory fallback:', err.message);
    }
  }

  // Fallback memory delete
  const index = fallbackReports.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  reportToDelete = fallbackReports[index];
  fallbackReports.splice(index, 1);

  if (reportToDelete.issue_id) {
    const issue = fallbackIssues.find(i => i.id === reportToDelete.issue_id);
    if (issue) {
      const newCount = issue.report_count - 1;
      if (newCount <= 0) {
        const issueIndex = fallbackIssues.findIndex(i => i.id === issue.id);
        if (issueIndex !== -1) fallbackIssues.splice(issueIndex, 1);
      } else {
        issue.report_count = newCount;
        const reportScore = calculateReportScore(newCount);
        const facilityScore = issue.nearby_facility ? 100 : 0;
        const trafficScore = issue.high_traffic_area ? 100 : 0;
        issue.priority_score = calculatePriority(reportScore, facilityScore, trafficScore);
        issue.priority_level = getPriorityLevel(issue.priority_score);
        issue.updated_at = new Date().toISOString();

        const newSeverity = mapPriorityToSeverity(issue.priority_score);
        fallbackReports.forEach(r => {
          if (r.issue_id === issue.id) {
            r.severity = newSeverity;
            r.duplicatesCount = newCount;
          }
        });
      }
    }
  }

  res.json({ success: true, message: 'Report deleted successfully' });
});

// Serve main frontend
app.get('/{0,}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`CivicResolve server running on http://localhost:${PORT}`);
});
