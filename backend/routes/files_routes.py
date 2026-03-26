from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
import sqlite3

from backend.database import get_db
from backend.routes.auth_routes import get_current_user
from backend.services.storage_service import (
    build_folder_tree,
    build_session_folder,
    get_private_root,
    get_shared_root,
    resolve_relative_directory,
    sanitize_folder_name,
)

router = APIRouter()


class CreateFolderRequest(BaseModel):
    scope: str
    name: str
    parent_path: str | None = None


def get_scope_root(user: dict, scope: str):
    if scope == "private":
        return get_private_root(user["username"])

    if scope == "shared":
        if user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Shared folders require admin access")
        return get_shared_root()

    raise HTTPException(status_code=400, detail="Invalid folder scope")


@router.get("/tree")
def get_folder_tree(user: dict = Depends(get_current_user)):
    private_root = get_private_root(user["username"])
    payload = {
        "private": build_folder_tree(private_root),
        "shared": [],
    }

    if user["role"] == "admin":
        payload["shared"] = build_folder_tree(get_shared_root())

    return payload


@router.post("/folders")
def create_folder(
    request: CreateFolderRequest,
    user: dict = Depends(get_current_user),
):
    root = get_scope_root(user, request.scope)
    parent = resolve_relative_directory(root, request.parent_path)
    folder_name = sanitize_folder_name(request.name)
    target = parent / folder_name

    if target.exists():
        raise HTTPException(status_code=409, detail="Folder already exists")

    target.mkdir(parents=False, exist_ok=False)
    path = str(target.relative_to(root))
    return {"name": folder_name, "path": path, "scope": request.scope}


@router.post("/save-session")
async def save_session(
    original_image: UploadFile = File(...),
    mask_image: UploadFile = File(...),
    scope: str = Form("private"),
    parent_path: str = Form(""),
    user: dict = Depends(get_current_user),
):
    root = get_scope_root(user, scope)
    parent = resolve_relative_directory(root, parent_path or None)
    session_dir, original_filename, mask_filename = build_session_folder(parent, original_image.filename or "image.png")

    original_bytes = await original_image.read()
    mask_bytes = await mask_image.read()

    (session_dir / original_filename).write_bytes(original_bytes)
    (session_dir / mask_filename).write_bytes(mask_bytes)

    return {
        "scope": scope,
        "session_folder": session_dir.name,
        "path": str(session_dir.relative_to(root)),
        "original_image": original_filename,
        "mask_image": mask_filename,
    }
