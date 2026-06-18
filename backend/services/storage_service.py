import os
import re
import json
from datetime import datetime
from pathlib import Path
from shutil import copy2, copytree, rmtree

from fastapi import HTTPException

from backend.config import STORAGE_ROOT

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}


def ensure_storage_root() -> Path:
    STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
    return STORAGE_ROOT


def get_shared_root() -> Path:
    root = ensure_storage_root() / "shared"
    root.mkdir(parents=True, exist_ok=True)
    return root


def get_private_root(user_id: str) -> Path:
    root = ensure_storage_root() / "private" / user_id
    root.mkdir(parents=True, exist_ok=True)
    return root


def _sanitize_name(
    name: str | None,
    *,
    fallback: str | None = None,
    trim_to_basename: bool = False,
    empty_detail: str,
    invalid_detail: str,
) -> str:
    raw_value = name if name is not None else fallback
    candidate = str(raw_value or "").strip()

    if trim_to_basename:
        candidate = Path(candidate).name.strip()

    if not candidate:
        if fallback is not None:
            return fallback
        raise HTTPException(status_code=400, detail=empty_detail)

    if candidate in {".", ".."} or "/" in candidate or "\\" in candidate:
        raise HTTPException(status_code=400, detail=invalid_detail)

    return candidate


def sanitize_folder_name(name: str) -> str:
    return _sanitize_name(
        name,
        empty_detail="Folder name cannot be empty",
        invalid_detail="Folder name contains invalid characters",
    )


def sanitize_item_name(name: str) -> str:
    return _sanitize_name(
        name,
        trim_to_basename=True,
        empty_detail="Name cannot be empty",
        invalid_detail="Name contains invalid characters",
    )


def sanitize_filename(name: str) -> str:
    return _sanitize_name(
        name,
        fallback="image.png",
        trim_to_basename=True,
        empty_detail="Filename cannot be empty",
        invalid_detail="Filename contains invalid characters",
    )


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


def resolve_relative_file(root: Path, relative_path: str) -> Path:
    root_resolved = root.resolve()
    candidate = (root_resolved / relative_path).resolve()

    if os.path.commonpath([str(root_resolved), str(candidate)]) != str(root_resolved):
        raise HTTPException(status_code=400, detail="Invalid file path")

    if not candidate.exists() or not candidate.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    return candidate


def rename_relative_item(root: Path, relative_path: str, new_name: str, kind: str) -> dict[str, str]:
    root_resolved = root.resolve()
    sanitized_name = sanitize_item_name(new_name)

    if kind == "folder":
        source = resolve_relative_directory(root_resolved, relative_path)
    elif kind == "file":
        source = resolve_relative_file(root_resolved, relative_path)
    else:
        raise HTTPException(status_code=400, detail="Invalid item type")

    if source.resolve() == root_resolved:
        raise HTTPException(status_code=400, detail="Root folder cannot be renamed")

    target = source.parent / sanitized_name
    if target.exists() and target.resolve() != source.resolve():
        raise HTTPException(status_code=409, detail="An item with that name already exists")

    source.rename(target)
    return {
        "name": target.name,
        "path": str(target.relative_to(root_resolved)),
        "kind": kind,
    }

def copy_relative_item(
    source_root: Path,
    source_path: str,
    kind: str,
    destination_root: Path,
    destination_parent_path: str | None = None,
    *,
    replace: bool = False,
    new_name: str | None = None,
) -> dict[str, str]:
    source_root_resolved = source_root.resolve()
    destination_root_resolved = destination_root.resolve()

    if kind == "folder":
        source = resolve_relative_directory(source_root_resolved, source_path)
    elif kind == "file":
        source = resolve_relative_file(source_root_resolved, source_path)
    else:
        raise HTTPException(status_code=400, detail="Invalid item type")

    if kind == "folder" and source.resolve() == source_root_resolved:
        raise HTTPException(status_code=400, detail="Root folder cannot be copied")

    destination_parent = resolve_relative_directory(destination_root_resolved, destination_parent_path)
    target_name = sanitize_item_name(new_name) if new_name is not None else source.name
    target = destination_parent / target_name

    if target.exists():
        if not replace:
            raise HTTPException(status_code=409, detail=f"{kind.capitalize()} already exists")

        if kind == "folder":
            if not target.is_dir():
                raise HTTPException(status_code=409, detail="A file with the same name already exists")
            rmtree(target)
        else:
            if not target.is_file():
                raise HTTPException(status_code=409, detail="A folder with the same name already exists")
            target.unlink()

    if kind == "folder":
        copytree(source, target)
    else:
        copy2(source, target)

    return {
        "name": target.name,
        "path": str(target.relative_to(destination_root_resolved)),
        "kind": kind,
    }


