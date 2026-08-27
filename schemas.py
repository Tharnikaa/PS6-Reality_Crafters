from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ReportCreate(BaseModel):
    category: Optional[str] = Field("Pothole & Surface Damage", example="Pothole / Road Hazard")
    department: str = Field(..., example="Highways & Roads", description="Highways & Roads | Solid Waste Management | Electrical Department | Water Supply & Drainage")
    description: str = Field(..., example="Dangerous crater-sized pothole right after signal", description="Issue description")
    location: Optional[str] = Field("Anna Salai, Chennai", description="Human-readable address or landmark")
    lat: float = Field(..., example=13.0604, description="Latitude coordinate")
    lng: float = Field(..., example=80.2496, description="Longitude coordinate")
    severity: Optional[int] = Field(3, example=4)
    image_url: Optional[str] = Field(None, example="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=500&q=80")
    reporter_phone: Optional[str] = Field("+91 9876543210", example="+91 9876543210")

class ReportStatusUpdate(BaseModel):
    status: str = Field(..., example="In Progress", description="Pending | In Progress | Resolved | Closed | Reopened")

class ReportResponse(BaseModel):
    id: str
    category: str
    department: str
    description: Optional[str] = None
    location: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    status: str
    severity: Optional[int] = 3
    duplicates_count: int = Field(1, alias="duplicatesCount")
    image_url: Optional[str] = Field(None, alias="imageUrl")
    timestamp: datetime
    reporter_phone: Optional[str] = Field(None, alias="reporterPhone")
    assigned_to: Optional[str] = None
    priority_score: Optional[float] = None

    class Config:
        populate_by_name = True

class OfficialResponse(BaseModel):
    id: str
    name: str
    department: str
    zone: Optional[str] = None
    active: bool

class AnalyticsSummary(BaseModel):
    total_reports: int
    open_reports: int
    resolved_reports: int
    by_department: dict
    by_status: dict
