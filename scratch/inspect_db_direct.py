import pg8000.native
import ssl

ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

con = pg8000.native.Connection(
    user="claimsgurupreprodadmin",
    password="ClaimsGuruPreProdPass!2026",
    host="cg-preprod-cin-db.postgres.database.azure.com",
    port=5432,
    database="claimsguru_preprod",
    ssl_context=ssl_context
)

print("=== 1. ALL USERS IN DATABASE ===")
users = con.run("SELECT id, email, full_name, role, external_subject_id, created_at FROM users")
for u in users:
    print(f"User ID: {u[0]} | Email: {u[1]} | Name: {u[2]} | Role: {u[3]} | ExtSub: {u[4]} | Created: {u[5]}")

print("\n=== 2. SEARCH FOR WAFERWIRE USER ===")
wf_users = con.run("SELECT id, email, full_name, role, external_subject_id FROM users WHERE email ILIKE '%waferwire%' OR full_name ILIKE '%waferwire%'")
for u in wf_users:
    print(f"WaferWire User -> ID: {u[0]} | Email: {u[1]} | Name: {u[2]} | Role: {u[3]} | ExtSub: {u[4]}")

print("\n=== 3. ALL CLAIMS IN DATABASE (LAST 30) ===")
claims = con.run("SELECT id, patient_id, policy_id, status, created_at FROM claims ORDER BY created_at DESC LIMIT 30")
for c in claims:
    print(f"Claim ID: {c[0]} | patient_id: {c[1]} | policy_id: {c[2]} | status: {c[3]} | Created: {c[4]}")

print("\n=== 4. ANY CLAIMS CONTAINING 'waferwire' OR MATCHING WAFERWIRE USER ===")
if wf_users:
    wf_id = str(wf_users[0][0])
    wf_email = str(wf_users[0][1])
    wf_claims = con.run(f"SELECT id, patient_id, policy_id, status FROM claims WHERE patient_id = '{wf_id}' OR patient_id = '{wf_email}' OR patient_id ILIKE '%waferwire%'")
    print(f"Found {len(wf_claims)} claims for waferwire user:")
    for wc in wf_claims:
        print(f"  {wc}")
else:
    print("No waferwire user in users table.")

con.close()
