// ==========================================
// CivicResolve Application Logic & State
// ==========================================

// --- Application State ---
let currentLang = "en";
let currentRole = "auth-select-view";
let userPhone = "";
let adminDept = "All";
let currentCoords = {
  lat: null,
  lng: null,
  text: "Detecting GPS location...",
};
let selectedTicketId = null;
let isRecordingVoice = false;
let recognitionInstance = null;
let civicReports = [];

// --- Translations Dictionary ---
const i18n = {
  en: {
    title: "CivicResolve",
    subtitle: "AI-Powered Civic Issue Reporting & Municipal Triage",
    btnCitizen: "Citizen Portal",
    btnCitizenSub: "Report road damage, garbage, leaks",
    btnAdmin: "Municipal Staff Login",
    btnAdminSub: "Department dashboard & triage queue",
    citizenLogin: "Citizen Login",
    tabReport: "Report an Issue",
    tabTracking: "My Reported Issues",
    lblPhoto: "1. Capture Incident Photo",
    uploadTap: "Tap to take photo or upload file",
    lblDesc: "2. Describe the Issue",
    recordVoice: "Record Voice",
    recording: "Listening...",
    lblLoc: "3. Incident Location (GPS)",
    btnSubmit: "Submit Civic Report",
    offline: "You are offline. Reports will queue and sync when connected.",
    noAccount: "Don't have an account?",
    btnGotoSignup: "SIGN UP",
    hasAccount: "Already have an account?",
    btnGotoSignin: "SIGN IN",
    publicLoginTitle: "PUBLIC LOGIN",
    publicSignupTitle: "CREATE ACCOUNT",
  },
  ta: {
    title: "மக்கள் சேவை",
    subtitle: "தானியங்கி மக்கள் குறைதீர்ப்பு தளம்",
    btnCitizen: "பொதுமக்கள் உள்நுழைவு",
    btnCitizenSub: "சாலை, குப்பை, விளக்கு புகார்களை பதிவிட",
    btnAdmin: "அதிகாரிகள் உள்நுழைவு",
    btnAdminSub: "துறை வாரியான மேலாண்மை தளம்",
    citizenLogin: "பொதுமக்கள் உள்நுழைவு",
    tabReport: "புகார் பதிவு செய்க",
    tabTracking: "எனது புகார்கள்",
    lblPhoto: "1. புகைப்படம் எடுக்கவும்",
    uploadTap: "புகைப்படம் எடுக்க இங்கு தொடவும்",
    lblDesc: "2. பிரச்சனை விவரம்",
    recordVoice: "குரல் மூலம் பேச",
    recording: "கேட்கிறது...",
    lblLoc: "3. இருக்கும் இடம் (GPS)",
    btnSubmit: "புகாரை சமர்ப்பிக்கவும்",
    offline: "இணைய இணைப்பு இல்லை. இணைப்பு வந்ததும் பதிவேற்றப்படும்.",
    noAccount: "கணக்கு இல்லையா?",
    btnGotoSignup: "பதிவு செய்க (SIGN UP)",
    hasAccount: "ஏற்கனவே கணக்கு உள்ளதா?",
    btnGotoSignin: "உள்நுழையவும் (SIGN IN)",
    publicLoginTitle: "பொதுமக்கள் உள்நுழைவு",
    publicSignupTitle: "கணக்கை உருவாக்கவும்",
  },
  hi: {
    title: "नागरिक समाधान",
    subtitle: "எஐ-संचालित नागरिक समस्या निवारण पोर्टल",
    btnCitizen: "नागरिक पोर्टल",
    btnCitizenSub: "सड़क, कचरा, बिजली की शिकायत दर्ज करें",
    btnAdmin: "नगर निगम लॉगिन",
    btnAdminSub: "विभागीय डैशबोर्ड और ट्राइएज कतार",
    citizenLogin: "नागरिक लॉगिन",
    tabReport: "समस्या दर्ज करें",
    tabTracking: "मेरी दर्ज शिकायतें",
    lblPhoto: "1. समस्या का फोटो लें",
    uploadTap: "फोटो खींचने के लिए टैप करें",
    lblDesc: "2. समस्या का विवरण",
    recordVoice: "आवाज से बताएं",
    recording: "सुन रहे हैं...",
    lblLoc: "3. समस्या का स्थान (GPS)",
    btnSubmit: "शिकायत दर्ज करें",
    offline: "आप ऑफ़लाइन हैं। नेटवर्क आने पर रिपोर्ट भेजी जाएगी।",
    noAccount: "खाता नहीं है?",
    btnGotoSignup: "साइन अप करें (SIGN UP)",
    hasAccount: "पहले से खाता है?",
    btnGotoSignin: "साइन इन करें (SIGN IN)",
    publicLoginTitle: "नागरिक लॉगिन",
    publicSignupTitle: "नया खाता बनाएं",
  },
};

