import json
import numpy as np
import cv2
import torch
from pathlib import Path

from segment_anything import sam_model_registry, SamPredictor

BASE_DIR = Path(__file__).resolve().parent.parent
CHECKPOINT = BASE_DIR / "segment-anything" / "checkpoints" / "sam_vit_h_4b8939.pth"
MODEL_TYPE = "vit_h"

sam = sam_model_registry[MODEL_TYPE](checkpoint=str(CHECKPOINT))
sam.to("cpu")
predictor = SamPredictor(sam)

async def run_sam(image_file, prompt_json: str) -> bytes:
	data = await image_file.read()
	img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
	img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

	predictor.set_image(img)

	prompt = json.loads(prompt_json)

	box = None
	if "box" in prompt and prompt["box"]:
		box = np.array(prompt["box"])

	point_coords = None
	point_labels = None
	if "points" in prompt and prompt["points"]:
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