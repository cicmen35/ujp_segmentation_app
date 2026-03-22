from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
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
    role: str = 'user'

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
        
    token = create_session(db, user["id"])
    cookie_settings = get_cookie_settings()

    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        max_age=7 * 24 * 60 * 60,  # 7 days
        samesite=cookie_settings["samesite"],
        secure=cookie_settings["secure"],
    )
    return {"id": user["id"], "username": user["username"], "role": user["role"]}

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

@router.get("/me")
def get_me(user: dict = Depends(get_current_user)):
    return user
