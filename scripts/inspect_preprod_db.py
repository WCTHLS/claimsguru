import os
import pymssql
from sqlalchemy import create_engine, text

# Pre-prod DB credentials
SERVER = "cg-preprod-sql-vvekhbufuteq2.database.windows.net"
DATABASE = "claimsguru"
USER = "claimsgurupreprodadmin"
PASSWORD = "ClaimsGuruPreProdPass!2026"

conn_str = f"mssql+pymssql://{USER}:{PASSWORD}@{SERVER}:1433/{DATABASE}"
print(f"Connecting to {SERVER}/{DATABASE}...")

engine = create_engine(conn_str)
with engine.connect() as conn:
    tables = conn.execute(text("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME")).fetchall()
    print("\nTables found:")
    for (t,) in tables:
        count = conn.execute(text(f"SELECT COUNT(*) FROM [{t}]")).scalar()
        print(f"  - {t}: {count} rows")
