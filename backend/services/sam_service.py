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
SUPPORTED_PREPROCESSING = {"none", "contrast_normalization"}


def _decode_image(data: bytes) -> np.ndarray:
	img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
	if img is None:
		raise HTTPException(status_code=400, detail="Invalid image upload")
	return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)


def _apply_preprocessing(img: np.ndarray, preprocessing: str) -> np.ndarray:
	if preprocessing == "none":
		return img

	if preprocessing != "contrast_normalization":
		raise HTTPException(status_code=400, detail=f"Unsupported preprocessing mode: {preprocessing}")

	# Enhance local contrast while preserving color channels for SAM input.
	lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
	l_channel, a_channel, b_channel = cv2.split(lab)
	clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
	enhanced_l = clahe.apply(l_channel)
	enhanced_lab = cv2.merge((enhanced_l, a_channel, b_channel))
	return cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2RGB)


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


async def run_sam(image_file, prompt_json: str, preprocessing: str = "none") -> bytes:
	data = await image_file.read()
	img = _decode_image(data)
	img = _apply_preprocessing(img, preprocessing)
	LOGGER.info("Running SAM segmentation with preprocessing=%s", preprocessing)

	predictor.set_image(img)

	box, point_coords, point_labels, multimask = _parse_prompt(prompt_json)

	masks, scores, _ = predictor.predict(
		box=box,
		point_coords=point_coords,
		point_labels=point_labels,
		multimask_output=multimask
	)

	best_mask = masks[scores.argmax()]
	mask_img = (best_mask * 255).astype(np.uint8)

	_, png = cv2.imencode(".png", mask_img)
	return png.tobytes()
