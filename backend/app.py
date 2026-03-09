from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

from backend.sam_routes import router as sam_router

app = FastAPI()

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