# Architectural Memory & Core Decisions (`remember.md`)

> **Purpose for AI Agents:** This file stores non-trivial architectural decisions, the rationale behind them, and their consequences. Consult this file before making structural changes or refactoring existing modules.

---

### Decision 1: Dual Storage Strategy for Uploaded Media
* **Decision:** Always persist uploaded image buffers to the local filesystem (`public/uploads/`) first, then asynchronously attempt to upload to Supabase Storage.
* **Reason:** If cloud storage buckets are unconfigured, misconfigured, or experience network timeouts, citizen report submissions must never fail or lose their photos.
* **Consequences:** 
  * Local development works 100% offline without cloud credentials.
  * In ephemeral serverless environments (e.g. Vercel), Supabase Storage is required for persistent retention across container recycles.

---

### Decision 2: Fallback to Category Visual Assets Instead of Generic Placeholders
* **Decision:** Never return generic external placeholder images (e.g., Unsplash puddle photo) when complaints have missing or unparseable images. Map all complaints to category-specific visual assets (`/road_resolved.jpg`, `/waste_resolved.jpg`, `/light_resolved.jpg`, `/water_resolved.jpg`).
* **Reason:** Generic placeholders confuse municipal staff and degrade dashboard usability during triage.
* **Consequences:** Every card in the department queue displays a clear, contextually relevant image representing the civic grievance.

---

### Decision 3: 4-Layer Pre-Insertion Spam Gate
* **Decision:** Execute all spam gate checks (Device Flooding -> Sightengine Moderation -> pHash Near-Duplicate -> CLIP Semantic Duplicate) **before** inserting a row into the database.
* **Reason:** Prevents database bloat, spam pollution, and prevents malicious payloads from triggering downstream AI triage costs.
* **Consequences:** Spam is rejected at HTTP 422 with immediate user-friendly feedback without consuming database write operations.

---

### Decision 4: Field Name Normalization in `formatReportRow`
* **Decision:** Maintain `snake_case` in PostgreSQL database tables and `camelCase` in frontend JavaScript state, bridged exclusively through `formatReportRow()` in `server.js`.
* **Reason:** Adheres to standard PostgreSQL database naming conventions while preserving standard JavaScript ES6 frontend conventions without breaking frontend templates.
* **Consequences:** Any new database column added to `schema.sql` must also be mapped in `formatReportRow()` in `server.js`.

---

### Decision 5: Memory Fallback Data Store for Local Development
* **Decision:** If `SUPABASE_URL` or `SUPABASE_KEY` are missing or the database table is unreachable, the Express server falls back to an in-memory array (`fallbackReports`) rather than crashing on startup.
* **Reason:** Ensures rapid local testing, CI test execution, and zero-friction developer onboarding.
* **Consequences:** In-memory data resets when the Node process restarts; running `supabase_seed_50.sql` in Supabase is required for persistent cloud storage.
