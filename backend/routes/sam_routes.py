from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import Response

from backend.services.sam_service import run_sam

router = APIRouter()

@router.post("/segment")
async def segment(
	image: UploadFile = File(...),
	prompt: str = Form(...),
	preprocessing: str = Form("none"),
	clip_limit: float = Form(2.0),
	tile_grid_size: int = Form(8),
	inference_mode: str = Form("whole_image"),
	patch_size: int = Form(512),
):
	mask_png = await run_sam(
		image,
		prompt,
		preprocessing,
		clip_limit=clip_limit,
		tile_grid_size=tile_grid_size,
		inference_mode=inference_mode,
		patch_size=patch_size,
	)
	return Response(content=mask_png, media_type="image/png")
