from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from pydantic import BaseModel
import sqlite3
import datetime
import uuid

from backend.database import get_db
from backend.services.auth_service import verify_password, create_session, get_password_hash

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str = 'user'

@router.post("/login")
def login(login_req: LoginRequest, response: Response, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT id, username, password_hash, role FROM users WHERE username = ?", (login_req.username,))
    user = cursor.fetchone()
    
    if not user or not verify_password(login_req.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
        
    token = create_session(db, user["id"])
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        max_age=7 * 24 * 60 * 60,  # 7 days
        samesite="none",
        secure=True, # Critical for SameSite=none
    )
    return {"message": "Login successful"}

@router.post("/logout")
def logout(request: Request, response: Response, db: sqlite3.Connection = Depends(get_db)):
    token = request.cookies.get("session_token")
    if token:
        db.execute("DELETE FROM sessions WHERE token = ?", (token,))
        db.commit()
    response.delete_cookie("session_token", samesite="none", secure=True, httponly=True)
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
    
    clear_cookie_headers = {"Set-Cookie": 'session_token=""; Max-Age=0; Path=/; HttpOnly; SameSite=none; Secure'}
    
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
