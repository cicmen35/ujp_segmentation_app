from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

from backend.routes.sam_routes import router as sam_router
from backend.routes.auth_routes import router as auth_router
from backend.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database and tables on startup
    init_db()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
	CORSMiddleware,
	allow_origins=["http://localhost:5173"],
	allow_credentials=True,
	allow_methods=["POST", "GET"],
	allow_headers=["*"],
)


#check health
@app.get("/health")
def health():
	return {"status": "ok"}

app.include_router(sam_router, prefix="/sam")
app.include_router(auth_router, prefix="/auth")