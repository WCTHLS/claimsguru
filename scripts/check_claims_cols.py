from sqlalchemy import create_engine, text

conn_str = 'mssql+pymssql://claimsgurupreprodadmin:ClaimsGuruPreProdPass!2026@cg-preprod-sql-vvekhbufuteq2.database.windows.net:1433/claimsguru'
e = create_engine(conn_str)
with e.connect() as c:
    cols = c.execute(text("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='claims'")).fetchall()
    print("Columns in claims table:")
    for col in cols:
        print(f"  {col[0]} ({col[1]})")
