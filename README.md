# Image segmentation application

An interactive web application for image segmentation using the [Segment Anything Model (SAM)](https://github.com/facebookresearch/segment-anything) and a custom in-house, U-Net based model.

Provides a responsive UI where users can upload images, generate segmentation masks using bounding boxes or positive/negative point prompts, and download the resulting masks.

## Tech Stack
* **Frontend:** React, Vite, TailwindCSS, Zustand
* **Backend:** FastAPI, Python, PyTorch, OpenCV

## Architecture
The application runs as a lightweight Vite+React frontend bridging to a FastAPI backend that wraps the SAM PyTorch models. The backend expects a specific folder structure on the host machine to load the original Meta `segment-anything` repository and its heavy model checkpoints (this can be adjusted by changing the paths in the backend if necessary).

---

## Quick Setup 

### 1. Backend Setup
Clone the [segment-anything](https://github.com/facebookresearch/segment-anything) repository and download the `sam_vit_h_4b8939.pth` checkpoint into its `checkpoints` folder. The app expects the following sibling folder structure:

```text
user/
├── ujp_segmentation_app/
│   └── backend/
└── models/
    ├── venv/
    └── segment-anything/
        └── checkpoints/
            └── sam_vit_h_4b8939.pth
```

Activate your Python environment and start the server:
```bash
cd backend
source ../../models/venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## Docker Setup

```bash
docker-compose up -d
```
*WIP*

---

## Demo

*(A video demonstration will be uploaded here).*
