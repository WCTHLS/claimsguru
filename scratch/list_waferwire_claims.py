import pymssql

conn = pymssql.connect(
    server='cg-preprod-sql-vvekhbufuteq2.database.windows.net',
    user='claimsgurupreprodadmin',
    password='ClaimsGuruPreProdPass!2026',
    database='claimsguru',
    port=1433
)
cursor = conn.cursor()
cursor.execute("SELECT id, patient_id, policy_id, status, created_at FROM claims WHERE patient_id = 'Swagath Reddy Kasula'")
rows = cursor.fetchall()
print(f"Total claims with patient_id='Swagath Reddy Kasula': {len(rows)}")
for r in rows:
    print(f"  ID: {r[0]} | patient_id: '{r[1]}' | created: {r[4]}")
conn.close()
