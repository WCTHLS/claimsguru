import pymssql

server = "cg-preprod-sql-vvekhbufuteq2.database.windows.net"
user = "claimsgurupreprodadmin"
password = "ClaimsGuruPreProdPass!2026"
database = "claimsguru"

conn = pymssql.connect(server=server, user=user, password=password, database=database, port=1433)
cursor = conn.cursor()

print("=== ALL TABLES IN DATABASE ===")
cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'")
tables = [t[0] for t in cursor.fetchall()]
for t in tables:
    print(f"Table: {t}")

print("\n=== DETAILED SCHEMA OF ALL RELEVANT TABLES ===")
for t in ['users', 'roles', 'user_roles', 'patient_profiles', 'claims', 'documents', 'organizations']:
    if t in tables:
        print(f"\n--- Columns for {t} ---")
        cursor.execute(f"SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{t}'")
        for col in cursor.fetchall():
            print(f"  {col[0]}: {col[1]} (length: {col[2]}, nullable: {col[3]})")

print("\n=== ENTRA ID USER MAPPINGS IN USERS TABLE ===")
cursor.execute("SELECT id, email, external_provider, external_subject_id, status, created_at FROM users WHERE external_provider = 'entra'")
for u in cursor.fetchall():
    print(f"User ID (UUID): {u[0]} | Email: {u[1]} | Provider: {u[2]} | Entra OID (external_subject_id): {u[3]}")

conn.close()