// --- IndexedDB for Offline Queue ---
const DB_NAME = "CivicResolveOfflineDB";
const STORE_NAME = "offline_reports";

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "offlineId",
          autoIncrement: true,
        });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function queueOfflineReport(reportData) {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(reportData);
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

async function getQueuedReports() {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function deleteQueuedReport(offlineId) {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(offlineId);
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

async function syncOfflineReports() {
  if (!navigator.onLine) return;
  const queued = await getQueuedReports();
  if (queued.length === 0) return;

  const banner = document.getElementById("offline-banner");
  if (banner) {
    banner.classList.remove("hidden");
    banner.className =
      "bg-indigo-600 text-white px-4 py-1 text-xs font-semibold text-center flex items-center justify-center gap-2 animate-pulse";
    banner.innerHTML = `<i class="fa-solid fa-sync fa-spin"></i> Syncing ${queued.length} offline report(s)...`;
  }

  for (const report of queued) {
    const formData = new FormData();
    formData.append("description", report.description);
    formData.append("location", report.location);
    formData.append("lat", report.lat);
    formData.append("lng", report.lng);
    formData.append("reporterPhone", report.reporterPhone);

    if (report.image) {
      try {
        const response = await fetch(report.image);
        const blob = await response.blob();
        formData.append("image", blob, "offline-image.jpg");
      } catch (err) {
        console.error("Error recovering offline image blob:", err);
      }
    }

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        await deleteQueuedReport(report.offlineId);
      }
    } catch (err) {
      console.error("Failed syncing report:", err);
    }
  }

  if (banner) {
    banner.classList.add("hidden");
  }
  await fetchReports();
  renderCitizenReports();
}

// --- App Initialization ---
window.addEventListener("DOMContentLoaded", async () => {
  initGeolocation();
  initNetworkListeners();
  await syncOfflineReports();
  await fetchReports();
  if (civicReports.length > 0) {
    selectedTicketId = civicReports[0].id;
  }
});

// --- Fetch Reports from Server ---
async function fetchReports() {
  try {
    const res = await fetch("/api/reports");
    civicReports = await res.json();
  } catch (err) {
    console.error("Error fetching reports from server:", err);
  }
}

// --- View Navigation Router ---
function showView(viewId) {
  const views = [
    "auth-select-view",
    "citizen-login-view",
    "admin-login-view",
    "citizen-app-view",
    "admin-app-view",
  ];
  views.forEach((v) => {
    const el = document.getElementById(v);
    if (el) el.classList.add("hidden");
  });

  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.remove("hidden");
  }
  currentRole = viewId;

  const switchBtn = document.getElementById("switch-role-btn");
  if (switchBtn) {
    if (viewId === "auth-select-view") {
      switchBtn.classList.add("hidden");
    } else {
      switchBtn.classList.remove("hidden");
    }
  }

  if (viewId === "admin-app-view") {
    fetchAndRenderAdminQueue();
  }
}

// --- Citizen Tab Switching ---
async function switchCitizenTab(tab) {
  const tabNew = document.getElementById("citizen-tab-new");
  const tabMy = document.getElementById("citizen-tab-my");
  const btnNew = document.getElementById("tab-btn-new");
  const btnMy = document.getElementById("tab-btn-my");

  if (tab === "new-report") {
    if (tabNew) tabNew.classList.remove("hidden");
    if (tabMy) tabMy.classList.add("hidden");
    if (btnNew) {
      btnNew.className =
        "pb-3 px-4 font-semibold text-sm border-b-2 border-indigo-600 text-indigo-600 transition";
    }
    if (btnMy) {
      btnMy.className =
        "pb-3 px-4 font-semibold text-sm border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition";
    }
  } else {
    if (tabNew) tabNew.classList.add("hidden");
    if (tabMy) tabMy.classList.remove("hidden");
    if (btnMy) {
      btnMy.className =
        "pb-3 px-4 font-semibold text-sm border-b-2 border-indigo-600 text-indigo-600 transition";
    }
    if (btnNew) {
      btnNew.className =
        "pb-3 px-4 font-semibold text-sm border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition";
    }
    await fetchReports();
    renderCitizenReports();
  }
}

// --- Auth Handlers ---
function handleCitizenLogin(e) {
  e.preventDefault();
  userPhone = document.getElementById("citizen-phone-input").value;
  showView("citizen-app-view");
  switchCitizenTab("new-report");
}

function handleAdminLogin(e) {
  e.preventDefault();
  adminDept = document.getElementById("admin-dept-select").value;
  const filterDept = document.getElementById("admin-filter-dept");
  if (filterDept) filterDept.value = adminDept;
  showView("admin-app-view");
}

// --- Coordinate Formatting ---
function formatCoordinatePair(lat, lng) {
  const safeLat = Number.isFinite(lat)
    ? Number(lat)
    : Number.isFinite(currentCoords.lat)
      ? currentCoords.lat
      : null;
  const safeLng = Number.isFinite(lng)
    ? Number(lng)
    : Number.isFinite(currentCoords.lng)
      ? currentCoords.lng
      : null;

  if (safeLat === null || safeLng === null) {
    return "Detecting GPS location...";
  }

  return `${safeLat.toFixed(6)}, ${safeLng.toFixed(6)}`;
}

