import pyodbc

conn_str = 'DRIVER={SQL Server};SERVER=cg-preprod-sql-vvekhbufuteq2.database.windows.net,1433;DATABASE=claimsguru;UID=claimsgurupreprodadmin;PWD=ClaimsGuruPreProdPass!2026;'
conn = pyodbc.connect(conn_str)
cursor = conn.cursor()

cursor.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'claim_field_feedback'")
cols = cursor.fetchall()
print('=== claim_field_feedback COLUMNS ===')
for c in cols:
    print(' ', c[0], c[1])

if not cols:
    print('Table claim_field_feedback does not exist!')

cursor.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'parsed_fields'")
cols_pf = cursor.fetchall()
print('\n=== parsed_fields COLUMNS ===')
for c in cols_pf:
    print(' ', c[0], c[1])

conn.close()
