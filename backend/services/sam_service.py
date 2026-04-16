import json
import logging
import numpy as np
import cv2
import torch
import sys
from pathlib import Path
from fastapi import HTTPException

# __file__ = .../ujp_segmentation_app/backend/services/sam_service.py
# .parent           → backend/services/
# .parent.parent    → backend/
# .parent.parent.parent → ujp_segmentation_app/  (project root)
PROJECT_DIR = Path(__file__).resolve().parent.parent.parent
MODELS_DIR = PROJECT_DIR.parent / "models"  # sibling of ujp_segmentation_app/ on the VM

sys.path.append(str(MODELS_DIR / "segment-anything"))

from segment_anything import sam_model_registry, SamPredictor

CHECKPOINT = MODELS_DIR / "segment-anything" / "checkpoints" / "sam_vit_h_4b8939.pth"
MODEL_TYPE = "vit_h"

sam = sam_model_registry[MODEL_TYPE](checkpoint=str(CHECKPOINT))
sam.to("cpu")
predictor = SamPredictor(sam)
LOGGER = logging.getLogger(__name__)
SUPPORTED_PREPROCESSING = {
	"none",
	"contrast_normalization",
	"histogram_normalization",
	"histogram_and_contrast_normalization",
}
SUPPORTED_INFERENCE_MODES = {"whole_image", "patch_based"}
SUPPORTED_PATCH_SIZES = {256, 512, 1024}


def _decode_image(data: bytes) -> np.ndarray:
	img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
	if img is None:
		raise HTTPException(status_code=400, detail="Invalid image upload")
	return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)


def _encode_rgb_png(img: np.ndarray) -> bytes:
	bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
	success, png = cv2.imencode(".png", bgr)
	if not success:
		raise HTTPException(status_code=500, detail="Failed to encode SAM input image")
	return png.tobytes()


def _validate_clahe_settings(clip_limit: float, tile_grid_size: int) -> tuple[float, int]:
	if clip_limit < 1.0 or clip_limit > 10.0:
		raise HTTPException(status_code=400, detail="clip_limit must be between 1.0 and 10.0")

	if tile_grid_size < 2 or tile_grid_size > 32:
		raise HTTPException(status_code=400, detail="tile_grid_size must be between 2 and 32")

	return clip_limit, tile_grid_size


def _apply_histogram_normalization(img: np.ndarray) -> np.ndarray:
	# Equalize the global luminance histogram while preserving chromatic channels.
	lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
	l_channel, a_channel, b_channel = cv2.split(lab)
	normalized_l = cv2.equalizeHist(l_channel)
	normalized_lab = cv2.merge((normalized_l, a_channel, b_channel))
	return cv2.cvtColor(normalized_lab, cv2.COLOR_LAB2RGB)


def _apply_contrast_normalization(img: np.ndarray, clip_limit: float, tile_grid_size: int) -> np.ndarray:
	clip_limit, tile_grid_size = _validate_clahe_settings(clip_limit, tile_grid_size)

	# Enhance local contrast while preserving color channels for SAM input.
	lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
	l_channel, a_channel, b_channel = cv2.split(lab)
	clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(tile_grid_size, tile_grid_size))
	enhanced_l = clahe.apply(l_channel)
	enhanced_lab = cv2.merge((enhanced_l, a_channel, b_channel))
	return cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2RGB)


def _apply_preprocessing(
	img: np.ndarray,
	preprocessing: str,
	clip_limit: float = 2.0,
	tile_grid_size: int = 8,
) -> np.ndarray:
	if preprocessing == "none":
		return img

	if preprocessing not in SUPPORTED_PREPROCESSING:
		raise HTTPException(status_code=400, detail=f"Unsupported preprocessing mode: {preprocessing}")

	if preprocessing == "histogram_normalization":
		return _apply_histogram_normalization(img)

	if preprocessing == "histogram_and_contrast_normalization":
		img = _apply_histogram_normalization(img)
		return _apply_contrast_normalization(img, clip_limit, tile_grid_size)

	return _apply_contrast_normalization(img, clip_limit, tile_grid_size)


def _parse_prompt(prompt_json: str) -> tuple[np.ndarray | None, np.ndarray | None, np.ndarray | None, bool]:
	try:
		prompt = json.loads(prompt_json)
	except json.JSONDecodeError as exc:
		raise HTTPException(status_code=400, detail="Invalid prompt JSON") from exc

	box = None
	if prompt.get("box"):
		box = np.array(prompt["box"])

	point_coords = None
	point_labels = None

	if prompt.get("point_coords") or prompt.get("point_labels"):
		coords = prompt.get("point_coords")
		labels = prompt.get("point_labels")

		if not coords or labels is None:
			raise HTTPException(status_code=400, detail="Both point_coords and point_labels are required")

		if len(coords) != len(labels):
			raise HTTPException(status_code=400, detail="point_coords and point_labels must have the same length")

		point_coords = np.array(coords)
		point_labels = np.array(labels)
	elif prompt.get("points"):
		pts = np.array(prompt["points"])
		if pts.ndim != 2 or pts.shape[1] != 3:
			raise HTTPException(status_code=400, detail="Legacy points prompt must be shaped as [x, y, label]")
		point_coords = pts[:, :2]
		point_labels = pts[:, 2]

	multimask = prompt.get("multimask", True)
	return box, point_coords, point_labels, multimask


