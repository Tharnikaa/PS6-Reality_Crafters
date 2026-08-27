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
let fallbackReports = [
  {
    id: "REP-4091",
    category: "Pothole / Road Hazard",
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
    reporterPhone: "+91 9876543210"
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
    reporterPhone: "+91 9123456789"
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
    reporterPhone: "+91 9988776655"
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
    reporterPhone: row.reporter_phone
  };
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

  const newReportData = {
    id: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
    category: category,
    department: dept,
    description: description || '',
    location: location || 'Anna Salai, Chennai (GPS Locked)',
    lat: parseFloat(lat) || 13.0827,
    lng: parseFloat(lng) || 80.2707,
    status: "Pending",
    severity: Math.floor(Math.random() * 3) + 2,
    duplicates_count: 1,
    image_url: imageUrl,
    reporter_phone: reporterPhone || "+91 9876543210"
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('civic_reports')
        .insert([newReportData])
        .select();

      if (error) throw error;
      const createdReport = formatReportRow(data[0]);
      return res.status(201).json({ success: true, report: createdReport });
    } catch (err) {
      console.error('Supabase insert error, saving to memory fallback:', err.message);
    }
  }

  // Fallback memory insert
  const formattedReport = formatReportRow(newReportData);
  fallbackReports.unshift(formattedReport);
  res.status(201).json({ success: true, report: formattedReport });
});

// PATCH /api/reports/:id/status - Update report status in Supabase DB or Fallback Memory
app.patch('/api/reports/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('civic_reports')
        .update({ status: status })
        .eq('id', id)
        .select();

      if (error) throw error;
      if (data && data.length > 0) {
        return res.json({ success: true, report: formatReportRow(data[0]) });
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
  res.json({ success: true, report });
});

// Serve main frontend
app.get('/{0,}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`CivicResolve server running on http://localhost:${PORT}`);
});
