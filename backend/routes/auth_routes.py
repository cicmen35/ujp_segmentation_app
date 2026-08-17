from fastapi import APIRouter, Depends, HTTPException, Response, Request, status, Query
from pydantic import BaseModel, Field
import sqlite3
import datetime
import json

from backend.config import ENABLE_DEV_AUTH_BYPASS
from backend.database import get_db
from backend.dependencies import (
    get_cookie_settings,
    build_clear_cookie_header,
    get_current_user,
    require_admin,
)
from backend.schemas.auth import (
    UserResponse,
    UserListItemResponse,
    PromptPresetResponse,
)
from backend.schemas.common import MessageResponse
from backend.services.auth_service import verify_password, create_session, get_password_hash

router = APIRouter()


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=128)


class RegisterRequest(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=6, max_length=128)


class PromptPointPayload(BaseModel):
    x: float
    y: float
    label: int


class PromptPresetPayload(BaseModel):
    model: str
    prompt_mode: str
    preprocessing_mode: str
    bounding_box: list[float] | None = None
    prompt_points: list[PromptPointPayload]


def create_auth_response(response: Response, user_id: str, username: str, role: str, db: sqlite3.Connection):
    """Create a session cookie and return the authenticated user payload."""
    token = create_session(db, user_id)
    cookie_settings = get_cookie_settings()

    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        max_age=7 * 24 * 60 * 60,  # 7 days
        samesite=cookie_settings["samesite"],
        secure=cookie_settings["secure"],
    )
    return {"id": user_id, "username": username, "role": role}

@router.post("/login", response_model=UserResponse)
def login(
    login_req: LoginRequest,
    response: Response,
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    cursor.execute("SELECT id, username, password_hash, role FROM users WHERE username = ?", (login_req.username,))
    user = cursor.fetchone()
    
    if not user or not verify_password(login_req.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    return create_auth_response(
        response=response,
        user_id=user["id"],
        username=user["username"],
        role=user["role"],
        db=db,
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    register_req: RegisterRequest,
    response: Response,
    db: sqlite3.Connection = Depends(get_db),
):
    username = register_req.username.strip()
    password = register_req.password

    if not username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username cannot be empty")

    if len(password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long",
        )

    cursor = db.cursor()
    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    if cursor.fetchone():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists",
        )

    user_id = str(uuid.uuid4())
    password_hash = get_password_hash(password)

    cursor.execute(
        "INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)",
        (user_id, username, password_hash, "user"),
    )
    db.commit()

    return create_auth_response(
        response=response,
        user_id=user_id,
        username=username,
        role="user",
        db=db,
    )

@router.post("/logout", response_model=MessageResponse)
def logout(request: Request, response: Response, db: sqlite3.Connection = Depends(get_db)):
    token = request.cookies.get("session_token")
    if token:
        db.execute("DELETE FROM sessions WHERE token = ?", (token,))
        db.commit()
    cookie_settings = get_cookie_settings()
    response.delete_cookie(
        "session_token",
        samesite=cookie_settings["samesite"],
        secure=cookie_settings["secure"],
        httponly=True,
    )
    return {"message": "Logged out"}

__all__ = ["get_current_user", "require_admin"]


def delete_user_by_username(username: str, db: sqlite3.Connection):
    """Delete a user and their sessions by username."""
    cursor = db.cursor()
    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.execute("DELETE FROM sessions WHERE user_id = ?", (user["id"],))
    db.execute("DELETE FROM users WHERE id = ?", (user["id"],))
    db.commit()


@router.get("/me", response_model=UserResponse)
def get_me(user: dict = Depends(get_current_user)):
    return user


@router.get("/prompt-preset", response_model=PromptPresetResponse | None)
def get_prompt_preset(
    user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT model, prompt_mode, preprocessing_mode, bounding_box, prompt_points
        FROM prompt_presets
        WHERE user_id = ?
        """,
        (user["id"],),
    )
    row = cursor.fetchone()

    if not row:
        return None

    return {
        "model": row["model"],
        "prompt_mode": row["prompt_mode"],
        "preprocessing_mode": row["preprocessing_mode"],
        "bounding_box": json.loads(row["bounding_box"]) if row["bounding_box"] else None,
        "prompt_points": json.loads(row["prompt_points"]),
    }


@router.put("/prompt-preset", response_model=MessageResponse)
def save_prompt_preset(
    preset: PromptPresetPayload,
    user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    bounding_box_json = json.dumps(preset.bounding_box) if preset.bounding_box is not None else None
    prompt_points_json = json.dumps([point.model_dump() for point in preset.prompt_points])

    db.execute(
        """
        INSERT INTO prompt_presets (
            user_id, model, prompt_mode, preprocessing_mode, bounding_box, prompt_points
        )
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            model = excluded.model,
            prompt_mode = excluded.prompt_mode,
            preprocessing_mode = excluded.preprocessing_mode,
            bounding_box = excluded.bounding_box,
            prompt_points = excluded.prompt_points
        """,
        (
            user["id"],
            preset.model,
            preset.prompt_mode,
            preset.preprocessing_mode,
            bounding_box_json,
            prompt_points_json,
        ),
    )
    db.commit()

    return {"message": "Prompt preset saved"}


@router.get("/users", response_model=list[UserListItemResponse])
def list_users(
    q: str = Query(default="", max_length=100),
    limit: int = Query(default=5, ge=1, le=20),
    admin: dict = Depends(require_admin),
    db: sqlite3.Connection = Depends(get_db),
):
    pattern = f"%{q.strip()}%"
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT username, role
        FROM users
        WHERE username != ?
          AND username LIKE ?
        ORDER BY username ASC
        LIMIT ?
        """,
        (admin["username"], pattern, limit),
    )
    rows = cursor.fetchall()
    return [{"username": row["username"], "role": row["role"]} for row in rows]


@router.delete("/users/{username}", response_model=MessageResponse)
def delete_user(
    username: str,
    admin: dict = Depends(require_admin),
    db: sqlite3.Connection = Depends(get_db),
):
    if admin["username"] == username:
        raise HTTPException(status_code=400, detail="Admin cannot delete their own account")

    delete_user_by_username(username, db)

    return {"message": f"User '{username}' deleted"}


@router.delete("/dev/users/{username}", response_model=MessageResponse)
def dev_delete_user(username: str, db: sqlite3.Connection = Depends(get_db)):
    if not ENABLE_DEV_AUTH_BYPASS:
        raise HTTPException(status_code=404, detail="Not found")

    delete_user_by_username(username, db)
    return {"message": f"User '{username}' deleted via dev bypass"}
