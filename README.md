# Image Segmentation Application

An interactive web application for image segmentation using the [Segment Anything Model (SAM)](https://github.com/facebookresearch/segment-anything) and a custom U-Net based model.

Users can upload images, generate segmentation masks via bounding boxes or point prompts, and download results.

## Tech Stack
* **Frontend:** React, TypeScript, Vite, TailwindCSS, Zustand
* **Backend:** FastAPI, Python, PyTorch, OpenCV, SQLite

## Architecture
A Vite + React frontend communicates with a FastAPI backend that wraps SAM PyTorch models. The backend includes auth, file storage, and session management. SAM model files are expected as siblings to the repo (see below).

---

## Local Development

### Prerequisites
Clone the [segment-anything](https://github.com/facebookresearch/segment-anything) repo and download the `sam_vit_h_4b8939.pth` checkpoint. Expected folder layout:

```text
parent/
├── ujp_segmentation_app/
└── models/
    └── segment-anything/
        └── checkpoints/
            └── sam_vit_h_4b8939.pth
```

### Backend
```bash
python -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app:app --reload
```

**Environment variables** (all optional, sensible defaults provided):

| Variable | Default | Description |
|---|---|---|
| `CORS_ALLOW_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |
| `STORAGE_ROOT` | `backend/data/storage` | File storage directory |
| `COOKIE_SAMESITE` | `none` | Cookie SameSite policy |
| `COOKIE_SECURE` | `true` | Secure cookie flag |
| `ENABLE_DEV_AUTH_BYPASS` | `false` | Skip auth checks in development |

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Deployment (VM)

The `deploy/` folder contains a systemd service file and a helper script for VM deployments:

```bash
# Deploy frontend only
./deploy/update-vm.sh frontend

# Restart backend service only
./deploy/update-vm.sh backend

# Full redeploy
./deploy/update-vm.sh all
```

The backend runs under systemd (`deploy/segment-web-app-backend.service`) with nginx as a reverse proxy (`deploy/nginx-segment-web-app.conf`). Copy `deploy/backend.env` with your production env vars before starting.

---

## Demo

[![Watch the demo](https://img.youtube.com/vi/3brko6lT9Yg/0.jpg)](https://www.youtube.com/watch?v=3brko6lT9Yg)
