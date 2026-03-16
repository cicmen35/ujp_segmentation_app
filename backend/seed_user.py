import sqlite3
import uuid
import getpass
from backend.database import init_db, DB_FILE
from backend.auth_service import get_password_hash

def seed_admin():
    # Make sure DB and tables exist
    init_db()

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    username = input("Enter username for new admin user: ").strip()
    if not username:
        print("Username cannot be empty.")
        conn.close()
        return

    # Check if admin exists
    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    if cursor.fetchone():
        print(f"User '{username}' already exists.")
        conn.close()
        return

    password = getpass.getpass(f"Enter password for '{username}': ")
    confirm_password = getpass.getpass("Confirm password: ")

    if password != confirm_password:
        print("Passwords do not match.")
        conn.close()
        return
        
    if len(password) < 6:
        print("Password should be at least 6 characters long.")
        conn.close()
        return

    # Create admin user
    user_id = str(uuid.uuid4())
    pass_hash = get_password_hash(password)

    cursor.execute(
        "INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)",
        (user_id, username, pass_hash, 'admin')
    )
    conn.commit()
    conn.close()
    print(f"User '{username}' created successfully as an admin.")

if __name__ == "__main__":
    seed_admin()
