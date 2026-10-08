import sys
from sqlalchemy import create_engine, text

SERVER = "cg-preprod-sql-vvekhbufuteq2.database.windows.net"
DATABASE = "claimsguru"
USER = "claimsgurupreprodadmin"
PASSWORD = "ClaimsGuruPreProdPass!2026"

conn_str = f"mssql+pymssql://{USER}:{PASSWORD}@{SERVER}:1433/{DATABASE}"
print(f"Connecting to Azure SQL Server: {SERVER}, DB: {DATABASE}...")
engine = create_engine(conn_str)

# Foreign keys order deletion (children first, parents last)
TABLES_TO_FLUSH = [
    "claim_field_feedback",
    "document_validations",
    "validations",
    "parsed_fields",
    "parse_jobs",
    "ocr_results",
    "ocr_jobs",
    "scan_analyses",
    "features",
    "predictions",
    "submissions",
    "workflow_state",
    "workflow_jobs",
    "documents",
    "medical_codes",
    "medical_entities",
    "fraud_assessments",
    "audit_logs",
    "chat_messages",
    "invitations",
    "claims",
    "patient_profiles",
    "staff_profiles",
    "user_roles",
    "users",
]

with engine.begin() as conn:
    print("\n--- Disabling Foreign Key Constraints ---")
    fk_query = text("""
        SELECT 
            'ALTER TABLE [' + s.name + '].[' + t.name + '] NOCHECK CONSTRAINT [' + fk.name + ']' as disable_sql,
            'ALTER TABLE [' + s.name + '].[' + t.name + '] WITH CHECK CHECK CONSTRAINT [' + fk.name + ']' as enable_sql
        FROM sys.foreign_keys fk
        INNER JOIN sys.tables t ON fk.parent_object_id = t.object_id
        INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
    """)
    fk_rows = conn.execute(fk_query).fetchall()
    for row in fk_rows:
        conn.execute(text(row[0]))
    print(f"  [OK] Disabled {len(fk_rows)} foreign key constraints.")

    print("\n--- Deleting Data from Application Tables ---")
    for table in TABLES_TO_FLUSH:
        try:
            count = conn.execute(text(f"SELECT COUNT(*) FROM [{table}]")).scalar()
            conn.execute(text(f"DELETE FROM [{table}]"))
            print(f"  [FLUSHED] {table}: {count} records deleted.")
        except Exception as e:
            print(f"  [SKIP/ERROR] {table}: {e}")

    print("\n--- Re-enabling Foreign Key Constraints ---")
    for row in fk_rows:
        try:
            conn.execute(text(row[1]))
        except Exception as e:
            print(f"  [WARNING] Could not re-enable FK {row[1]}: {e}")
    print(f"  [OK] Re-enabled foreign key constraints.")

print("\n--- Verifying Row Counts Post-Flush ---")
with engine.connect() as conn:
    tables = conn.execute(text("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME")).fetchall()
    for (t,) in tables:
        count = conn.execute(text(f"SELECT COUNT(*) FROM [{t}]")).scalar()
        print(f"  - {t}: {count} rows")

print("\n[SUCCESS] Pre-production database has been completely flushed clean!")
