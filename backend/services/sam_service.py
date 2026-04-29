import json
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

SUPPORTED_PREPROCESSING = {"none", "contrast_change"}


def _apply_histogram_normalization(img: np.ndarray) -> np.ndarray:
	lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
	l_channel, a_channel, b_channel = cv2.split(lab)
	normalized_l = cv2.equalizeHist(l_channel)
	normalized_lab = cv2.merge((normalized_l, a_channel, b_channel))
	return cv2.cvtColor(normalized_lab, cv2.COLOR_LAB2RGB)


def _apply_contrast_adjustment(img: np.ndarray) -> np.ndarray:
	lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
	l_channel, a_channel, b_channel = cv2.split(lab)
	clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
	enhanced_l = clahe.apply(l_channel)
	enhanced_lab = cv2.merge((enhanced_l, a_channel, b_channel))
	return cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2RGB)


def _apply_preprocessing(img: np.ndarray, preprocessing: str) -> np.ndarray:
	if preprocessing == "none":
		return img

	if preprocessing not in SUPPORTED_PREPROCESSING:
		raise HTTPException(status_code=400, detail=f"Unsupported preprocessing mode: {preprocessing}")

	img = _apply_histogram_normalization(img)
	return _apply_contrast_adjustment(img)


async def run_sam(image_file, prompt_json: str, preprocessing: str = "none") -> bytes:
	data = await image_file.read()
	img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
	if img is None:
		raise HTTPException(status_code=400, detail="Invalid image file")
	img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
	img = _apply_preprocessing(img, preprocessing)

	predictor.set_image(img)

	prompt = json.loads(prompt_json)

	box = None
	if "box" in prompt and prompt["box"]:
		box = np.array(prompt["box"])

	point_coords = None
	point_labels = None
	if "point_coords" in prompt and prompt["point_coords"]:
		point_coords = np.array(prompt["point_coords"])
		point_labels = np.array(prompt.get("point_labels", []))
	elif "points" in prompt and prompt["points"]:
		pts = np.array(prompt["points"])
		point_coords = pts[:, :2]
		point_labels = pts[:, 2]

	multimask = prompt.get("multimask", True)

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
