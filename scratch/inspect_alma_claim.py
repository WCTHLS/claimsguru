import pymssql

conn = pymssql.connect(
    server='cg-preprod-sql-vvekhbufuteq2.database.windows.net',
    user='claimsgurupreprodadmin',
    password='ClaimsGuruPreProdPass!2026',
    database='claimsguru',
    port=1433
)
cursor = conn.cursor()
cursor.execute("SELECT id, patient_id, policy_id, status, created_at FROM claims WHERE CAST(id AS VARCHAR(50)) LIKE '8b19c561%'")
rows = cursor.fetchall()
for r in rows:
    print(f"Claim ID: {r[0]} | patient_id in DB: '{r[1]}' | policy_id: '{r[2]}' | created_at: {r[4]}")

cursor.execute("SELECT TOP 5 id, patient_id, policy_id, status, created_at FROM claims ORDER BY created_at DESC")
print("\n--- TOP 5 MOST RECENT CLAIMS ---")
for r in cursor.fetchall():
    print(f"Claim ID: {r[0]} | patient_id: '{r[1]}' | created_at: {r[4]}")

conn.close()
