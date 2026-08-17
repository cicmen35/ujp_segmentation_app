from __future__ import annotations

from typing import Any
from pydantic import BaseModel


class FolderNodeResponse(BaseModel):
    """Recursive node in the folder tree."""

    name: str
    path: str
    is_session: bool
    children: list[FolderNodeResponse]

# Required for the self-referential model to resolve correctly in Pydantic v2
FolderNodeResponse.model_rebuild()


class FolderTreeResponse(BaseModel):
    """Root payload returned by GET /files/tree."""

    private: list[FolderNodeResponse]
    shared: list[FolderNodeResponse]


class FolderItemResponse(BaseModel):
    """Newly created or confirmed folder, returned by POST /files/folders."""

    name: str
    path: str
    scope: str


class ItemResponse(BaseModel):
    """File or folder after a rename or copy operation."""

    scope: str
    name: str
    path: str
    kind: str


class SaveSessionResponse(BaseModel):
    """Confirmation payload returned after a successful POST /files/save-session."""

    scope: str
    session_folder: str
    path: str
    original_image: str
    mask_image: str


class SavedSessionResponse(BaseModel):
    """Full session record returned by GET /files/session."""

    scope: str
    name: str
    path: str
    original_image_name: str
    original_image_path: str
    mask_image_name: str
    mask_image_path: str
    prompt_metadata: dict[str, Any] | None = None
