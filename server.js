try { require('dotenv').config(); } catch (e) {}
let express;
try { express = require('express'); } catch (e) {}
const path = require('path');
const http = require('http');
const fs = require('fs');
let multer;
try { multer = require('multer'); } catch (e) {}
let createClient;
try { ({ createClient } = require('@supabase/supabase-js')); } catch (e) {}
const { detectSpam } = require('./backend/pipeline/spamDetection');

const app = express ? express() : { use: () => {}, get: () => {}, post: () => {}, patch: () => {}, listen: () => {} };
const PORT = process.env.PORT || 3000;

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
let supabase = null;

if (createClient && supabaseUrl && supabaseKey && !supabaseUrl.includes('your-supabase-project')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase database integration initialized.');
  } catch (err) {
    console.warn('Supabase initialization error:', err.message);
  }
} else {
  console.warn('Supabase URL/Key missing or default. Operating with empty memory fallback.');
}

// Configure multer for local file uploads
let upload = { single: () => (req, res, next) => next() };
if (multer) {
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
  upload = multer({ storage: storage });
}

// Middleware
if (express) {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, 'public')));
}

// ZERO DUMMY DATA ENFORCEMENT: Empty memory fallback reports list
let fallbackReports = [];

/**
 * AI Categorization Engine
 * Classifies input description into one of 4 departments/category codes:
 * - road_and_highways
 * - water_and_sewage
 * - electrical
 * - other
 */
function classifyReport(description = '') {
  const descLower = (description || '').toLowerCase();

  const roadKeywords = ['pothole', 'road', 'footpath', 'traffic signal', 'asphalt', 'pavement', 'highway'];
  const waterKeywords = ['water leak', 'water', 'drain', 'sewage', 'pipe', 'leak', 'overflow'];
  const electricalKeywords = ['streetlight', 'electrical', 'power', 'light', 'lamp', 'wire', 'transformer'];

  const isRoad = roadKeywords.some(k => descLower.includes(k));
  const isWater = waterKeywords.some(k => descLower.includes(k));
  const isElectrical = electricalKeywords.some(k => descLower.includes(k));

  if (isRoad) {
    return {
      categoryCode: 'road_and_highways',
      departmentKey: 'road_and_highways',
      department: 'Highways & Roads',
      category: 'Road & Highway Issue'
    };
  }

  if (isWater) {
    return {
      categoryCode: 'water_and_sewage',
      departmentKey: 'water_and_sewage',
      department: 'Water Supply & Drainage',
      category: 'Water & Sewage Issue'
    };
  }

  if (isElectrical) {
    return {
      categoryCode: 'electrical',
      departmentKey: 'electrical',
      department: 'Electrical Department',
      category: 'Electrical Issue'
    };
  }

  return {
    categoryCode: 'other',
    departmentKey: 'other',
    department: 'Solid Waste Management',
    category: 'General / Other Issue'
  };
}

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

