from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import Response
import json

from backend.sam_service import run_sam

router = APIRouter()

@router.post("/segment")
async def segment(
	image: UploadFile = File(...),
	prompt: str = Form(...)
):
	mask_png = await run_sam(image, prompt)
	return Response(content=mask_png, media_type="image/png")