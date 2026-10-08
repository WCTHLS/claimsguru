from sqlalchemy import create_engine, text

conn_str = 'mssql+pymssql://claimsgurupreprodadmin:ClaimsGuruPreProdPass!2026@cg-preprod-sql-vvekhbufuteq2.database.windows.net:1433/claimsguru'
e = create_engine(conn_str)
with e.connect() as c:
    ur_cols = [r[0] for r in c.execute(text("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='user_roles'")).fetchall()]
    sp_cols = [r[0] for r in c.execute(text("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='staff_profiles'")).fetchall()]
    print('user_roles columns:', ur_cols)
    print('staff_profiles columns:', sp_cols)
