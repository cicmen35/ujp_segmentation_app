import os
import re
from datetime import datetime
from pathlib import Path

from fastapi import HTTPException

from backend.config import STORAGE_ROOT


def ensure_storage_root() -> Path:
    STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
    return STORAGE_ROOT


def get_shared_root() -> Path:
    root = ensure_storage_root() / "shared"
    root.mkdir(parents=True, exist_ok=True)
    return root


def get_private_root(username: str) -> Path:
    root = ensure_storage_root() / "private" / username
    root.mkdir(parents=True, exist_ok=True)
    return root


def sanitize_folder_name(name: str) -> str:
    candidate = name.strip()
    if not candidate:
        raise HTTPException(status_code=400, detail="Folder name cannot be empty")

    if candidate in {".", ".."} or "/" in candidate or "\\" in candidate:
        raise HTTPException(status_code=400, detail="Folder name contains invalid characters")

    return candidate


def sanitize_filename(name: str) -> str:
    candidate = Path(name or "image.png").name.strip()
    if not candidate:
        return "image.png"
    return candidate


def sanitize_session_stem(name: str) -> str:
    candidate = re.sub(r"[^A-Za-z0-9._-]+", "_", name.strip()).strip("._-")
    return candidate or "session"


def resolve_relative_directory(root: Path, relative_path: str | None) -> Path:
    root_resolved = root.resolve()
    if not relative_path:
        return root_resolved

    candidate = (root_resolved / relative_path).resolve()
    if os.path.commonpath([str(root_resolved), str(candidate)]) != str(root_resolved):
        raise HTTPException(status_code=400, detail="Invalid folder path")

    if not candidate.exists() or not candidate.is_dir():
        raise HTTPException(status_code=404, detail="Folder not found")

    return candidate


def build_folder_tree(root: Path) -> list[dict]:
    def build_node(directory: Path) -> dict:
        children = sorted(
            [child for child in directory.iterdir() if child.is_dir()],
            key=lambda child: child.name.lower(),
        )
        return {
            "name": directory.name,
            "path": str(directory.relative_to(root)),
            "children": [build_node(child) for child in children],
        }

    return [build_node(child) for child in sorted(root.iterdir(), key=lambda item: item.name.lower()) if child.is_dir()]


def build_session_folder(parent: Path, image_filename: str) -> tuple[Path, str, str]:
    original_filename = sanitize_filename(image_filename)
    image_path = Path(original_filename)
    stem = sanitize_session_stem(image_path.stem)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    session_name = f"{stem}_{timestamp}"
    session_dir = parent / session_name

    suffix = 1
    while session_dir.exists():
        session_name = f"{stem}_{timestamp}_{suffix}"
        session_dir = parent / session_name
        suffix += 1

    session_dir.mkdir(parents=True, exist_ok=False)
    mask_filename = f"{stem}_mask.png"
    return session_dir, original_filename, mask_filename
