import sqlite3
import os

db_path = r'D:\02 genAI\hr-ims\backend\prisma\dev.db'
output_file = r'D:\02 genAI\hr-ims\frontend\next-app\db_status.txt'

try:
    if not os.path.exists(db_path):
        with open(output_file, 'w') as f:
            f.write(f"Database not found at {db_path}")
        exit(1)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(Settings)")
    columns = cursor.fetchall()
    
    found = False
    col_names = []
    for col in columns:
        col_names.append(col[1])
        if col[1] == 'allowRegistration':
            found = True
            
    with open(output_file, 'w') as f:
        if found:
            f.write("SUCCESS: 'allowRegistration' column found.")
        else:
            f.write(f"FAILURE: 'allowRegistration' column NOT found. Existing columns: {col_names}")
            
    conn.close()
except Exception as e:
    with open(output_file, 'w') as f:
        f.write(f"Error: {e}")