def _validate_inference_settings(inference_mode: str, patch_size: int) -> tuple[str, int]:
	if inference_mode not in SUPPORTED_INFERENCE_MODES:
		raise HTTPException(status_code=400, detail=f"Unsupported inference mode: {inference_mode}")

	if patch_size not in SUPPORTED_PATCH_SIZES:
		raise HTTPException(status_code=400, detail=f"Unsupported patch size: {patch_size}")

	return inference_mode, patch_size


def _run_predictor(
	img: np.ndarray,
	box: np.ndarray | None,
	point_coords: np.ndarray | None,
	point_labels: np.ndarray | None,
	multimask: bool,
) -> np.ndarray:
	predictor.set_image(img)
	masks, scores, _ = predictor.predict(
		box=box,
		point_coords=point_coords,
		point_labels=point_labels,
		multimask_output=multimask,
	)
	return masks[scores.argmax()]


def _clip_box_to_patch(box: np.ndarray, x0: int, y0: int, x1: int, y1: int) -> np.ndarray | None:
	ix1 = max(float(box[0]), x0)
	iy1 = max(float(box[1]), y0)
	ix2 = min(float(box[2]), x1)
	iy2 = min(float(box[3]), y1)

	if ix2 <= ix1 or iy2 <= iy1:
		return None

	return np.array([ix1 - x0, iy1 - y0, ix2 - x0, iy2 - y0], dtype=np.float32)


def _filter_points_to_patch(
	point_coords: np.ndarray | None,
	point_labels: np.ndarray | None,
	x0: int,
	y0: int,
	x1: int,
	y1: int,
) -> tuple[np.ndarray | None, np.ndarray | None]:
	if point_coords is None or point_labels is None:
		return None, None

	mask = (
		(point_coords[:, 0] >= x0)
		& (point_coords[:, 0] < x1)
		& (point_coords[:, 1] >= y0)
		& (point_coords[:, 1] < y1)
	)
	if not np.any(mask):
		return None, None

	patch_points = point_coords[mask].astype(np.float32).copy()
	patch_points[:, 0] -= x0
	patch_points[:, 1] -= y0
	return patch_points, point_labels[mask]


def _run_patch_based_sam(
	img: np.ndarray,
	box: np.ndarray | None,
	point_coords: np.ndarray | None,
	point_labels: np.ndarray | None,
	multimask: bool,
	patch_size: int,
) -> np.ndarray:
	height, width = img.shape[:2]
	final_mask = np.zeros((height, width), dtype=bool)

	for y0 in range(0, height, patch_size):
		for x0 in range(0, width, patch_size):
			y1 = min(y0 + patch_size, height)
			x1 = min(x0 + patch_size, width)

			patch_box = _clip_box_to_patch(box, x0, y0, x1, y1) if box is not None else None
			patch_points, patch_labels = _filter_points_to_patch(point_coords, point_labels, x0, y0, x1, y1)

			if patch_box is None and patch_points is None:
				continue

			patch_img = img[y0:y1, x0:x1]
			patch_mask = _run_predictor(
				patch_img,
				patch_box,
				patch_points,
				patch_labels,
				multimask,
			)
			final_mask[y0:y1, x0:x1] |= patch_mask.astype(bool)

	return final_mask


async def run_sam(
	image_file,
	prompt_json: str,
	preprocessing: str = "none",
	clip_limit: float = 2.0,
	tile_grid_size: int = 8,
	inference_mode: str = "whole_image",
	patch_size: int = 512,
	include_sam_input: bool = False,
) -> tuple[bytes, bytes | None]:
	data = await image_file.read()
	img = _decode_image(data)
	inference_mode, patch_size = _validate_inference_settings(inference_mode, patch_size)
	img = _apply_preprocessing(
		img,
		preprocessing,
		clip_limit=clip_limit,
		tile_grid_size=tile_grid_size,
	)
	sam_input_png = _encode_rgb_png(img) if include_sam_input else None
	LOGGER.info(
		"Running SAM segmentation with preprocessing=%s clip_limit=%s tile_grid_size=%s",
		preprocessing,
		clip_limit,
		tile_grid_size,
	)

	box, point_coords, point_labels, multimask = _parse_prompt(prompt_json)

	if inference_mode == "patch_based":
		best_mask = _run_patch_based_sam(
			img,
			box,
			point_coords,
			point_labels,
			multimask,
			patch_size,
		)
	else:
		best_mask = _run_predictor(
			img,
			box,
			point_coords,
			point_labels,
			multimask,
		)

	mask_img = (best_mask.astype(np.uint8) * 255).astype(np.uint8)

	_, png = cv2.imencode(".png", mask_img)
	return png.tobytes(), sam_input_png
