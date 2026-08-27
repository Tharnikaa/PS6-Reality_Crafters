# Civic Issue Reporting System - Backend & Frontend

AI-powered **Civic Issue Reporting & Priority Management System** built with Python FastAPI, PostGIS, Supabase (PostgreSQL), Leaflet GIS mapping, and Vanilla JS UI.

---

## 📁 Directory Structure

```
hackfusion/
├── supabase_schema.sql    # Database schema (civic_reports & officials tables, priority logic & view)
├── main.py                # FastAPI main application entry point
├── config.py              # Environment settings
├── db.py                  # Database connection manager (psycopg2 PostGIS + Supabase client)
├── schemas.py             # Pydantic data schemas matching public_use branch
├── routers/
│   ├── reports.py         # Reports CRUD, Priority Queue, PostGIS Nearby Spatial Search
│   ├── officials.py       # Officials listing & work queue management
│   └── analytics.py       # Metrics & city-wide department stats
├── index.html             # Web Application Frontend (Citizen Portal + Priority Dashboard)
├── index.css              # Custom styling & glassmorphism aesthetic
├── app.js                 # Interactive Leaflet map controller & API client
├── requirements.txt       # Python package dependencies
├── .env.example           # Environment template
└── README.md
```

---

## 🚀 Execution Instructions

### 1. Database Setup
Execute [`supabase_schema.sql`](supabase_schema.sql) in your **Supabase SQL Editor** to create:
- `civic_reports` table
- `officials` table
- `calculate_priority_score()` function
- `priority_queue` view

### 2. Backend Server Setup
```bash
python main.py
```
FastAPI documentation (Swagger UI) is available at `http://localhost:8000/docs`.

### 3. Frontend Web Server
```bash
python -m http.server 3000
```
Open `http://localhost:3000` in your web browser.
