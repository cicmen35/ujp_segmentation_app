from passlib.context import CryptContext
import sqlite3
import datetime
import uuid

# Configuration for passlib bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_session(db: sqlite3.Connection, user_id: str) -> str:
    token = str(uuid.uuid4())
    # Session valid for 7 days
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=7)
    
    db.execute(
        "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)", 
        (token, user_id, expires_at.isoformat())
    )
    db.commit()
    return token
