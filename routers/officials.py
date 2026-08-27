from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from db import get_db_connection, supabase_client
from schemas import OfficialResponse, ReportResponse
from routers.reports import format_row

router = APIRouter(prefix="/api/officials", tags=["Officials & Assignment"])

@router.get("", response_model=List[OfficialResponse])
def get_officials(
    department: Optional[str] = None,
    zone: Optional[str] = None
):
    """List municipal officials filtered by department or zone."""
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                query = "SELECT id, name, department, zone, active FROM officials WHERE 1=1"
                params = []
                if department and department != 'All':
                    query += " AND department = %s"
                    params.append(department)
                if zone:
                    query += " AND zone = %s"
                    params.append(zone)
                cur.execute(query, params)
                return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    if supabase_client:
        q = supabase_client.table("officials").select("*")
        if department and department != 'All':
            q = q.eq("department", department)
        if zone:
            q = q.eq("zone", zone)
        res = q.execute()
        return res.data or []

    raise HTTPException(status_code=500, detail="Database connection not configured")

@router.get("/{official_id}/queue", response_model=List[ReportResponse])
def get_official_queue(official_id: str):
    """Fetch assigned unresolved report queue for an official ordered by priority score."""
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                query = """
                    SELECT *
                    FROM priority_queue
                    WHERE assigned_to = %s
                    ORDER BY priority_score DESC
                """
                cur.execute(query, [official_id])
                return [format_row(dict(r)) for r in cur.fetchall()]
        finally:
            conn.close()

    if supabase_client:
        res = supabase_client.table("priority_queue").select("*").eq("assigned_to", official_id).order("priority_score", desc=True).execute()
        return [format_row(r) for r in (res.data or [])]

    raise HTTPException(status_code=500, detail="Database connection error")
