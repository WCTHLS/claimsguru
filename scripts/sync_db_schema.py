from sqlalchemy import create_engine, text

conn_str = 'mssql+pymssql://claimsgurupreprodadmin:ClaimsGuruPreProdPass!2026@cg-preprod-sql-vvekhbufuteq2.database.windows.net:1433/claimsguru'
e = create_engine(conn_str)

with e.begin() as conn:
    print("Checking and applying missing columns to Azure SQL database...")

    # 1. claims table: org_id, insurance_company
    cols_claims = [r[0] for r in conn.execute(text("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='claims'")).fetchall()]
    print(f"Current claims columns: {cols_claims}")

    if "org_id" not in cols_claims:
        print("Adding org_id to claims table...")
        conn.execute(text("ALTER TABLE claims ADD org_id UNIQUEIDENTIFIER NULL REFERENCES organizations(id) ON DELETE SET NULL"))
        print("[OK] Added org_id to claims")

    if "insurance_company" not in cols_claims:
        print("Adding insurance_company to claims table...")
        conn.execute(text("ALTER TABLE claims ADD insurance_company NVARCHAR(255) NULL"))
        print("[OK] Added insurance_company to claims")

    # 2. Check all tables in schema
    tables = [r[0] for r in conn.execute(text("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME")).fetchall()]
    print(f"\nAll Tables in DB: {tables}")

print("\n[SUCCESS] Database schema synchronized with SQLAlchemy models!")
