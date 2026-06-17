import sqlite3
import os
import sys

sys.path.append(os.getcwd())
import auth

db_path = 'forensic_app.db'
if not os.path.exists(db_path):
    print(f"Database file '{db_path}' not found.")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT username, password_hash FROM Users WHERE username='deepti'")
    row = cursor.fetchone()
    if row:
        username, hashed_password = row
        print(f"User '{username}' found.")
        print(f"Matches 'admin123'? {auth.verify_password('admin123', hashed_password)}")
        print(f"Matches 'Sharada@1703'? {auth.verify_password('Sharada@1703', hashed_password)}")
    else:
        print("User 'deepti' not found.")
    conn.close()
