from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import Response
import json

from backend.services.sam_service import run_sam

router = APIRouter()

@router.post("/segment")
async def segment(
	image: UploadFile = File(...),
	prompt: str = Form(...),
	preprocessing: str = Form("none"),
):
	mask_png = await run_sam(image, prompt, preprocessing)
	return Response(content=mask_png, media_type="image/png")
