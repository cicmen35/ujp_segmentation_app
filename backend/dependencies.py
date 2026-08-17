import datetime
import sqlite3

from fastapi import Depends, HTTPException, Request

from backend.config import COOKIE_SAMESITE, COOKIE_SECURE
from backend.database import get_db


# ---------------------------------------------------------------------------
# Cookie helpers
# ---------------------------------------------------------------------------

def get_cookie_settings() -> dict[str, object]:
    """Read auth cookie settings from explicit backend configuration."""
    return {"samesite": COOKIE_SAMESITE, "secure": COOKIE_SECURE}


def build_clear_cookie_header() -> str:
    """Return a Set-Cookie header that clears the auth cookie with matching attributes."""
    cookie_settings = get_cookie_settings()
    parts = ['session_token=""', "Max-Age=0", "Path=/", "HttpOnly"]

    samesite = cookie_settings["samesite"]
    if samesite == "none":
        parts.append("SameSite=None")
    elif samesite == "strict":
        parts.append("SameSite=Strict")
    else:
        parts.append("SameSite=Lax")

    if cookie_settings["secure"]:
        parts.append("Secure")

    return "; ".join(parts)


# ---------------------------------------------------------------------------
# Auth dependencies
# ---------------------------------------------------------------------------

def get_current_user(request: Request, db: sqlite3.Connection = Depends(get_db)):
    """Validate the session cookie and return the authenticated user dict."""
    token = request.cookies.get("session_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    cursor = db.cursor()
    cursor.execute(
        """
        SELECT u.id, u.username, u.role, s.expires_at
        FROM users u
        JOIN sessions s ON u.id = s.user_id
        WHERE s.token = ?
        """,
        (token,),
    )
    row = cursor.fetchone()

    clear_cookie_headers = {"Set-Cookie": build_clear_cookie_header()}

    if not row:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
            headers=clear_cookie_headers,
        )

    expires_at = datetime.datetime.fromisoformat(row["expires_at"])
    if expires_at < datetime.datetime.now(datetime.UTC):
        db.execute("DELETE FROM sessions WHERE token = ?", (token,))
        db.commit()
        raise HTTPException(
            status_code=401,
            detail="Session expired",
            headers=clear_cookie_headers,
        )

    return {"id": row["id"], "username": row["username"], "role": row["role"]}


def require_admin(user: dict = Depends(get_current_user)):
    """Dependency that additionally asserts the authenticated user is an admin."""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
