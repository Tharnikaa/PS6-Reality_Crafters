# CivicResolve — Agent Guidelines & Memory System (`AGENTS.md`)

Welcome to the **CivicResolve** repository (`PS6-Reality_Crafters`). This document defines guidelines, memory systems, operational constraints, and workflow protocols for AI coding agents and human engineers.

---

## 1. Persistent File-Based Memory System

To maintain context, track feature implementation, record non-trivial decisions, and prevent regression across development sessions, all agents **must utilize and maintain** the following persistent memory files:

| Memory Document | Primary Purpose & Usage Protocol |
| :--- | :--- |
| **[`system_project.md`](file:///c:/Users/JEYRAM/Desktop/Sharingan1/Sharingan/system_project.md)** | **Master Architectural Source of Truth:** Contains complete system overview, full technology stack, design rules, directory mappings, API contracts, naming conventions, and technical constraints. |
| **[`progress.md`](file:///c:/Users/JEYRAM/Desktop/Sharingan1/Sharingan/progress.md)** | **Active Implementation Tracker:** Documents what was recently completed, what is incomplete/planned, expected problems/risks, and agent development phase. **Must be updated on every commit and milestone.** |
| **[`remember.md`](file:///c:/Users/JEYRAM/Desktop/Sharingan1/Sharingan/remember.md)** | **Architectural Decision Record (ADR):** Preserves critical architectural decisions, reasoning, and long-term consequences. (Excludes trivial code styling choices). |
| **[`task_manager.md`](file:///c:/Users/JEYRAM/Desktop/Sharingan1/Sharingan/task_manager.md)** | **Work State Matrix:** Organizes all development work into `Not Started`, `In Progress` / `Started`, `Completed`, and `Blocked`. |
| **[`security.md`](file:///c:/Users/JEYRAM/Desktop/Sharingan1/Sharingan/security.md)** | **Credentials & Secrets Protocol:** Manages environment variable definitions, API service keys, staff authentication credentials, and secret rotation procedures. |

---

## 2. Core Operational Rules for AI Agents

1. **Check Memory Files First:** Before proposing architectural changes or refactoring existing pipelines, agents must review [`system_project.md`](file:///c:/Users/JEYRAM/Desktop/Sharingan1/Sharingan/system_project.md) and [`remember.md`](file:///c:/Users/JEYRAM/Desktop/Sharingan1/Sharingan/remember.md).
2. **Update Progress On Every Commit:** Whenever code is modified, tests are added, or features are pushed, update [`progress.md`](file:///c:/Users/JEYRAM/Desktop/Sharingan1/Sharingan/progress.md) and [`task_manager.md`](file:///c:/Users/JEYRAM/Desktop/Sharingan1/Sharingan/task_manager.md) to reflect the new state.
3. **Record Major Decisions in Remember.md:** When choosing a storage strategy, API structure, or validation threshold, log the decision and rationale in [`remember.md`](file:///c:/Users/JEYRAM/Desktop/Sharingan1/Sharingan/remember.md).
4. **Defensive Body/Header Access:** Always use optional chaining (`req.body?.field`) in Express middlewares to prevent `TypeError: Cannot read properties of undefined`.
5. **Local Storage First for Media:** Always persist uploaded media to [`public/uploads/`](file:///c:/Users/JEYRAM/Desktop/Sharingan1/Sharingan/public/uploads) to guarantee offline reliability and resilience against missing cloud buckets.
6. **No Placeholder Fallbacks for Real Complaints:** Always map complaints without images to category-specific visual assets (`/road_resolved.jpg`, `/waste_resolved.jpg`, `/light_resolved.jpg`, `/water_resolved.jpg`).
7. **Preserve Database Compatibility:** Keep field names aligned across Supabase PostgreSQL columns (`snake_case`) and frontend JavaScript state (`camelCase`) via `formatReportRow()` in [`server.js`](file:///c:/Users/JEYRAM/Desktop/Sharingan1/Sharingan/server.js).
8. **Git & Secret Safety:** Strictly observe [`security.md`](file:///c:/Users/JEYRAM/Desktop/Sharingan1/Sharingan/security.md). Never commit `.env`, `.env.local`, or secret tokens to Git.

---

## 3. Essential Commands & Quick Reference

```bash
# Start backend development server (http://localhost:3000)
npm start

# Run all test suites
npm test               # AI categorization unit tests
npm run test:spam      # Spam detection unit tests
npm run test:gate      # Spam gate architecture tests
npm run test:multi     # Multi-layer visual & behavioral spam tests
npm run test:duplicate # Duplicate merging & dynamic priority tests
```
