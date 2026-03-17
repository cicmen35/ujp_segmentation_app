import json
import os
import sqlite3
import sys
import uuid
from http.cookies import SimpleCookie
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen


REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.append(str(REPO_ROOT))

from backend.database import DB_FILE, init_db
from backend.services.auth_service import get_password_hash


BASE_URL = os.getenv("AUTH_TEST_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
USERNAME = os.getenv("AUTH_TEST_USERNAME", "auth-smoke-test")
PASSWORD = os.getenv("AUTH_TEST_PASSWORD", "change-me-123")
ROLE = os.getenv("AUTH_TEST_ROLE", "admin")


def ensure_test_user() -> None:
    """Create or refresh the local smoke-test user before the API checks run."""
    init_db()
    conn = sqlite3.connect(DB_FILE)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE username = ?", (USERNAME,))
        row = cursor.fetchone()

        if row:
            cursor.execute(
                "UPDATE users SET password_hash = ?, role = ? WHERE username = ?",
                (get_password_hash(PASSWORD), ROLE, USERNAME),
            )
            print(f"Using existing user '{USERNAME}'.")
        else:
            cursor.execute(
                "INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)",
                (str(uuid.uuid4()), USERNAME, get_password_hash(PASSWORD), ROLE),
            )
            print(f"Created test user '{USERNAME}'.")

        conn.commit()
    finally:
        conn.close()


def call(method: str, path: str, body: dict | None = None, cookie: str | None = None):
    """Send one request to the backend and return its status, headers, and body."""
    headers = {}
    data = None

    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")

    if cookie:
        headers["Cookie"] = cookie

    req = Request(f"{BASE_URL}{path}", data=data, headers=headers, method=method)

    try:
        with urlopen(req) as response:
            normalized_headers = {
                key.lower(): value for key, value in response.headers.items()
            }
            return response.status, normalized_headers, response.read().decode("utf-8")
    except HTTPError as exc:
        normalized_headers = {
            key.lower(): value for key, value in exc.headers.items()
        }
        return exc.code, normalized_headers, exc.read().decode("utf-8")


def extract_cookie(set_cookie: str) -> str | None:
    """Read the `session_token` value from a `Set-Cookie` response header."""
    jar = SimpleCookie()
    jar.load(set_cookie)
    token = jar.get("session_token")
    return token.value if token else None


def expect(ok: bool, label: str) -> bool:
    """Print a single pass/fail result for one endpoint check."""
    print(f"[{'PASS' if ok else 'FAIL'}] {label}")
    return ok


def main() -> int:
    """Run the auth smoke test against the backend and report any failures."""
    ensure_test_user()
    failures = 0

    status, _, body = call("GET", "/health")
    failures += not expect(status == 200 and '"status"' in body, "GET /health")

    status, headers, _ = call("GET", "/auth/me", cookie="session_token=stale-token")
    cleared = headers.get("set-cookie", "")
    failures += not expect(status == 401, "GET /auth/me rejects stale cookie")
    failures += not expect("session_token=" in cleared and "Max-Age=0" in cleared, "GET /auth/me clears stale cookie")

    status, _, _ = call(
        "POST",
        "/auth/login",
        {"username": USERNAME, "password": "wrong-password"},
    )
    failures += not expect(status == 401, "POST /auth/login rejects wrong password")

    status, headers, _ = call(
        "POST",
        "/auth/login",
        {"username": USERNAME, "password": PASSWORD},
    )
    token = extract_cookie(headers.get("set-cookie", ""))
    failures += not expect(status == 200, "POST /auth/login accepts valid credentials")
    failures += not expect(bool(token), "POST /auth/login sets session cookie")

    session_cookie = f"session_token={token}" if token else ""

    status, _, body = call("GET", "/auth/me", cookie=session_cookie)
    failures += not expect(status == 200 and USERNAME in body, "GET /auth/me accepts session cookie")

    status, headers, _ = call("POST", "/auth/logout", cookie=session_cookie)
    cleared = headers.get("set-cookie", "")
    failures += not expect(status == 200, "POST /auth/logout")
    failures += not expect("session_token=" in cleared and "Max-Age=0" in cleared, "POST /auth/logout clears cookie")

    status, headers, _ = call("GET", "/auth/me", cookie=session_cookie)
    cleared = headers.get("set-cookie", "")
    failures += not expect(status == 401, "GET /auth/me rejects logged-out cookie")
    failures += not expect("session_token=" in cleared and "Max-Age=0" in cleared, "GET /auth/me clears logged-out cookie")

    if failures:
        print(f"\n{failures} check(s) failed.")
        return 1

    print("\nAll auth endpoint checks passed.")
    print("Override defaults with AUTH_TEST_BASE_URL, AUTH_TEST_USERNAME, and AUTH_TEST_PASSWORD if needed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
