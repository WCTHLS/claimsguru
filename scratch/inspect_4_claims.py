import pymssql

server = "cg-preprod-sql-vvekhbufuteq2.database.windows.net"
user = "claimsgurupreprodadmin"
password = "ClaimsGuruPreProdPass!2026"
database = "claimsguru"

conn = pymssql.connect(server=server, user=user, password=password, database=database, port=1433)
cursor = conn.cursor()

cids = ['6d03cc00', '87ee0b59', '56a48c9a', '07bf1739']
print("=== INSPECTING THE 4 CLAIMS SHOWN IN SCREENSHOT ===")
for cid in cids:
    cursor.execute(f"SELECT id, patient_id, policy_id, status, created_at FROM claims WHERE CAST(id AS VARCHAR(50)) LIKE '{cid}%'")
    rows = cursor.fetchall()
    for r in rows:
        print(f"Claim ID: {r[0]} | patient_id in DB: '{r[1]}' | policy_id in DB: '{r[2]}' | status: {r[3]} | Created: {r[4]}")

conn.close()
