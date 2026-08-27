import logging
from config import settings

logger = logging.getLogger("uvicorn")

# Check Supabase SDK availability
try:
    from supabase import create_client, Client
    supabase_client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY) if (settings.SUPABASE_URL and settings.SUPABASE_KEY) else None
except Exception as e:
    logger.warning(f"Supabase client initialization skipped/failed: {e}")
    supabase_client = None

def get_db_connection():
    """
    Returns a direct psycopg2 PostgreSQL connection if DATABASE_URL is configured.
    Useful for executing raw PostGIS spatial queries like ST_DWithin and calling custom functions.
    """
    if not settings.DATABASE_URL:
        return None
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        conn = psycopg2.connect(settings.DATABASE_URL, cursor_factory=RealDictCursor)
        return conn
    except Exception as err:
        logger.error(f"PostgreSQL connection error: {err}")
        return None
