// Configuration & API Endpoint
const API_BASE = 'http://localhost:8000/api';
let isBackendConnected = false;

// Application State
let reportsData = [];
let officialsData = [];
let map = null;
let markers = [];
let activeDepartmentFilter = 'ALL';

// Default Dummy Data matching public_use branch
const MOCK_OFFICIALS = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Ramesh Kumar', department: 'Highways & Roads', zone: 'Zone A', active: true },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Suresh Babu', department: 'Highways & Roads', zone: 'Zone B', active: true },
  { id: '00000000-0000-0000-0000-000000000003', name: 'Lakshmi Priya', department: 'Water Supply & Drainage', zone: 'Zone A', active: true },
  { id: '00000000-0000-0000-0000-000000000004', name: 'Karthik Raja', department: 'Water Supply & Drainage', zone: 'Zone B', active: true },
  { id: '00000000-0000-0000-0000-000000000005', name: 'Divya Shree', department: 'Solid Waste Management', zone: 'Zone A', active: true },
  { id: '00000000-0000-0000-0000-000000000006', name: 'Mohan Das', department: 'Solid Waste Management', zone: 'Zone B', active: true },
  { id: '00000000-0000-0000-0000-000000000007', name: 'Anitha R', department: 'Electrical Department', zone: 'Zone A', active: true },
  { id: '00000000-0000-0000-0000-000000000008', name: 'Vijay Anand', department: 'Electrical Department', zone: 'Zone B', active: true }
];

