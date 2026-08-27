"""
Seed Data Script - Populates Supabase/PostgreSQL with public_use dataset.
"""
import os
import logging
from config import settings
from db import get_db_connection, supabase_client

logger = logging.getLogger("uvicorn")

PUBLIC_USE_REPORTS = [
    {
        "id": "REP-4091",
        "category": "Pothole / Road Hazard",
        "department": "Highways & Roads",
        "description": "Dangerous crater-sized pothole right after the signal. Causing severe traffic skids and accidents.",
        "location": "Anna Salai, Near Spencers Plaza, Chennai",
        "lat": 13.0604,
        "lng": 80.2496,
        "status": "In Progress",
        "severity": 4,
        "duplicates_count": 5,
        "image_url": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=500&q=80",
        "reporter_phone": "+91 9876543210",
        "assigned_to": "00000000-0000-0000-0000-000000000001"
    },
    {
        "id": "REP-4088",
        "category": "Garbage Overflow",
        "department": "Solid Waste Management",
        "description": "Community bin overflowing for 3 days. Blocking sidewalk completely and foul smell.",
        "location": "T. Nagar 3rd Main Rd, Chennai",
        "lat": 13.0418,
        "lng": 80.2341,
        "status": "Pending",
        "severity": 3,
        "duplicates_count": 2,
        "image_url": "https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=500&q=80",
        "reporter_phone": "+91 9123456789",
        "assigned_to": "00000000-0000-0000-0000-000000000005"
    },
    {
        "id": "REP-4072",
        "category": "Broken Streetlight",
        "department": "Electrical Department",
        "description": "Streetlights not functioning for the entire block near school. Complete darkness.",
        "location": "Velachery Bypass Rd, Chennai",
        "lat": 12.9815,
        "lng": 80.2180,
        "status": "Resolved",
        "severity": 2,
        "duplicates_count": 1,
        "image_url": "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=500&q=80",
        "reporter_phone": "+91 9988776655",
        "assigned_to": "00000000-0000-0000-0000-000000000007"
    },
    {
        "id": "REP-4065",
        "category": "Water Leakage",
        "department": "Water Supply & Drainage",
        "description": "Major underground water pipeline burst leaking drinking water onto road continuously.",
        "location": "Adyar Signal Junction, Chennai",
        "lat": 13.0067,
        "lng": 80.2570,
        "status": "Pending",
        "severity": 5,
        "duplicates_count": 4,
        "image_url": "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?w=500&q=80",
        "reporter_phone": "+91 9444332211",
        "assigned_to": "00000000-0000-0000-0000-000000000003"
    },
    {
        "id": "REP-4050",
        "category": "Fallen Tree Branch",
        "department": "Highways & Roads",
        "description": "Large tree branch hanging precariously over electric wires near hospital.",
        "location": "Kilmauk Garden Rd, Chennai",
        "lat": 13.0870,
        "lng": 80.2095,
        "status": "In Progress",
        "severity": 4,
        "duplicates_count": 3,
        "image_url": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=500&q=80",
        "reporter_phone": "+91 9884011223",
        "assigned_to": "00000000-0000-0000-0000-000000000002"
    }
]

PUBLIC_USE_OFFICIALS = [
    {"id": "00000000-0000-0000-0000-000000000001", "name": "Ramesh Kumar", "department": "Highways & Roads", "zone": "Zone A", "active": True},
    {"id": "00000000-0000-0000-0000-000000000002", "name": "Suresh Babu", "department": "Highways & Roads", "zone": "Zone B", "active": True},
    {"id": "00000000-0000-0000-0000-000000000003", "name": "Lakshmi Priya", "department": "Water Supply & Drainage", "zone": "Zone A", "active": True},
    {"id": "00000000-0000-0000-0000-000000000004", "name": "Karthik Raja", "department": "Water Supply & Drainage", "zone": "Zone B", "active": True},
    {"id": "00000000-0000-0000-0000-000000000005", "name": "Divya Shree", "department": "Solid Waste Management", "zone": "Zone A", "active": True},
    {"id": "00000000-0000-0000-0000-000000000006", "name": "Mohan Das", "department": "Solid Waste Management", "zone": "Zone B", "active": True},
    {"id": "00000000-0000-0000-0000-000000000007", "name": "Anitha R", "department": "Electrical Department", "zone": "Zone A", "active": True},
    {"id": "00000000-0000-0000-0000-000000000008", "name": "Vijay Anand", "department": "Electrical Department", "zone": "Zone B", "active": True}
]

def seed_database():
    """Seeds Supabase or PostgreSQL database with public_use datasets."""
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                # Seed officials
                for off in PUBLIC_USE_OFFICIALS:
                    cur.execute("""
                        INSERT INTO officials (id, name, department, zone, active)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO NOTHING;
                    """, [off["id"], off["name"], off["department"], off["zone"], off["active"]])

                # Seed reports
                for rep in PUBLIC_USE_REPORTS:
                    cur.execute("""
                        INSERT INTO civic_reports (id, category, department, description, location, lat, lng, location_gis, status, severity, duplicates_count, image_url, reporter_phone, assigned_to)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO NOTHING;
                    """, [
                        rep["id"], rep["category"], rep["department"], rep["description"], rep["location"],
                        rep["lat"], rep["lng"], rep["lng"], rep["lat"], rep["status"], rep["severity"],
                        rep["duplicates_count"], rep["image_url"], rep["reporter_phone"], rep["assigned_to"]
                    ])
                conn.commit()
                print("Database successfully seeded via psycopg2!")
                return True
        finally:
            conn.close()

    if supabase_client:
        try:
            for off in PUBLIC_USE_OFFICIALS:
                supabase_client.table("officials").upsert(off).execute()
            for rep in PUBLIC_USE_REPORTS:
                supabase_client.table("civic_reports").upsert(rep).execute()
            print("Database successfully seeded via Supabase client!")
            return True
        except Exception as e:
            print(f"Supabase seeding error: {e}")

    print("Operating with memory fallback data.")
    return False

if __name__ == "__main__":
    seed_database()
