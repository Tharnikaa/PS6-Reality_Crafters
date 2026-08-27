from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional
from db import get_db_connection, supabase_client
from schemas import ReportCreate, ReportResponse, ReportStatusUpdate
import logging

logger = logging.getLogger("uvicorn")
router = APIRouter(prefix="/api/reports", tags=["Civic Reports"])

def format_row(r: dict) -> dict:
    return {
        "id": r.get("id"),
        "category": r.get("category", "General"),
        "department": r.get("department", "Highways & Roads"),
        "description": r.get("description"),
        "location": r.get("location"),
        "lat": r.get("lat"),
        "lng": r.get("lng"),
        "status": r.get("status", "Pending"),
        "severity": r.get("severity", 3),
        "duplicatesCount": r.get("duplicates_count") or r.get("duplicatesCount", 1),
        "imageUrl": r.get("image_url") or r.get("imageUrl"),
        "timestamp": r.get("timestamp") or r.get("created_at"),
        "reporterPhone": r.get("reporter_phone") or r.get("reporterPhone"),
        "assigned_to": r.get("assigned_to"),
        "priority_score": r.get("priority_score")
    }

@router.get("", response_model=List[ReportResponse])
def get_reports(
    department: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = 50,
    offset: int = 0
):
    """Retrieve all civic reports from civic_reports table."""
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                query = "SELECT id, category, department, description, location, lat, lng, status, severity, duplicates_count, image_url, timestamp, reporter_phone, assigned_to FROM civic_reports WHERE 1=1"
                params = []
                if department and department != 'All':
                    query += " AND department = %s"
                    params.append(department)
                if status_filter:
                    query += " AND status = %s"
                    params.append(status_filter)
                query += " ORDER BY timestamp DESC LIMIT %s OFFSET %s"
                params.extend([limit, offset])
                cur.execute(query, params)
                rows = cur.fetchall()
                return [format_row(dict(r)) for r in rows]
        finally:
            conn.close()
    
    if supabase_client:
        q = supabase_client.table("civic_reports").select("*")
        if department and department != 'All':
            q = q.eq("department", department)
        if status_filter:
            q = q.eq("status", status_filter)
        res = q.order("timestamp", desc=True).range(offset, offset + limit - 1).execute()
        return [format_row(r) for r in (res.data or [])]

    raise HTTPException(status_code=500, detail="Database connection not configured")

@router.get("/priority", response_model=List[ReportResponse])
def get_priority_queue(
    department: Optional[str] = None,
    limit: int = 50
):
    """Fetch prioritized issue queue from priority_queue view."""
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                query = "SELECT * FROM priority_queue"
                params = []
                if department and department != 'All':
                    query += " WHERE department = %s"
                    params.append(department)
                query += " ORDER BY priority_score DESC LIMIT %s"
                params.append(limit)
                cur.execute(query, params)
                return [format_row(dict(r)) for r in cur.fetchall()]
        finally:
            conn.close()

    if supabase_client:
        q = supabase_client.table("priority_queue").select("*")
        if department and department != 'All':
            q = q.eq("department", department)
        res = q.order("priority_score", desc=True).limit(limit).execute()
        return [format_row(r) for r in (res.data or [])]

    raise HTTPException(status_code=500, detail="Database connection not configured")

@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(payload: ReportCreate):
    """Submit a new civic report to civic_reports."""
    conn = get_db_connection()
    report_id = f"REP-{int(1000 + (hash(payload.description) % 9000))}"
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM officials WHERE department = %s AND active = true ORDER BY random() LIMIT 1", [payload.department])
                official_row = cur.fetchone()
                assigned_to = official_row["id"] if official_row else None

                query = """
                    INSERT INTO civic_reports (id, category, department, description, location, lat, lng, location_gis, status, severity, duplicates_count, image_url, reporter_phone, assigned_to)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), 'Pending', %s, 1, %s, %s, %s)
                    RETURNING *;
                """
                cur.execute(query, [
                    report_id, payload.category, payload.department, payload.description, payload.location,
                    payload.lat, payload.lng, payload.lng, payload.lat, payload.severity, payload.image_url,
                    payload.reporter_phone, assigned_to
                ])
                new_report = format_row(dict(cur.fetchone()))
                conn.commit()
                return new_report
        finally:
            conn.close()

    if supabase_client:
        data = {
            "id": report_id,
            "category": payload.category,
            "department": payload.department,
            "description": payload.description,
            "location": payload.location,
            "lat": payload.lat,
            "lng": payload.lng,
            "status": "Pending",
            "severity": payload.severity,
            "duplicates_count": 1,
            "image_url": payload.image_url,
            "reporter_phone": payload.reporter_phone
        }
        res = supabase_client.table("civic_reports").insert(data).execute()
        if res.data:
            return format_row(res.data[0])

    raise HTTPException(status_code=500, detail="Failed to create report")

@router.post("/{report_id}/upvote", response_model=ReportResponse)
def upvote_report(report_id: str):
    """Increment duplicates_count when citizen upvotes existing report."""
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE civic_reports 
                    SET duplicates_count = duplicates_count + 1 
                    WHERE id = %s 
                    RETURNING *
                """, [report_id])
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Report not found")
                conn.commit()
                return format_row(dict(row))
        finally:
            conn.close()

    if supabase_client:
        cur_res = supabase_client.table("civic_reports").select("duplicates_count").eq("id", report_id).single().execute()
        if not cur_res.data:
            raise HTTPException(status_code=404, detail="Report not found")
        new_count = (cur_res.data.get("duplicates_count") or 1) + 1
        res = supabase_client.table("civic_reports").update({"duplicates_count": new_count}).eq("id", report_id).execute()
        return format_row(res.data[0])

    raise HTTPException(status_code=500, detail="Database connection error")

@router.patch("/{report_id}/status", response_model=ReportResponse)
def update_report_status(report_id: str, payload: ReportStatusUpdate):
    """Update report status (Pending, In Progress, Resolved, Closed, Reopened)."""
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE civic_reports 
                    SET status = %s 
                    WHERE id = %s 
                    RETURNING *
                """, [payload.status, report_id])
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Report not found")
                conn.commit()
                return format_row(dict(row))
        finally:
            conn.close()

    if supabase_client:
        res = supabase_client.table("civic_reports").update({"status": payload.status}).eq("id", report_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Report not found")
        return format_row(res.data[0])

    raise HTTPException(status_code=500, detail="Database connection error")
