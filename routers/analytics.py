from fastapi import APIRouter, HTTPException
from db import get_db_connection, supabase_client
from schemas import AnalyticsSummary

router = APIRouter(prefix="/api/analytics", tags=["Analytics & Dashboard"])

@router.get("/summary", response_model=AnalyticsSummary)
def get_analytics_summary():
    """Retrieve city-wide civic issue statistics and department breakdown."""
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) as total FROM civic_reports")
                total_reports = cur.fetchone()["total"]

                cur.execute("SELECT status, COUNT(*) as count FROM civic_reports GROUP BY status")
                status_rows = cur.fetchall()
                by_status = {r["status"]: r["count"] for r in status_rows}

                cur.execute("SELECT department, COUNT(*) as count FROM civic_reports GROUP BY department")
                dept_rows = cur.fetchall()
                by_department = {r["department"]: r["count"] for r in dept_rows}

                resolved_count = by_status.get("Resolved", 0) + by_status.get("Closed", 0)
                open_count = total_reports - resolved_count

                return {
                    "total_reports": total_reports,
                    "open_reports": open_count,
                    "resolved_reports": resolved_count,
                    "by_department": by_department,
                    "by_status": by_status
                }
        finally:
            conn.close()

    if supabase_client:
        res = supabase_client.table("civic_reports").select("status, department").execute()
        data = res.data or []
        total = len(data)
        by_status = {}
        by_dept = {}
        for row in data:
            st = row.get("status", "Pending")
            dp = row.get("department", "Unknown")
            by_status[st] = by_status.get(st, 0) + 1
            by_dept[dp] = by_dept.get(dp, 0) + 1
        
        resolved = by_status.get("Resolved", 0) + by_status.get("Closed", 0)
        return {
            "total_reports": total,
            "open_reports": total - resolved,
            "resolved_reports": resolved,
            "by_department": by_dept,
            "by_status": by_status
        }

    raise HTTPException(status_code=500, detail="Database connection error")