def _get_session_image_files(directory: Path) -> tuple[Path, Path] | None:
    image_files = sorted(
        [child for child in directory.iterdir() if child.is_file() and child.suffix.lower() in IMAGE_EXTENSIONS],
        key=lambda child: child.name.lower(),
    )
    mask_files = [child for child in image_files if child.stem.lower().endswith("_mask")]
    if len(mask_files) != 1:
        return None

    original_files = [child for child in image_files if child != mask_files[0]]
    if len(original_files) != 1:
        return None

    return original_files[0], mask_files[0]


def is_saved_session_directory(directory: Path) -> bool:
    return _get_session_image_files(directory) is not None


def load_saved_session(root: Path, relative_path: str) -> dict:
    session_dir = resolve_relative_directory(root, relative_path)
    session_files = _get_session_image_files(session_dir)
    if session_files is None:
        raise HTTPException(status_code=404, detail="Saved session not found")

    original_image, mask_image = session_files
    prompt_payload = None
    prompt_file = session_dir / "prompt.json"
    if prompt_file.exists():
        try:
            prompt_payload = json.loads(prompt_file.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=500, detail="Saved session prompt metadata is invalid") from exc

        if not isinstance(prompt_payload, dict):
            raise HTTPException(status_code=500, detail="Saved session prompt metadata is invalid")

    return {
        "name": session_dir.name,
        "path": str(session_dir.relative_to(root)),
        "original_image_name": original_image.name,
        "original_image_path": str(original_image.relative_to(root)),
        "mask_image_name": mask_image.name,
        "mask_image_path": str(mask_image.relative_to(root)),
        "prompt_metadata": prompt_payload,
    }


def build_folder_tree(root: Path) -> list[dict]:
    def build_node(directory: Path) -> dict:
        child_directories = sorted(
            [child for child in directory.iterdir() if child.is_dir()],
            key=lambda child: child.name.lower(),
        )
        return {
            "name": directory.name,
            "path": str(directory.relative_to(root)),
            "is_session": is_saved_session_directory(directory),
            "children": [build_node(child) for child in child_directories],
        }

    return [build_node(child) for child in sorted(root.iterdir(), key=lambda item: item.name.lower()) if child.is_dir()]


def build_session_folder(parent: Path, image_filename: str) -> tuple[Path, str, str]:
    original_filename = sanitize_filename(image_filename)
    image_path = Path(original_filename)
    stem = sanitize_session_stem(image_path.stem)
    mask_filename = f"{stem}_mask.png"
    return parent / f"{stem}_{datetime.now().strftime('%Y%m%d_%H%M%S')}", original_filename, mask_filename


def prepare_session_folder(
    parent: Path,
    image_filename: str,
    *,
    session_name: str | None = None,
    replace: bool = False,
) -> tuple[Path, str, str]:
    session_dir, original_filename, mask_filename = build_session_folder(parent, image_filename)
    if session_name:
        session_dir = parent / sanitize_folder_name(session_name)

    if session_dir.exists():
        if not replace:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "session_exists",
                    "message": "Session already exists",
                    "session_name": session_dir.name,
                },
            )

        if not session_dir.is_dir():
            raise HTTPException(status_code=409, detail="A file with the same name already exists")

        rmtree(session_dir)

    session_dir.mkdir(parents=True, exist_ok=False)
    return session_dir, original_filename, mask_filename


def write_prompt_metadata(session_dir: Path, payload: dict) -> None:
    prompt_file = session_dir / "prompt.json"
    prompt_file.write_text(json.dumps(payload, indent=2), encoding="utf-8")
