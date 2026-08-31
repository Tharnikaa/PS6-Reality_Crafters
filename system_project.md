# CivicResolve — Comprehensive System Architecture & Engineering Specification

---

## 1. System Overview

**CivicResolve** is an intelligent, real-time civic grievance triage, deduplication, and resolution dispatch platform engineered for municipal corporations and smart city command centers. It ingests citizen reports (photos, GPS coordinates, issue descriptions), passes them through a 4-layer spam gate, analyzes complaints with multimodal AI (Google Gemini Vision + Text), identifies geospatial duplicates and clusters them into master issues, computes dynamic priority scores, and routes tickets into municipal department queues with SLA tracking.

---

## 2. Technology Stack

* **Backend Engine:** Node.js (CommonJS), Express.js (v5.x), Multer (memory buffer + local disk cache)
* **Database & Auth:** Supabase (PostgreSQL), Supabase SSR (`@supabase/ssr`), Row-Level Security (RLS), Supabase Storage
* **AI & Machine Learning:** Google Generative AI (`@google/generative-ai` / Gemini 1.5 & Vision Triage)
* **Visual & Perceptual Analysis:** Perceptual Image Hashing (pHash with Hamming distance), CLIP Embeddings (Cosine similarity), Sightengine Image Moderation
* **Frontend Client:** Vanilla HTML5, JavaScript (ES6+), Responsive CSS, FontAwesome Icons, Leaflet / Map rendering
* **Testing:** Node.js Native Assertion Suite (`assert`)

---

## 3. Core Directory Structure & Key Folders

```
├── .agents/                    # Custom agent skills and tool configurations
│   └── skills/
│       ├── supabase/
│       └── supabase-postgres-best-practices/
├── backend/                    # Core backend pipelines and security
│   ├── auth.js                 # Supabase JWT & citizen token verification
│   ├── captchaService.js       # Google reCAPTCHA v3 verification
│   ├── rateLimiter.js          # In-memory auth rate limiting
│   └── pipeline/
│       ├── spamGate.js         # 4-layer spam gate (device, sightengine, pHash, CLIP)
│       └── spamDetection.js    # Backwards-compatible spam wrapper
├── services/                   # External service integrations
│   ├── imageEmbeddingService.js# CLIP visual similarity & vector distance
│   ├── imageHashService.js     # Perceptual image hashing (pHash)
│   └── sightengineService.js   # Image content moderation
├── public/                     # Frontend client assets
│   ├── index.html              # Citizen & municipal staff portal
│   ├── app.js                  # Frontend state management & map rendering
│   └── uploads/                # Local uploaded media storage
├── scripts/                    # Maintenance & seeding utilities
│   ├── generate_50_complaints.js# 50-complaint ingestion simulator
│   ├── generate_full_supabase_seed.js # Supabase SQL seed generator
│   └── test_upload_report.js   # Automated multipart report upload test
├── tests/                      # Unit and integration test suites
│   ├── categorization.test.js  # AI category & department routing tests
│   ├── spamDetection.test.js   # Spam detection unit tests
│   ├── spamGate.test.js        # Spam gate architecture tests
│   ├── multiLayerSpam.test.js  # Behavioral & visual spam tests
│   └── duplicatePriority.test.js # Duplicate merging & priority score tests
├── server.js                   # Main Express server and REST API routes
├── schema.sql                  # PostgreSQL database table definitions
├── seed.sql                    # Initial sample data seed
└── supabase_seed_50.sql        # 50+ complaint tickets seed for Supabase
```

---

## 4. Architectural Request Pipeline

Every incoming report (`POST /api/reports`) executes through this pipeline:

```
[Citizen Submission: Photo + GPS + Description]
                     │
                     ▼
       1. Image Upload & Local Buffer
     (Saved to public/uploads/ & Supabase Storage)
                     │
                     ▼
       2. Multi-Layer Spam Gate
     (Device Flooding -> Moderation -> pHash -> CLIP)
                     │
                     ▼
       3. Multimodal AI Triage
     (Gemini analyzes text + photo for category & hazard)
                     │
                     ▼
       4. GPS Proximity & Duplicate Cluster Check
     (100m radius check for same-category open tickets)
                     │
                     ▼
       5. Dynamic Priority Calculation Engine
     (Severity + Duplicate Count + School/Hospital Proximity + Arterial Road)
                     │
                     ▼
       6. Database Persistence & Real-Time Sync
     (PostgreSQL via Supabase or in-memory fallback)
```

---

## 5. API Specifications

### Citizen & Ticket APIs

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/reports` | Bearer Token / Session | Submit a new civic complaint (Multipart form: `image`, `description`, `location`, `lat`, `lng`, `reporterPhone`, `device_id`) |
| `GET` | `/api/reports` | Public | Retrieve all complaints and master issue clusters |
| `GET` | `/api/reports/:id` | Public | Fetch specific ticket details, history, and status |
| `PATCH` | `/api/reports/:id/status` | Official Token | Update ticket status (`Pending`, `In Progress`, `Resolved`) with resolution notes |

### Authentication APIs

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signin` | Public | Citizen mobile OTP/session sign-in |
| `POST` | `/api/auth/signup` | Public | Citizen account registration |
| `POST` | `/api/staff/login` | Public | Municipal staff authentication with department credentials |

---

## 6. Naming Conventions & Code Standards

* **Database Columns (PostgreSQL):** `snake_case` (e.g. `duplicates_count`, `priority_level`, `image_url`, `reporter_phone`, `nearby_facility`).
* **Frontend JavaScript Properties:** `camelCase` (e.g. `duplicatesCount`, `priorityLevel`, `imageUrl`, `reporterPhone`).
* **Data Mapping:** All database rows must pass through `formatReportRow()` in [`server.js`](file:///c:/Users/JEYRAM/Desktop/Sharingan1/Sharingan/server.js) to normalize `snake_case` database fields to `camelCase` frontend state.
* **REST Endpoints:** Plural kebab-case resource paths (e.g. `/api/reports`, `/api/staff/login`).
* **Environment Variables:** `SCREAMING_SNAKE_CASE` (e.g. `SUPABASE_URL`, `GEMINI_API_KEY`).

---

## 7. Design System & Visual Rules

1. **Rich Aesthetics:** Sleek dark-mode compatible UI, card-based department queues, status indicators, and clean typography.
2. **Category Visual Assets:** No dummy/broken placeholders. Fallback images map to category assets:
   * **Highways & Roads:** `/road_resolved.jpg`
   * **Solid Waste Management:** `/waste_resolved.jpg`
   * **Electrical Department:** `/light_resolved.jpg`
   * **Water & Sewage Board:** `/water_resolved.jpg`
3. **Severity Badges:**
   * `Critical (5/5)`: Red badge / pulsing indicator
   * `High (4/5)`: Orange badge
   * `Medium (3/5)`: Amber badge
   * `Low (2/5)`: Blue/Green badge

---

## 8. Constraints & Edge Cases

* **Defensive Property Access:** Always use optional chaining (`req.body?.field`) across Express middleware to prevent unhandled `TypeError` exceptions.
* **Local Storage First:** All uploaded media must be stored in `public/uploads/` so the application functions flawlessly offline or when Supabase Storage buckets are not yet provisioned.
* **Spam Gate Enforcement:** Max 3 reports per device in a 10-minute window; near-duplicate images within 100m are clustered rather than treated as separate independent issues.
* **Git Safety:** Never commit `.env`, `.env.local`, or secret credentials to version control.
