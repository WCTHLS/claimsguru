import pymssql

conn = pymssql.connect(
    server='cg-preprod-sql-vvekhbufuteq2.database.windows.net',
    user='claimsgurupreprodadmin',
    password='ClaimsGuruPreProdPass!2026',
    database='claimsguru',
    port=1433
)
cursor = conn.cursor()
cursor.execute("DELETE FROM claims WHERE patient_id = 'Swagath Reddy'")
conn.commit()
print(f"Deleted orphan display-name claims: {cursor.rowcount}")
conn.close()