// --- Reverse Geocoding with Detailed Address Formatting ---
async function reverseGeocode(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          "Accept-Language": currentLang === "ta" ? "ta,en" : currentLang === "hi" ? "hi,en" : "en",
        },
      }
    );
    const data = await response.json();
    if (data && data.address) {
      const a = data.address;
      const parts = [
        a.building || a.amenity || a.house_number ? `${a.house_number || ""} ${a.building || a.amenity || ""}`.trim() : null,
        a.road || a.street || a.pedestrian || a.footway || a.residential,
        a.neighbourhood || a.suburb || a.city_district || a.subdistrict,
        a.city || a.town || a.village || a.county,
        a.state,
        a.postcode,
      ].filter(Boolean);

      if (parts.length >= 2) {
        return parts.join(", ");
      }
    }
    if (data && data.display_name) {
      return data.display_name.split(",").slice(0, 5).join(",").trim();
    }
  } catch (err) {
    console.warn("Reverse geocoding error:", err);
  }
  return `Lat: ${Number(lat).toFixed(6)}, Lng: ${Number(lng).toFixed(6)}`;
}

// --- Manual Address Search & Auto-Geocoding ---
let searchDebounceTimer = null;
function handleLocationInput(value) {
  currentCoords.text = value;
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    if (value && value.trim().length >= 3) {
      searchAddressCoordinates(value);
    }
  }, 1000);
}

async function searchAddressCoordinates(query) {
  if (!query || query.trim().length < 3) return;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      {
        headers: { "Accept-Language": "en" },
      }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      const result = data[0];
      const lat = parseFloat(Number(result.lat).toFixed(6));
      const lng = parseFloat(Number(result.lon).toFixed(6));
      currentCoords.lat = lat;
      currentCoords.lng = lng;
      const coordsEl = document.getElementById("selected-coordinates");
      if (coordsEl) {
        coordsEl.innerText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }
    }
  } catch (e) {
    console.warn("Search address coordinates error:", e);
  }
}

// --- Location Display Update ---
function updateLocationDisplay(lat, lng, labelText = null) {
  if (Number.isFinite(lat)) currentCoords.lat = parseFloat(Number(lat).toFixed(6));
  if (Number.isFinite(lng)) currentCoords.lng = parseFloat(Number(lng).toFixed(6));
  if (labelText) currentCoords.text = labelText;

  const inputEl = document.getElementById("report-location-input");
  if (inputEl && labelText) {
    inputEl.value = labelText;
  }

  const coordsEl = document.getElementById("selected-coordinates");
  if (coordsEl) {
    coordsEl.innerText = formatCoordinatePair(
      currentCoords.lat,
      currentCoords.lng,
    );
  }
}

// --- Geolocation Detector with High Accuracy & Fallback ---
function initGeolocation() {
  detectGPSLocation();
}

function detectGPSLocation() {
  const inputEl = document.getElementById("report-location-input");
  const gpsBtnText = document.getElementById("gps-btn-text");
  const gpsIcon = document.getElementById("gps-icon");

  if (gpsBtnText) gpsBtnText.innerText = "Locating...";
  if (gpsIcon) gpsIcon.className = "fa-solid fa-spinner fa-spin text-indigo-600";

  if (!navigator.geolocation) {
    if (gpsBtnText) gpsBtnText.innerText = "Detect GPS";
    if (gpsIcon) gpsIcon.className = "fa-solid fa-location-crosshairs text-indigo-600";
    if (inputEl && !inputEl.value) {
      inputEl.placeholder = "Geolocation not supported. Please type address manually.";
    }
    return;
  }

  const geoOptions = {
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 0,
  };

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = parseFloat(pos.coords.latitude.toFixed(6));
      const lng = parseFloat(pos.coords.longitude.toFixed(6));

      const addressText = await reverseGeocode(lat, lng);
      updateLocationDisplay(lat, lng, addressText);

      if (gpsBtnText) gpsBtnText.innerText = "Detect GPS";
      if (gpsIcon) gpsIcon.className = "fa-solid fa-location-crosshairs text-indigo-600";
    },
    async (err) => {
      console.warn("GPS position error, trying network fallback:", err);

      // Fallback: try IP-based location if available
      try {
        const ipRes = await fetch("https://ipapi.co/json/");
        const ipData = await ipRes.json();
        if (ipData && ipData.latitude && ipData.longitude) {
          const lat = parseFloat(Number(ipData.latitude).toFixed(6));
          const lng = parseFloat(Number(ipData.longitude).toFixed(6));
          const fallbackText = `${ipData.city || ""}, ${ipData.region || ""}, ${ipData.country_name || ""}`.trim();
          updateLocationDisplay(lat, lng, fallbackText || `Approx. ${lat}, ${lng}`);
        }
      } catch (ipErr) {
        console.warn("IP fallback failed:", ipErr);
      }

      if (gpsBtnText) gpsBtnText.innerText = "Detect GPS";
      if (gpsIcon) gpsIcon.className = "fa-solid fa-location-crosshairs text-indigo-600";

      if (inputEl && !inputEl.value) {
        inputEl.placeholder = "Please enter your street name or area...";
      }
    },
    geoOptions,
  );
}