// --- REST API ENDPOINTS (Express Mode) ---
if (express) {
  app.get('/api/reports', async (req, res) => {
    const { department, includeSpam } = req.query;

    if (supabase) {
      try {
        let query = supabase.from('civic_reports').select('*').order('timestamp', { ascending: false });
        if (includeSpam !== 'true') {
          query = query.neq('status', 'Spam');
        }
        if (department && department !== 'All') {
          query = query.eq('department', department);
        }
        const { data, error } = await query;
        if (error) throw error;
        const formatted = (data || []).map(formatReportRow);
        return res.json(formatted);
      } catch (err) {
        console.error('Supabase fetch error, returning memory list:', err.message);
      }
    }

    let list = fallbackReports;
    if (includeSpam !== 'true') {
      list = fallbackReports.filter(r => r.status !== 'Spam');
    }
    if (department && department !== 'All') {
      list = list.filter(r => r.department === department);
    }
    res.json(list);
  });

  app.post('/api/reports', upload.single('image'), async (req, res) => {
    const { description, location, lat, lng, reporterPhone, device_id, deviceId } = req.body;

    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.imageUrl && !req.body.imageUrl.includes('unsplash.com')) {
      imageUrl = req.body.imageUrl;
    }

    const deviceIdentifier = device_id || deviceId || req.headers['x-device-id'] || 'device-default';

    const newReportData = {
      id: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
      category: "",
      department: "",
      description: description || '',
      location: location || '',
      lat: parseFloat(lat) || 0,
      lng: parseFloat(lng) || 0,
      status: "Pending",
      severity: Math.floor(Math.random() * 3) + 2,
      duplicates_count: 1,
      image_url: imageUrl,
      timestamp: new Date().toISOString(),
      reporter_phone: reporterPhone || "",
      device_id: deviceIdentifier
    };

    // STAGE 1: SPAM DETECTION PIPELINE
    const spamResult = await detectSpam(newReportData);

    if (spamResult.error) {
      return res.status(500).json({ success: false, error: spamResult.error.message });
    }

    if (spamResult.pipeline.continue === false) {
      return res.status(200).json({
        success: false,
        message: 'Report identified as spam and pipeline halted.',
        result: spamResult
      });
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('civic_reports')
          .insert([spamResult.report])
          .select();

        if (error) throw error;
        const createdReport = formatReportRow(data[0]);
        return res.status(201).json({
          success: true,
          report: createdReport,
          result: spamResult
        });
      } catch (err) {
        console.error('Supabase insert error, saving to memory fallback:', err.message);
      }
    }

    const formattedReport = formatReportRow(spamResult.report);
    fallbackReports.unshift(formattedReport);
    return res.status(201).json({
      success: true,
      report: formattedReport,
      result: spamResult
    });
  });

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

    const report = fallbackReports.find(r => r.id === id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    report.status = status;
    res.json({ success: true, report });
  });

  app.get('/{0,}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

// Start Server if run directly
if (require.main === module) {
  if (express) {
    app.listen(PORT, () => {
      console.log(`CivicResolve Express server running on http://localhost:${PORT}`);
    });
  } else {
    // Native HTTP Server Fallback for zero-dependency execution
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

      if (url.pathname === '/api/reports' && req.method === 'GET') {
        const includeSpam = url.searchParams.get('includeSpam') === 'true';
        const list = includeSpam ? fallbackReports : fallbackReports.filter(r => r.status !== 'Spam');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(list));
      }

      if (url.pathname === '/api/reports' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          let parsed = {};
          try { parsed = JSON.parse(body); } catch(e) {}
          const deviceIdentifier = parsed.device_id || parsed.deviceId || req.headers['x-device-id'] || 'device-default';
          const rawReport = {
            id: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
            category: '',
            department: '',
            description: parsed.description || '',
            location: parsed.location || '',
            lat: parseFloat(parsed.lat) || 0,
            lng: parseFloat(parsed.lng) || 0,
            status: 'Pending',
            severity: 3,
            duplicatesCount: 1,
            imageUrl: parsed.imageUrl || null,
            timestamp: new Date().toLocaleString(),
            reporterPhone: parsed.reporterPhone || '',
            device_id: deviceIdentifier
          };

          const result = await detectSpam(rawReport);

          if (result.spam && result.spam.isSpam) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
              success: false,
              spam: true,
              message: 'Report rejected as invalid.'
            }));
          }

          const formattedReport = formatReportRow(result.report);
          fallbackReports.unshift(formattedReport);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            report: formattedReport,
            pipeline: result.pipeline
          }));
        });
        return;
      }

      let filePath = path.join(__dirname, 'public', url.pathname === '/' ? 'index.html' : url.pathname);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(__dirname, 'public', 'index.html');
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          return res.end('Not Found');
        }
        const ext = path.extname(filePath);
        const mimeTypes = {
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg'
        };
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });

    server.listen(PORT, () => {
      console.log(`CivicResolve server running on http://localhost:${PORT}`);
    });
  }
}

module.exports = { app, classifyReport };
