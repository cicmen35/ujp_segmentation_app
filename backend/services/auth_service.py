from passlib.context import CryptContext
import secrets
import sqlite3
import datetime

# Configuration for passlib bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_session(db: sqlite3.Connection, user_id: str) -> str:
    # secrets.token_urlsafe gives 256 bits from os.urandom — cryptographically stronger than uuid4
    token = secrets.token_urlsafe(32)
    # Session valid for 7 days; use timezone-aware UTC (utcnow() is deprecated since Python 3.12)
    expires_at = datetime.datetime.now(datetime.UTC) + datetime.timedelta(days=7)

    db.execute(
        "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
        (token, user_id, expires_at.isoformat())
    )
    db.commit()
    return token