// --- Network Status Monitor ---
function initNetworkListeners() {
  const banner = document.getElementById("offline-banner");
  window.addEventListener("online", () => {
    if (banner) banner.classList.add("hidden");
    syncOfflineReports();
  });
  window.addEventListener("offline", () => {
    if (banner) banner.classList.remove("hidden");
  });
}

// --- Language Translation Engine ---
function changeLanguage(lang) {
  currentLang = lang;
  const dict = i18n[lang];
  if (!dict) return;

  const setElemText = (id, text) => {
    const el = document.getElementById(id);
    if (el && text !== undefined) el.innerText = text;
  };

  setElemText("nav-brand", dict.title);
  setElemText("txt-app-title", dict.title);
  setElemText("txt-app-subtitle", dict.subtitle);
  setElemText("txt-btn-citizen", dict.btnCitizen);
  setElemText("txt-btn-citizen-sub", dict.btnCitizenSub);
  setElemText("txt-btn-admin", dict.btnAdmin);
  setElemText("txt-btn-admin-sub", dict.btnAdminSub);
  setElemText("txt-citizen-login-title", dict.citizenLogin);
  setElemText("txt-tab-report", dict.tabReport);
  setElemText("txt-tab-tracking", dict.tabTracking);
  setElemText("txt-lbl-photo", dict.lblPhoto);
  setElemText("txt-upload-tap", dict.uploadTap);
  setElemText("txt-lbl-desc", dict.lblDesc);
  setElemText("voice-text", dict.recordVoice);
  setElemText("txt-lbl-loc", dict.lblLoc);
  setElemText("txt-btn-submit", dict.btnSubmit);
  setElemText("txt-offline", dict.offline);
}

// --- Voice Recognition (Speech-to-Text) ---
function toggleVoiceInput() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Speech recognition is not supported in this browser.");
    return;
  }

  const voiceBtn = document.getElementById("voice-btn");
  const voiceStopBtn = document.getElementById("voice-stop-btn");
  const voiceText = document.getElementById("voice-text");
  const descInput = document.getElementById("report-desc");

  if (!recognitionInstance) {
    recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.maxAlternatives = 1;

    let finalTranscript = "";

    recognitionInstance.onstart = () => {
      isRecordingVoice = true;
      finalTranscript = descInput.value;
      if (voiceBtn) {
        voiceBtn.className =
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600 border border-red-300 animate-pulse";
      }
      if (voiceText) voiceText.innerText = i18n[currentLang].recording;
      if (voiceStopBtn) voiceStopBtn.classList.remove("hidden");
    };

    recognitionInstance.onend = () => {
      isRecordingVoice = false;
      if (voiceBtn) {
        voiceBtn.className =
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition";
      }
      if (voiceText) voiceText.innerText = i18n[currentLang].recordVoice;
      if (voiceStopBtn) voiceStopBtn.classList.add("hidden");
    };

    recognitionInstance.onerror = (event) => {
      console.error("Speech Recognition Error: ", event.error);
      isRecordingVoice = false;
      if (voiceBtn) {
        voiceBtn.className =
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition";
      }
      if (voiceText) voiceText.innerText = i18n[currentLang].recordVoice;
      if (voiceStopBtn) voiceStopBtn.classList.add("hidden");
    };

    recognitionInstance.onresult = (event) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript +=
            (finalTranscript ? " " : "") + event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      descInput.value =
        finalTranscript + (interimTranscript ? " " + interimTranscript : "");
    };
  }

  recognitionInstance.lang =
    currentLang === "ta"
      ? "ta-IN"
      : currentLang === "hi"
        ? "hi-IN"
        : "en-IN";

  if (isRecordingVoice) {
    recognitionInstance.stop();
  } else {
    recognitionInstance.start();
  }
}

function stopVoiceInput() {
  if (recognitionInstance && isRecordingVoice) {
    recognitionInstance.stop();
  }
}

// --- Image Preview Handler ---
function previewFile(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (evt) {
      document.getElementById("image-preview").src = evt.target.result;
      document
        .getElementById("image-preview-container")
        .classList.remove("hidden");
      document
        .getElementById("upload-placeholder")
        .classList.add("hidden");
    };
    reader.readAsDataURL(file);
  }
}

function clearImage(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  const fileInput = document.getElementById("report-img-file");
  if (fileInput) fileInput.value = "";
  const preview = document.getElementById("image-preview");
  if (preview) preview.src = "";
  
  const previewContainer = document.getElementById("image-preview-container");
  if (previewContainer) previewContainer.classList.add("hidden");
  
  const placeholder = document.getElementById("upload-placeholder");
  if (placeholder) placeholder.classList.remove("hidden");
}

