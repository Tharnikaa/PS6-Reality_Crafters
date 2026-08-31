# CivicResolve — Agent Guidelines & Repository Architecture

Welcome to the **CivicResolve** repository (`PS6-Reality_Crafters`). This document defines architecture standards, pipeline specifications, coding rules, and development workflows for AI coding agents and human contributors working on this project.

---

## 1. Project Overview

**CivicResolve** is an intelligent, real-time civic grievance triage and resolution platform designed for municipal corporations. It ingests citizen reports (photos, descriptions, GPS coordinates), filters malicious/duplicate submissions via a multi-layer spam gate, analyzes complaints with multimodal AI (Google Gemini), groups near-duplicates into master issue clusters, dynamically computes urgency/priority scores, and routes tickets to municipal department queues.

---

## 2. Technology Stack

* **Backend Engine:** Node.js (CommonJS), Express.js (v5.x), Multer (in-memory + disk buffer)
* **Database & Auth:** Supabase (PostgreSQL), Supabase SSR, Row-Level Security (RLS), Supabase Storage
* **AI & Machine Learning:** Google Generative AI (`@google/generative-ai` / Gemini Multimodal Vision & Text)
* **Visual & Perceptual Analysis:** pHash Hamming Distance, CLIP Embeddings, Sightengine Moderation
* **Frontend:** Vanilla HTML5, JavaScript (ES6+), Modern Responsive CSS, FontAwesome Icons
* **Testing:** Node.js Native Assertion Suite (`assert`)

---

## 3. Directory Structure

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
├── services/                   # Dedicated external service integrations
│   ├── imageEmbeddingService.js# CLIP visual similarity & vector distance
│   ├── imageHashService.js     # Perceptual image hashing (pHash)
│   └── sightengineService.js   # Image content moderation
├── public/                     # Frontend client assets
│   ├── index.html              # Citizen & municipal staff portal
│   ├── app.js                  # Frontend state management & map rendering
│   └── uploads/                # Local uploads cache directory
├── scripts/                    # Database seeding & utility tools
│   ├── generate_50_complaints.js# Dynamic 50-complaint ingestion simulator
│   ├── generate_full_supabase_seed.js # Supabase SQL seed generator
│   └── test_upload_report.js   # Automated multipart report upload test
├── tests/                      # Comprehensive unit test suites
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

## 4. Core Architecture & Request Pipeline

Every incoming report (`POST /api/reports`) follows this sequence:

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

## 5. Development & Testing Commands

### Running Locally
```bash
# Start backend server on http://localhost:3000
npm start
```

### Running Test Suites
Always run and verify tests when modifying triage, spam, or scoring logic:
```bash
# Run AI categorization unit tests
npm test

# Run spam detection & gate tests
npm run test:spam
npm run test:gate

# Run multi-layer visual & behavioral spam tests
npm run test:multi

# Run duplicate merging & priority calculation tests
npm run test:duplicate
```

---

## 6. Environment Variables

Store credentials in `.env` (safely ignored by `.gitignore`):
```env
# Supabase Database & Storage
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-key

# Google Gemini API Key (Multimodal AI Triage)
GEMINI_API_KEY=your-gemini-api-key

# Google reCAPTCHA v3 (Authentication)
RECAPTCHA_SECRET_KEY=your-recaptcha-secret

# Threshold Configuration
DUPLICATE_RADIUS_METERS=100
DUPLICATE_TIME_WINDOW_MINUTES=60
PHASH_DISTANCE_THRESHOLD=5
```

---

## 7. Coding Rules & Best Practices for Agents

1. **Defensive Body/Header Access:** Always use optional chaining (`req.body?.field`) in Express middlewares to prevent `TypeError: Cannot read properties of undefined`.
2. **Local Storage First for Media:** When files are uploaded via Multer, always persist a copy to [`public/uploads/`](file:///c:/Users/JEYRAM/Desktop/Sharingan1/Sharingan/public/uploads) so images remain accessible even if cloud storage buckets are offline.
3. **No Unsplash/Dummy Fallbacks for Real Complaints:** Always map complaints without images to category-specific visual assets (`/road_resolved.jpg`, `/waste_resolved.jpg`, `/light_resolved.jpg`, `/water_resolved.jpg`).
4. **Preserve Database Compatibility:** Keep field names aligned across Supabase PostgreSQL columns (`snake_case`) and frontend JavaScript state (`camelCase`) via [`formatReportRow()`](file:///c:/Users/JEYRAM/Desktop/Sharingan1/Sharingan/server.js#L80).
5. **Git Safety:** Never commit `.env`, `.env.local`, or sensitive credentials.
