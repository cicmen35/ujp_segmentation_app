from contextlib import asynccontextmanager
import asyncio
import logging
import sqlite3
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import CORS_ALLOW_ORIGINS
from backend.database import init_db, DB_FILE
from backend.routes.sam_routes import router as sam_router
from backend.routes.auth_routes import router as auth_router
from backend.routes.files_routes import router as files_router

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


async def _cleanup_expired_sessions() -> None:
    """Periodically delete expired sessions to prevent unbounded table growth."""
    while True:
        try:
            conn = sqlite3.connect(DB_FILE, check_same_thread=False)
            conn.execute("DELETE FROM sessions WHERE expires_at < datetime('now')")
            conn.commit()
            conn.close()
            logger.info("Expired sessions cleaned up")
        except Exception:
            logger.exception("Failed to clean up expired sessions")
        await asyncio.sleep(24 * 60 * 60)  # run once every 24 hours


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database and tables on startup
    init_db()
    # Start background session cleanup task
    cleanup_task = asyncio.create_task(_cleanup_expired_sessions())
    yield
    # Cancel cleanup task on shutdown
    cleanup_task.cancel()


app = FastAPI(
    title="UJP Segmentation API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS", "PATCH", "PUT"],
    allow_headers=["*"],
)

app.include_router(sam_router, prefix="/sam", tags=["segmentation"])
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(files_router, prefix="/files", tags=["files"])