// --- Submit Civic Issue ---
async function handleReportSubmit(e) {
  e.preventDefault();
  const desc = document.getElementById("report-desc").value;
  const locationInput = document.getElementById("report-location-input");
  const locationVal = (locationInput && locationInput.value.trim())
    ? locationInput.value.trim()
    : (currentCoords.text || "Unspecified Location");
  const fileInput = document.getElementById("report-img-file");
  const submitBtn = document.getElementById("submit-btn");

  const getBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  const reportPayload = {
    description: desc,
    location: locationVal,
    lat: currentCoords.lat,
    lng: currentCoords.lng,
    reporterPhone: userPhone || "+91 9876543210",
    timestamp: new Date().toLocaleString(),
  };

  // If offline, queue locally
  if (!navigator.onLine) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-wifi-slash"></i> Offline. Queuing...`;

    if (fileInput.files.length > 0) {
      try {
        reportPayload.image = await getBase64(fileInput.files[0]);
      } catch (err) {
        console.error("Error reading file for offline storage:", err);
      }
    }

    try {
      await queueOfflineReport(reportPayload);
      alert(
        "Connection offline. Your report has been queued locally and will submit automatically when you reconnect.",
      );

      const isGarbage =
        desc.toLowerCase().includes("garbage") ||
        desc.toLowerCase().includes("waste");
      const isLight =
        desc.toLowerCase().includes("light") ||
        desc.toLowerCase().includes("lamp");

      civicReports.unshift({
        id: "PENDING-SYNC",
        category: isGarbage
          ? "Garbage Overflow"
          : isLight
            ? "Broken Streetlight"
            : "Pothole & Surface Damage",
        department: isGarbage
          ? "Solid Waste Management"
          : isLight
            ? "Electrical Department"
            : "Highways & Roads",
        description: desc,
        location: locationVal,
        status: "Pending",
        duplicatesCount: 1,
        severity: 3,
        imageUrl:
          reportPayload.image ||
          (isGarbage
            ? "/waste_resolved.jpg"
            : isLight
              ? "/light_resolved.jpg"
              : "/road_resolved.jpg"),
        timestamp: "Waiting to sync...",
        reporterPhone: reportPayload.reporterPhone,
      });
    } catch (err) {
      console.error("Failed to queue report offline:", err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane text-sm"></i> <span>${i18n[currentLang].btnSubmit}</span>`;

      document.getElementById("report-desc").value = "";
      clearImage(e);
      switchCitizenTab("my-reports");
    }
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> AI Triage & Routing...`;

  const formData = new FormData();
  formData.append("description", desc);
  formData.append("location", locationVal);
  formData.append("lat", currentCoords.lat);
  formData.append("lng", currentCoords.lng);
  formData.append("reporterPhone", userPhone || "+91 9876543210");

  if (fileInput.files.length > 0) {
    formData.append("image", fileInput.files[0]);
  }

  try {
    const res = await fetch("/api/reports", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      civicReports.unshift(data.report);
    }
  } catch (err) {
    console.error("Error submitting report:", err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane text-sm"></i> <span>${i18n[currentLang].btnSubmit}</span>`;

    document.getElementById("report-desc").value = "";
    clearImage(e);
    switchCitizenTab("my-reports");
  }
}

