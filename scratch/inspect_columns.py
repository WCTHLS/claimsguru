import pymssql

server = "cg-preprod-sql-vvekhbufuteq2.database.windows.net"
user = "claimsgurupreprodadmin"
password = "ClaimsGuruPreProdPass!2026"
database = "claimsguru"

conn = pymssql.connect(server=server, user=user, password=password, database=database, port=1433)
cursor = conn.cursor()

print("=== STAFF_PROFILES COLUMNS ===")
cursor.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'staff_profiles'")
for row in cursor.fetchall():
    print(f"  {row[0]} ({row[1]})")

print("\n=== USER_ROLES COLUMNS ===")
cursor.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'user_roles'")
for row in cursor.fetchall():
    print(f"  {row[0]} ({row[1]})")

print("\n=== ROLES COLUMNS ===")
cursor.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'roles'")
for row in cursor.fetchall():
    print(f"  {row[0]} ({row[1]})")

print("\n=== ORGANIZATIONS COLUMNS ===")
cursor.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'organizations'")
for row in cursor.fetchall():
    print(f"  {row[0]} ({row[1]})")

conn.close()