const MOCK_REPORTS = [
  { id: 'REP-4091', category: 'Pothole / Road Hazard', department: 'Highways & Roads', description: 'Dangerous crater-sized pothole right after the signal. Causing severe traffic skids and accidents.', location: 'Anna Salai, Near Spencers Plaza, Chennai', lat: 13.0604, lng: 80.2496, status: 'In Progress', severity: 4, duplicatesCount: 5, imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=500&q=80', timestamp: new Date(Date.now() - 5*86400000).toISOString(), reporterPhone: '+91 9876543210', assigned_to: '00000000-0000-0000-0000-000000000001' },
  { id: 'REP-4088', category: 'Garbage Overflow', department: 'Solid Waste Management', description: 'Community bin overflowing for 3 days. Blocking sidewalk completely and foul smell.', location: 'T. Nagar 3rd Main Rd, Chennai', lat: 13.0418, lng: 80.2341, status: 'Pending', severity: 3, duplicatesCount: 2, imageUrl: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=500&q=80', timestamp: new Date(Date.now() - 2*86400000).toISOString(), reporterPhone: '+91 9123456789', assigned_to: '00000000-0000-0000-0000-000000000005' },
  { id: 'REP-4072', category: 'Broken Streetlight', department: 'Electrical Department', description: 'Streetlights not functioning for the entire block near school. Complete darkness.', location: 'Velachery Bypass Rd, Chennai', lat: 12.9815, lng: 80.2180, status: 'Resolved', severity: 2, duplicatesCount: 1, imageUrl: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=500&q=80', timestamp: new Date(Date.now() - 6*86400000).toISOString(), reporterPhone: '+91 9988776655', assigned_to: '00000000-0000-0000-0000-000000000007' },
  { id: 'REP-4065', category: 'Water Leakage', department: 'Water Supply & Drainage', description: 'Major underground water pipeline burst leaking drinking water onto road continuously.', location: 'Adyar Signal Junction, Chennai', lat: 13.0067, lng: 80.2570, status: 'Pending', severity: 5, duplicatesCount: 4, imageUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?w=500&q=80', timestamp: new Date(Date.now() - 1*86400000).toISOString(), reporterPhone: '+91 9444332211', assigned_to: '00000000-0000-0000-0000-000000000003' },
  { id: 'REP-4050', category: 'Fallen Tree Branch', department: 'Highways & Roads', description: 'Large tree branch hanging precariously over electric wires near hospital.', location: 'Kilmauk Garden Rd, Chennai', lat: 13.0870, lng: 80.2095, status: 'In Progress', severity: 4, duplicatesCount: 3, imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=500&q=80', timestamp: new Date(Date.now() - 3*86400000).toISOString(), reporterPhone: '+91 9884011223', assigned_to: '00000000-0000-0000-0000-000000000002' }
];

// Priority score logic (matches PL/pgSQL function)
function calculatePriorityScore(report) {
  let deptWeight = 1;
  if (report.department === 'Highways & Roads' || report.department === 'Water Supply & Drainage') deptWeight = 5;
  else if (report.department === 'Solid Waste Management' || report.department === 'Electrical Department') deptWeight = 3;

  let keywordBoost = 0;
  const desc = (report.description || '').toLowerCase();
  const keywords = ['accident', 'flood', 'school', 'hospital', 'children', 'collapse', 'electric shock', 'fire'];
  if (keywords.some(kw => desc.includes(kw))) {
    keywordBoost = 5;
  }

  const createdTime = new Date(report.timestamp || report.created_at).getTime();
  const daysOpen = (Date.now() - createdTime) / 86400000;
  const duplicates = report.duplicatesCount || report.duplicates_count || 1;

  const score = deptWeight + keywordBoost + (duplicates * 2) + (daysOpen * 0.5);
  return Math.round(score * 10) / 10;
}

// Initializer
document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  await checkBackendStatus();
  await loadData();
  renderAllViews();
});

// Check backend status
async function checkBackendStatus() {
  const statusLabel = document.getElementById('status-text');
  const statusDot = document.querySelector('#backend-status-indicator .status-dot');
  try {
    const res = await fetch(`${API_BASE}/../`, { method: 'GET' });
    if (res.ok) {
      isBackendConnected = true;
      statusLabel.textContent = 'FastAPI Backend Online';
      statusDot.className = 'status-dot online';
      return;
    }
  } catch (e) {}
  isBackendConnected = false;
  statusLabel.textContent = 'Interactive Demo Mode';
  statusDot.className = 'status-dot';
  statusDot.style.backgroundColor = '#f59e0b';
}

// Load data
async function loadData() {
  if (isBackendConnected) {
    try {
      const repRes = await fetch(`${API_BASE}/reports`);
      reportsData = await repRes.json();

      const offRes = await fetch(`${API_BASE}/officials`);
      officialsData = await offRes.json();
      return;
    } catch (e) {
      console.warn('API error, falling back to mock data', e);
    }
  }

  reportsData = [...MOCK_REPORTS];
  officialsData = [...MOCK_OFFICIALS];
}

// Leaflet Map setup
function initMap() {
  map = L.map('citizen-map').setView([13.0604, 80.2496], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  map.on('click', (e) => {
    document.getElementById('lat-input').value = e.latlng.lat.toFixed(6);
    document.getElementById('lng-input').value = e.latlng.lng.toFixed(6);
    scanNearby(e.latlng.lat, e.latlng.lng);
  });
}

function updateMapMarkers() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  reportsData.forEach(r => {
    if (r.lat && r.lng) {
      const score = calculatePriorityScore(r);
      const color = score >= 10 ? '#ef4444' : (score >= 6 ? '#f97316' : '#3b82f6');
      const marker = L.circleMarker([r.lat, r.lng], {
        radius: 8,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family:sans-serif;">
          <strong>[${r.department}] Priority: ${score}</strong><br>
          ${r.description}<br>
          <small>Status: ${r.status} | Duplicates: ${r.duplicatesCount || 1}</small>
        </div>
      `);
      markers.push(marker);
    }
  });
}

function scanNearby(lat, lng) {
  const summaryEl = document.getElementById('nearby-summary');
  const nearby = reportsData.filter(r => {
    const dLat = (r.lat - lat) * 111000;
    const dLng = (r.lng - lng) * 111000 * Math.cos(lat * Math.PI / 180);
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    return dist <= 1500 && r.status !== 'Resolved';
  });

  if (nearby.length > 0) {
    summaryEl.innerHTML = `
      <span style="color: #ea580c; font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> Found ${nearby.length} existing issue(s) nearby:</span>
      "${nearby[0].description}" (${nearby[0].duplicatesCount || 1} reporters)
      <button class="btn btn-secondary btn-sm" onclick="upvoteReport('${nearby[0].id}')">+1 Upvote Duplicate</button>
    `;
  } else {
    summaryEl.innerHTML = `<span><i class="fa-solid fa-circle-check" style="color:#10b981;"></i> Location clear! No nearby active complaints found within 1.5km.</span>`;
  }
}

function switchTab(tabId) {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));

  document.getElementById(`tab-${tabId}`).classList.add('active');
  document.getElementById(`view-${tabId}`).classList.add('active');

  if (tabId === 'citizen' && map) {
    setTimeout(() => map.invalidateSize(), 200);
  }
}

function insertKeyword(kw) {
  const txt = document.getElementById('description-input');
  txt.value = (txt.value + ' ' + kw).trim();
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const dept = document.getElementById('department-select').value;
  const desc = document.getElementById('description-input').value;
  const lat = parseFloat(document.getElementById('lat-input').value);
  const lng = parseFloat(document.getElementById('lng-input').value);

  if (isBackendConnected) {
    try {
      const res = await fetch(`${API_BASE}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: dept, description: desc, lat, lng })
      });
      if (res.ok) {
        await loadData();
        renderAllViews();
        alert('Complaint submitted successfully!');
        document.getElementById('report-form').reset();
        return;
      }
    } catch (err) {
      console.error(err);
    }
  }

  const newReport = {
    id: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
    category: 'General Complaint',
    department: dept,
    description: desc,
    location: 'Anna Salai, Chennai (GPS Locked)',
    lat,
    lng,
    status: 'Pending',
    severity: 3,
    duplicatesCount: 1,
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=500&q=80',
    timestamp: new Date().toISOString(),
    reporterPhone: '+91 9876543210',
    assigned_to: '00000000-0000-0000-0000-000000000001'
  };

  reportsData.unshift(newReport);
  renderAllViews();
  alert('Complaint submitted! Added to Priority Queue.');
  document.getElementById('description-input').value = '';
}

async function upvoteReport(id) {
  if (isBackendConnected) {
    await fetch(`${API_BASE}/reports/${id}/upvote`, { method: 'POST' });
    await loadData();
    renderAllViews();
    return;
  }

  const item = reportsData.find(r => r.id === id);
  if (item) {
    item.duplicatesCount = (item.duplicatesCount || 1) + 1;
    renderAllViews();
    alert(`Upvoted! Total duplicates reported is now ${item.duplicatesCount}.`);
  }
}

async function updateStatus(id, newStatus) {
  if (isBackendConnected) {
    await fetch(`${API_BASE}/reports/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    await loadData();
    renderAllViews();
    return;
  }

  const item = reportsData.find(r => r.id === id);
  if (item) {
    item.status = newStatus;
    renderAllViews();
  }
}

function filterQueue(dept) {
  activeDepartmentFilter = dept;
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.classList.toggle('active', chip.textContent.includes(dept) || (dept === 'ALL' && chip.textContent.includes('All')));
  });
  renderPriorityQueue();
}

function renderAllViews() {
  updateMapMarkers();
  renderPriorityQueue();
  renderOfficials();
  renderAnalytics();
}

function renderPriorityQueue() {
  const tbody = document.getElementById('queue-table-body');
  let list = [...reportsData];

  if (activeDepartmentFilter !== 'ALL') {
    list = list.filter(r => r.department === activeDepartmentFilter);
  }

  list.forEach(r => r.score = calculatePriorityScore(r));
  list.sort((a, b) => b.score - a.score);

  tbody.innerHTML = list.map(r => {
    const official = officialsData.find(o => o.id === r.assigned_to);
    const scoreClass = r.score >= 10 ? 'score-high' : (r.score >= 6 ? 'score-med' : 'score-low');
    
    return `
      <tr>
        <td><span class="score-badge ${scoreClass}">${r.score}</span></td>
        <td><strong>${r.id}</strong></td>
        <td><strong>${r.department}</strong></td>
        <td>${r.description}</td>
        <td><i class="fa-solid fa-users"></i> ${r.duplicatesCount || 1}</td>
        <td><span class="status-pill status-${(r.status || 'Pending').replace(' ', '-')}">${r.status}</span></td>
        <td>${official ? official.name : 'Unassigned'}</td>
        <td>
          ${r.status !== 'Resolved' ? `
            <button class="btn btn-secondary btn-sm" onclick="updateStatus('${r.id}', 'In Progress')">In Progress</button>
            <button class="btn btn-primary btn-sm" onclick="updateStatus('${r.id}', 'Resolved')">Resolve</button>
          ` : `<span style="color:#10b981; font-weight:700;"><i class="fa-solid fa-check-double"></i> Resolved</span>`}
        </td>
      </tr>
    `;
  }).join('');
}

function renderOfficials() {
  const container = document.getElementById('officials-card-grid');
  container.innerHTML = officialsData.map(o => {
    const assignedReports = reportsData.filter(r => r.assigned_to === o.id && r.status !== 'Resolved');
    return `
      <div class="official-card">
        <div class="official-header">
          <div class="avatar">${o.name.charAt(0)}</div>
          <div class="official-info">
            <h4>${o.name}</h4>
            <span>${o.department} • ${o.zone}</span>
          </div>
        </div>
        <div class="score-formula-box" style="margin-bottom:0.75rem;">
          <i class="fa-solid fa-briefcase"></i> ${assignedReports.length} Active Tasks Assigned
        </div>
        ${assignedReports.map(r => `
          <div style="font-size:0.8rem; padding:6px 0; border-top:1px solid #f1f5f9;">
            📌 <strong>[Priority ${calculatePriorityScore(r)}]</strong> ${r.description}
          </div>
        `).join('')}
      </div>
    `;
  }).join('');
}

function renderAnalytics() {
  const total = reportsData.length;
  const resolved = reportsData.filter(r => r.status === 'Resolved' || r.status === 'Closed').length;
  const open = total - resolved;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-open').textContent = open;
  document.getElementById('stat-resolved').textContent = resolved;

  const deptCounts = {};
  reportsData.forEach(r => {
    deptCounts[r.department] = (deptCounts[r.department] || 0) + 1;
  });

  const barsContainer = document.getElementById('dept-breakdown-bars');
  barsContainer.innerHTML = Object.keys(deptCounts).map(dept => {
    const count = deptCounts[dept];
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return `
      <div class="dept-bar-row">
        <div class="dept-bar-label">
          <span>${dept}</span>
          <span>${count} reports (${pct}%)</span>
        </div>
        <div class="dept-progress">
          <div class="dept-progress-fill" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function useCurrentLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
      document.getElementById('lat-input').value = pos.coords.latitude.toFixed(6);
      document.getElementById('lng-input').value = pos.coords.longitude.toFixed(6);
      map.setView([pos.coords.latitude, pos.coords.longitude], 14);
      scanNearby(pos.coords.latitude, pos.coords.longitude);
    });
  }
}
