from fastapi import APIRouter, Depends, HTTPException, Response, Request, status, Query
from pydantic import BaseModel
import sqlite3
import datetime
import uuid

from backend.config import COOKIE_SAMESITE, COOKIE_SECURE
from backend.database import get_db
from backend.services.auth_service import verify_password, create_session, get_password_hash

router = APIRouter()


def get_cookie_settings() -> dict[str, object]:
    """Read auth cookie settings from explicit backend configuration."""
    return {"samesite": COOKIE_SAMESITE, "secure": COOKIE_SECURE}


def build_clear_cookie_header() -> str:
    """Return a Set-Cookie header that clears the auth cookie with matching attributes."""
    cookie_settings = get_cookie_settings()
    parts = ['session_token=""', "Max-Age=0", "Path=/", "HttpOnly"]

    if cookie_settings["samesite"] == "none":
        parts.append("SameSite=None")
    else:
        parts.append("SameSite=Lax")

    if cookie_settings["secure"]:
        parts.append("Secure")

    return "; ".join(parts)

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str


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

@router.post("/login")
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


@router.post("/register", status_code=status.HTTP_201_CREATED)
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

@router.post("/logout")
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

def get_current_user(request: Request, db: sqlite3.Connection = Depends(get_db)):
    token = request.cookies.get("session_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    cursor = db.cursor()
    cursor.execute('''
        SELECT u.id, u.username, u.role, s.expires_at 
        FROM users u 
        JOIN sessions s ON u.id = s.user_id 
        WHERE s.token = ?
    ''', (token,))
    row = cursor.fetchone()
    
    clear_cookie_headers = {"Set-Cookie": build_clear_cookie_header()}
    
    if not row:
        raise HTTPException(
            status_code=401, 
            detail="Not authenticated", 
            headers=clear_cookie_headers
        )
        
    expires_at = datetime.datetime.fromisoformat(row["expires_at"])
    if expires_at < datetime.datetime.utcnow():
        db.execute("DELETE FROM sessions WHERE token = ?", (token,))
        db.commit()
        raise HTTPException(
            status_code=401, 
            detail="Session expired", 
            headers=clear_cookie_headers
        )
        
    return {"id": row["id"], "username": row["username"], "role": row["role"]}


def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return user


@router.get("/me")
def get_me(user: dict = Depends(get_current_user)):
    return user


@router.get("/users")
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


@router.delete("/users/{username}")
def delete_user(
    username: str,
    admin: dict = Depends(require_admin),
    db: sqlite3.Connection = Depends(get_db),
):
    if admin["username"] == username:
        raise HTTPException(status_code=400, detail="Admin cannot delete their own account")

    cursor = db.cursor()
    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.execute("DELETE FROM sessions WHERE user_id = ?", (user["id"],))
    db.execute("DELETE FROM users WHERE id = ?", (user["id"],))
    db.commit()

    return {"message": f"User '{username}' deleted"}
