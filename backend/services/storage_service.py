import os
import re
import json
from datetime import datetime
from pathlib import Path
from shutil import copy2, copytree, rmtree

from fastapi import HTTPException

from backend.config import STORAGE_ROOT


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
    

def build_folder_tree(root: Path) -> list[dict]:
    def build_node(directory: Path) -> dict:
        child_directories = sorted(
            [child for child in directory.iterdir() if child.is_dir()],
            key=lambda child: child.name.lower(),
        )
        files = sorted(
            [child for child in directory.iterdir() if child.is_file()],
            key=lambda child: child.name.lower(),
        )
        return {
            "name": directory.name,
            "path": str(directory.relative_to(root)),
            "children": [build_node(child) for child in child_directories],
            "files": [
                {
                    "name": child.name,
                    "path": str(child.relative_to(root)),
                }
                for child in files
            ],
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


def write_prompt_metadata(session_dir: Path, payload: dict) -> None:
    prompt_file = session_dir / "prompt.json"
    prompt_file.write_text(json.dumps(payload, indent=2), encoding="utf-8")
