from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routers import reports, officials, analytics
import uvicorn

app = FastAPI(
    title="Civic Issue Reporting System API",
    description="Backend services for civic complaint intake, PostGIS spatial queries, automated priority queueing, and official assignments.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for web frontend (React/Next.js/Vite/HTML)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(reports.router)
app.include_router(officials.router)
app.include_router(analytics.router)

@app.get("/", tags=["Health"])
def health_check():
    """Health check endpoint."""
    return {
        "status": "online",
        "service": "Civic Issue Reporting API",
        "documentation": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