// --- Render Citizen Reports ---
function renderCitizenReports() {
  const container = document.getElementById("citizen-tab-my");
  const countEl = document.getElementById("citizen-report-count");
  if (countEl) countEl.innerText = civicReports.length;
  if (!container) return;
  container.innerHTML = "";

  civicReports.forEach((rep) => {
    const badgeClasses =
      {
        Pending: "bg-amber-100 text-amber-800 border-amber-200",
        Assigned: "bg-blue-100 text-blue-800 border-blue-200",
        "In Progress": "bg-indigo-100 text-indigo-800 border-indigo-200",
        Resolved: "bg-emerald-100 text-emerald-800 border-emerald-200",
      }[rep.status] || "bg-slate-100 text-slate-800 border-slate-200";

    const priority =
      rep.priority ||
      (rep.severity >= 4
        ? "High Priority"
        : rep.severity <= 2
          ? "Low Priority"
          : "Medium Priority");

    const priorityBadge =
      priority.includes("High") || priority.includes("Critical")
        ? "bg-rose-100 text-rose-800 border-rose-200"
        : priority.includes("Low")
          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
          : "bg-amber-100 text-amber-800 border-amber-200";

    const statusSteps = [
      "Pending",
      "Assigned",
      "In Progress",
      "Resolved",
    ];
    const currentStepIndex = statusSteps.indexOf(rep.status);

    const card = document.createElement("div");
    card.className =
      "bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between";
    card.innerHTML = `
    <div>
      <div class="flex items-start justify-between gap-2 mb-2">
        <div>
          <span class="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">${rep.id}</span>
          <h3 class="font-bold text-slate-900 mt-1 text-sm">${rep.category}</h3>
        </div>
        <div class="flex items-center gap-1 flex-wrap justify-end">
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full border ${priorityBadge}">${priority}</span>
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeClasses}">${rep.status}</span>
        </div>
      </div>

      <!-- Zone Badge if School/Hospital/Transit -->
      ${
        rep.zoneInfo && rep.zoneInfo.zoneType && rep.zoneInfo.zoneType !== "Residential / Community Zone"
          ? `
        <div class="mb-2">
          <span class="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full ${
            rep.zoneInfo.zoneSensitivity === "Critical"
              ? "bg-rose-50 text-rose-700 border border-rose-200 font-semibold"
              : rep.zoneInfo.zoneSensitivity === "High"
                ? "bg-amber-50 text-amber-800 border border-amber-200 font-medium"
                : "bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium"
          }">
            <i class="fa-solid ${rep.zoneInfo.zoneIcon || "fa-location-dot"}"></i>
            <span>${rep.zoneInfo.zoneType}</span>
          </span>
        </div>
      `
          : ""
      }
      
      <p class="text-xs text-slate-600 mb-3">${rep.description}</p>

      <!-- AI Priority & Triage Summary Card -->
      <div class="mb-3 p-3 bg-indigo-50/70 rounded-lg border border-indigo-100 text-xs">
        <div class="flex items-center justify-between font-bold text-indigo-900 mb-1">
          <span class="flex items-center gap-1.5"><i class="fa-solid fa-robot text-indigo-600"></i> AI Priority Triage</span>
          <span class="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded font-mono font-semibold">Sev ${rep.severity}/5</span>
        </div>
        <p class="text-slate-700 text-[11px] mb-1.5 leading-relaxed">${rep.aiAnalysis?.priorityReason || "Safety and civic risk evaluated by LLM triage engine."}</p>
        ${
          rep.zoneInfo && rep.zoneInfo.proximityAlert
            ? `<p class="text-[10px] text-indigo-700 bg-indigo-100/50 p-1.5 rounded mb-1.5 font-medium">${rep.zoneInfo.proximityAlert}</p>`
            : ""
        }
        <div class="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-indigo-100/70">
          <span><i class="fa-solid fa-camera text-indigo-500 mr-1"></i> Visual Verified</span>
          <span class="font-semibold text-indigo-700"><i class="fa-solid fa-clock mr-1"></i> Target SLA: ${rep.aiAnalysis?.estimatedSlaHours || (rep.severity >= 4 ? 4 : 24)}h</span>
        </div>
      </div>
      
      <div class="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
        <i class="fa-solid fa-location-dot text-rose-500"></i>
        <span class="truncate">${rep.location}</span>
      </div>
      
      <div class="text-[11px] text-slate-400 mb-4">
        Dept: <b class="text-slate-700">${rep.department}</b> • ${rep.timestamp}
      </div>

      <!-- Resolution Status Roadmap -->
      <div class="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
        <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Resolution Progress</div>
        <div class="flex items-center justify-between relative mt-2 px-1">
          <div class="absolute left-4 right-4 top-2 h-0.5 bg-slate-200 z-0"></div>
          ${statusSteps
            .map((step, idx) => {
              const isCompleted = idx <= currentStepIndex;
              const isActive = idx === currentStepIndex;

              let circleBg = "bg-slate-200 text-slate-500";
              let textColor = "text-slate-400";
              let icon = "fa-circle";

              if (isCompleted) {
                circleBg = "bg-emerald-600 text-white";
                textColor = "text-emerald-700 font-semibold";
                icon = "fa-circle-check";
              }
              if (isActive) {
                circleBg =
                  "bg-indigo-600 text-white ring-4 ring-indigo-100 animate-pulse";
                textColor = "text-indigo-700 font-bold";
                icon = "fa-spinner fa-spin";
              }

              return `
              <div class="flex flex-col items-center z-10 relative">
                <div class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${circleBg}">
                  <i class="fa-solid ${icon}"></i>
                </div>
                <span class="text-[9px] mt-1.5 ${textColor} text-center whitespace-nowrap">${step}</span>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
    </div>

    ${
      rep.status === "Resolved"
        ? `
      <div class="pt-3 border-t border-slate-100 flex items-center gap-2">
        <button onclick="confirmCitizenResolve('${rep.id}')" class="flex-1 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-semibold flex items-center justify-center gap-1">
          <i class="fa-solid fa-thumbs-up"></i> Confirm Resolved
        </button>
        <button onclick="reopenCitizenIssue('${rep.id}')" class="flex-1 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-semibold flex items-center justify-center gap-1">
          <i class="fa-solid fa-rotate-left"></i> Reopen
        </button>
      </div>
    `
        : ""
    }
  `;
    container.appendChild(card);
  });
}

function confirmCitizenResolve(id) {
  alert(`Issue ${id} verified and closed.`);
}

async function reopenCitizenIssue(id) {
  await updateTicketStatus(id, "In Progress");
  renderCitizenReports();
}

// --- Admin Dashboard Rendering ---
async function fetchAndRenderAdminQueue() {
  await fetchReports();
  renderAdminQueue();
}

function renderAdminQueue() {
  const filterDeptEl = document.getElementById("admin-filter-dept");
  const filterDept = filterDeptEl ? filterDeptEl.value : "All";
  const filterPriorityEl = document.getElementById("admin-filter-priority");
  const filterPriority = filterPriorityEl ? filterPriorityEl.value : "All";

  const listContainer = document.getElementById("admin-queue-list");
  if (!listContainer) return;
  listContainer.innerHTML = "";

  const filtered = civicReports.filter((r) => {
    const matchDept = filterDept === "All" ? true : r.department === filterDept;
    const matchPriority =
      filterPriority === "All"
        ? true
        : (r.priority || "").toLowerCase().includes(filterPriority.toLowerCase());
    return matchDept && matchPriority;
  });

  const openCountEl = document.getElementById("metric-open-count");
  if (openCountEl) {
    openCountEl.innerText = civicReports.filter(
      (r) => r.status !== "Resolved",
    ).length;
  }

  const dupCountEl = document.getElementById("metric-duplicates-count");
  if (dupCountEl) {
    dupCountEl.innerText = civicReports.reduce(
      (acc, curr) => acc + (curr.duplicatesCount - 1),
      0,
    );
  }

  filtered.forEach((rep) => {
    const isSelected = selectedTicketId === rep.id;
    const priority =
      rep.priority ||
      (rep.severity >= 4
        ? "High Priority"
        : rep.severity <= 2
          ? "Low Priority"
          : "Medium Priority");

    const priorityBadge =
      priority.includes("High") || priority.includes("Critical")
        ? "bg-rose-100 text-rose-800 border-rose-200"
        : priority.includes("Low")
          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
          : "bg-amber-100 text-amber-800 border-amber-200";

    const item = document.createElement("div");
    item.className = `p-3.5 rounded-xl border cursor-pointer transition ${
      isSelected
        ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
        : "border-slate-200 bg-white hover:border-slate-300"
    }`;
    item.onclick = () => {
      selectedTicketId = rep.id;
      renderAdminQueue();
    };

    item.innerHTML = `
    <div class="flex items-center justify-between mb-1">
      <span class="text-xs font-mono font-bold text-slate-700">${rep.id}</span>
      <div class="flex items-center gap-1">
        <span class="text-[9px] font-bold px-1.5 py-0.5 rounded border ${priorityBadge}">${priority.replace(" Priority", "")}</span>
        ${
          rep.duplicatesCount > 1
            ? `<span class="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">+${rep.duplicatesCount}</span>`
            : ""
        }
        <span class="text-[9px] font-bold px-1.5 py-0.5 rounded ${
          rep.severity >= 4
            ? "bg-rose-100 text-rose-800"
            : "bg-slate-100 text-slate-700"
        }">Sev ${rep.severity}/5</span>
      </div>
    </div>
    <div class="font-bold text-sm text-slate-900">${rep.category}</div>
    <div class="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-1">
      ${rep.zoneInfo?.zoneIcon ? `<i class="fa-solid ${rep.zoneInfo.zoneIcon} text-indigo-500 text-[10px]"></i>` : ""}
      <span>${rep.location}</span>
    </div>
  `;
    listContainer.appendChild(item);
  });

  renderAdminDetail();
}

function renderAdminDetail() {
  const container = document.getElementById("admin-detail-view");
  if (!container) return;

  const ticket =
    civicReports.find((r) => r.id === selectedTicketId) ||
    civicReports[0];

  if (!ticket) {
    container.innerHTML = `<p class="text-slate-400 text-sm text-center py-20">No tickets found matching the selected filters.</p>`;
    return;
  }

  const badgeClasses =
    {
      Pending: "bg-amber-100 text-amber-800 border-amber-200",
      Assigned: "bg-blue-100 text-blue-800 border-blue-200",
      "In Progress": "bg-indigo-100 text-indigo-800 border-indigo-200",
      Resolved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    }[ticket.status] || "bg-slate-100 text-slate-800 border-slate-200";

  const priority =
    ticket.priority ||
    (ticket.severity >= 4
      ? "High Priority"
      : ticket.severity <= 2
        ? "Low Priority"
        : "Medium Priority");

  const priorityBadge =
    priority.includes("High") || priority.includes("Critical")
      ? "bg-rose-100 text-rose-800 border-rose-300"
      : priority.includes("Low")
        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
        : "bg-amber-100 text-amber-800 border-amber-300";

  container.innerHTML = `
    <div class="flex items-center justify-between border-b border-slate-200 pb-3">
      <div>
        <h3 class="text-lg font-bold text-slate-900">${ticket.category}</h3>
        <div class="text-xs text-slate-500 mt-0.5">Ticket: <span class="font-mono font-bold text-slate-700">${ticket.id}</span> • Assigned: <b>${ticket.department}</b></div>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="text-xs font-bold px-2.5 py-0.5 rounded-full border ${priorityBadge}">${priority}</span>
        <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badgeClasses}">${ticket.status}</span>
      </div>
    </div>

    <!-- Multimodal LLM AI Analysis Verdict Box -->
    <div class="bg-gradient-to-r from-indigo-50/90 to-slate-50 border border-indigo-200/80 p-4 rounded-xl space-y-3 shadow-xs">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-xs shadow-xs">
            <i class="fa-solid fa-brain"></i>
          </div>
          <div>
            <div class="font-bold text-xs text-slate-900">Multimodal LLM & Location Triage</div>
            <div class="text-[10px] text-slate-500">Text Semantics + Visual Evidence + Infrastructure Proximity</div>
          </div>
        </div>
        <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-indigo-200 text-indigo-700">
          Confidence: ${ticket.aiAnalysis?.confidenceScore || 95}%
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
        <div class="bg-white p-2.5 rounded-lg border border-slate-200">
          <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <i class="fa-solid fa-align-left text-indigo-600"></i> Description Analysis
          </div>
          <p class="text-slate-700 text-[11px] leading-relaxed">${ticket.aiAnalysis?.textAnalysis || "Natural language issue features extracted."}</p>
        </div>

        <div class="bg-white p-2.5 rounded-lg border border-slate-200">
          <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <i class="fa-solid fa-eye text-indigo-600"></i> Image Vision Analysis
          </div>
          <p class="text-slate-700 text-[11px] leading-relaxed">${ticket.aiAnalysis?.imageAnalysis || "Visual features verified."}</p>
        </div>

        <div class="bg-white p-2.5 rounded-lg border border-slate-200">
          <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <i class="fa-solid ${ticket.zoneInfo?.zoneIcon || "fa-map-pin"} text-indigo-600"></i> Location Zone
          </div>
          <p class="text-slate-800 text-[11px] font-semibold">${ticket.zoneInfo?.zoneType || "Standard Zone"}</p>
          <div class="text-[10px] text-slate-500 mt-0.5">Sensitivity: <b class="${ticket.zoneInfo?.zoneSensitivity === "Critical" ? "text-rose-600" : ticket.zoneInfo?.zoneSensitivity === "High" ? "text-amber-600" : "text-slate-700"}">${ticket.zoneInfo?.zoneSensitivity || "Standard"}</b></div>
        </div>
      </div>

      <!-- Priority Decision Rationale & Proximity Alert -->
      <div class="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
        <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
          <i class="fa-solid fa-triangle-exclamation text-amber-600"></i> Priority Decision Rationale
        </div>
        <p class="text-slate-800 text-[11px] font-medium leading-relaxed">${ticket.aiAnalysis?.priorityReason || "Priority computed based on public safety risk and impact radius."}</p>
        ${
          ticket.zoneInfo?.proximityAlert
            ? `<div class="mt-1.5 p-2 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded text-[11px] font-medium flex items-center gap-1.5"><i class="fa-solid fa-triangle-exclamation text-indigo-600"></i> ${ticket.zoneInfo.proximityAlert}</div>`
            : ""
        }
        <div class="flex items-center justify-between text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex-wrap gap-2">
          <span>⚡ Hazard Risk: <b class="${ticket.aiAnalysis?.hazardDetected ? "text-rose-600 font-bold" : "text-slate-700"}">${ticket.aiAnalysis?.hazardDetected ? "HIGH RISK (Emergency)" : "Standard Civic"}</b></span>
          <span>⏱️ SLA Window: <b class="text-indigo-600 font-bold">${ticket.aiAnalysis?.estimatedSlaHours || (ticket.severity >= 4 ? 4 : 24)} Hours</b></span>
          <span>🏛️ Routed Dept: <b class="text-slate-800">${ticket.department}</b></span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="h-44 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative group">
        <img src="${ticket.imageUrl}" alt="Citizen Evidence" class="w-full h-full object-cover">
        <div class="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-xs">
          <i class="fa-solid fa-camera mr-1"></i> Uploaded Photo Evidence
        </div>
      </div>
      <div class="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col justify-between space-y-3">
        <div>
          <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Location Details</div>
          <div class="flex items-start gap-2 text-xs text-slate-800">
            <i class="fa-solid fa-location-dot text-rose-500 mt-0.5 shrink-0"></i>
            <span class="font-medium">${ticket.location || "Location not specified"}</span>
          </div>
          ${
            Number.isFinite(ticket.lat) && Number.isFinite(ticket.lng)
              ? `
          <div class="text-[11px] text-slate-500 font-mono mt-1.5 pl-4">
            GPS: ${ticket.lat.toFixed(6)}, ${ticket.lng.toFixed(6)}
          </div>
          `
              : ""
          }
        </div>
        <div class="border-t border-slate-200 pt-2 text-[11px] text-slate-500 space-y-1">
          <div><i class="fa-regular fa-clock text-slate-400 mr-1"></i> Reported: <span class="text-slate-700 font-medium">${ticket.timestamp || "Recent"}</span></div>
          <div><i class="fa-solid fa-phone text-slate-400 mr-1"></i> Reporter: <span class="text-slate-700 font-medium">${ticket.reporterPhone || "Anonymous"}</span></div>
        </div>
      </div>
    </div>

    <div>
      <div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Citizen Description</div>
      <div class="text-xs text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">${ticket.description}</div>
    </div>

    <div class="pt-2">
      <div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Update Ticket Status</div>
      <div class="grid grid-cols-3 gap-2">
        ${["Assigned", "In Progress", "Resolved"]
          .map(
            (st) => `
          <button onclick="updateTicketStatus('${ticket.id}', '${st}')" class="py-2 text-xs font-semibold rounded-lg border transition ${
            ticket.status === st
              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
              : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300"
          }">
            Set: ${st}
          </button>
        `,
          )
          .join("")}
      </div>
    </div>
  `;
}

async function updateTicketStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/reports/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (data.success) {
      const ticket = civicReports.find((r) => r.id === id);
      if (ticket) ticket.status = newStatus;
      renderAdminQueue();
      renderCitizenReports();
    }
  } catch (err) {
    console.error("Error updating status:", err);
  }
}