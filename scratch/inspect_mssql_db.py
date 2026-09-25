import pymssql

server = "cg-preprod-sql-vvekhbufuteq2.database.windows.net"
user = "claimsgurupreprodadmin"
password = "ClaimsGuruPreProdPass!2026"
database = "claimsguru"

conn = pymssql.connect(server=server, user=user, password=password, database=database, port=1433)
cursor = conn.cursor()

print("=== USERS TABLE COLUMNS ===")
cursor.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users'")
for row in cursor.fetchall():
    print(f"  {row[0]} ({row[1]})")

print("\n=== CLAIMS TABLE COLUMNS ===")
cursor.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'claims'")
for row in cursor.fetchall():
    print(f"  {row[0]} ({row[1]})")

print("\n=== ALL USERS IN DB ===")
cursor.execute("SELECT * FROM users")
for row in cursor.fetchall():
    print(row)

print("\n=== SEARCHING WAFERWIRE IN ALL TABLES ===")
cursor.execute("SELECT * FROM users WHERE email LIKE '%waferwire%'")
for row in cursor.fetchall():
    print("User row:", row)

print("\n=== ALL CLAIMS IN DB ===")
cursor.execute("SELECT TOP 30 id, patient_id, policy_id, status, created_at FROM claims ORDER BY created_at DESC")
for row in cursor.fetchall():
    print(f"Claim ID: {row[0]} | patient_id: '{row[1]}' | policy_id: '{row[2]}' | status: {row[3]} | Created: {row[4]}")

conn.close()
