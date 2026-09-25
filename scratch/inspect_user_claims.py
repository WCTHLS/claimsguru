import pymssql

server = "cg-preprod-sql-vvekhbufuteq2.database.windows.net"
user = "claimsgurupreprodadmin"
password = "ClaimsGuruPreProdPass!2026"
database = "claimsguru"

conn = pymssql.connect(server=server, user=user, password=password, database=database, port=1433)
cursor = conn.cursor()

print("=== ALL USERS IN DATABASE ===")
cursor.execute("SELECT id, email, external_provider, external_subject_id, status FROM users")
for row in cursor.fetchall():
    print(f"ID: {row[0]} | Email: {row[1]} | Provider: {row[2]} | ExtSub: {row[3]} | Status: {row[4]}")

print("\n=== CLAIMS GROUPED BY PATIENT_ID ===")
cursor.execute("SELECT patient_id, COUNT(*) as cnt FROM claims GROUP BY patient_id ORDER BY cnt DESC")
for row in cursor.fetchall():
    print(f"patient_id in DB: '{row[0]}' | Count: {row[1]}")

conn.close()
