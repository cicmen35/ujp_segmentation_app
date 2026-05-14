from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from shutil import rmtree
import sqlite3

from backend.database import get_db
from backend.routes.auth_routes import get_current_user
from backend.services.storage_service import (
    build_folder_tree,
    build_session_folder,
    get_private_root,
    get_shared_root,
    resolve_relative_directory,
    resolve_relative_file,
    sanitize_folder_name,
)

router = APIRouter()


class CreateFolderRequest(BaseModel):
    scope: str
    name: str
    parent_path: str | None = None


def get_scope_root(user: dict, scope: str):
    if scope == "private":
        return get_private_root(user["id"])

    if scope == "shared":
        return get_shared_root()

    raise HTTPException(status_code=400, detail="Invalid folder scope")


def require_shared_folder_admin(user: dict, scope: str):
    if scope == "shared" and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Shared folder management requires admin access")


@router.get("/tree")
def get_folder_tree(user: dict = Depends(get_current_user)):
    private_root = get_private_root(user["id"])
    payload = {
        "private": build_folder_tree(private_root),
        "shared": build_folder_tree(get_shared_root()),
    }

    return payload


@router.post("/folders")
def create_folder(
    request: CreateFolderRequest,
    user: dict = Depends(get_current_user),
):
    require_shared_folder_admin(user, request.scope)
    root = get_scope_root(user, request.scope)
    parent = resolve_relative_directory(root, request.parent_path)
    folder_name = sanitize_folder_name(request.name)
    target = parent / folder_name

    if target.exists():
        raise HTTPException(status_code=409, detail="Folder already exists")

    target.mkdir(parents=False, exist_ok=False)
    path = str(target.relative_to(root))
    return {"name": folder_name, "path": path, "scope": request.scope}


@router.delete("/folders")
def delete_folder(
    scope: str,
    path: str,
    user: dict = Depends(get_current_user),
):
    require_shared_folder_admin(user, scope)
    root = get_scope_root(user, scope)
    target = resolve_relative_directory(root, path)

    if target.resolve() == root.resolve():
        raise HTTPException(status_code=400, detail="Root folder cannot be deleted")

    rmtree(target)
    return {"message": "Folder deleted"}


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


@router.get("/content")
def get_file_content(
    scope: str,
    path: str,
    user: dict = Depends(get_current_user),
):
    root = get_scope_root(user, scope)
    target = resolve_relative_file(root, path)
    return FileResponse(target)
