# Security, Credentials & Secrets Management (`security.md`)

> **CRITICAL SECURITY RULE:** Never store raw production API keys, service role tokens, or private certificates directly inside markdown documentation or committed Git files. Always reference them via environment variables configured in `.env` or cloud secret managers.

---

## 1. Required Secrets & Environment Variables

| Variable Name | Service | Purpose | Sensitivity Level | Configured Location |
| :--- | :--- | :--- | :--- | :--- |
| `SUPABASE_URL` | Supabase | Cloud PostgreSQL Project URL | Public / Standard | `.env`, `.env.local`, Cloud Hosting Env |
| `SUPABASE_KEY` | Supabase | Anon / Publishable API Key | Public / Client-Safe | `.env`, `.env.local`, Cloud Hosting Env |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Master Administrative Access | **CRITICAL / Private** | Server Secrets Only (Never in client) |
| `GEMINI_API_KEY` | Google AI Studio | Multimodal AI Triage & Vision Analysis | **High / Private** | `.env`, Server Secrets |
| `RECAPTCHA_SECRET_KEY` | Google reCAPTCHA v3 | Citizen Bot & Auth Verification | **High / Private** | `.env`, Server Secrets |
| `SIGHTENGINE_API_USER` | Sightengine | Image Moderation User Identifier | Standard | `.env`, Server Secrets (Optional) |
| `SIGHTENGINE_API_SECRET` | Sightengine | Image Moderation Secret Key | **High / Private** | `.env`, Server Secrets (Optional) |
| `PINECONE_API_KEY` | Pinecone | Vector Similarity Search Key | **High / Private** | `.env`, Server Secrets (Optional) |

---

## 2. Default Municipal Staff Credentials

For local testing and authorized department staff triage queues:

| Role | Department | Default Staff ID | Default Password |
| :--- | :--- | :--- | :--- |
| **Official** | Highways & Roads | `STF-101` | `roads@123` |
| **Official** | Solid Waste Management | `STF-102` | `waste@123` |
| **Official** | Electrical Department | `STF-103` | `electric@123` |
| **Official** | Water & Sewage Board | `STF-104` | `water@123` |
| **Administrator**| Municipal Corporation | `ADMIN-001` | `admin@civic123` |

---

## 3. Credential Rotation & Secret Protocols

1. **Local `.env` Exclusions:** `.env` and `.env*.local` are strictly ignored by `.gitignore`. Check with `git status` before committing.
2. **Key Rotation Protocol:** If an API key or Supabase token is exposed, rotate the key immediately in the respective vendor dashboard and update environment variables in your deployment settings.
3. **Defensive Token Handling:** Client sessions authenticate via Supabase JWT Bearer tokens. If no token is passed, the request is sandboxed into a restricted public citizen session.
4. **Rate Limiting:** `backend/rateLimiter.js` restricts authentication attempts to prevent brute-force attacks on staff login endpoints.
