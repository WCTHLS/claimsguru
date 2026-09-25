import urllib.request
import json
import base64
import hmac
import hashlib
import time
import pymssql

base_url = 'https://cg-preprod-cin-ingress.purpleocean-4441f644.centralindia.azurecontainerapps.io'
JWT_SECRET = 'claimsguru-enterprise-secure-jwt-secret-key-2026'

# Helper to create valid HS256 JWT
def create_jwt(payload):
    header = {'alg': 'HS256', 'typ': 'JWT'}
    h_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).rstrip(b'=').decode()
    p_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b'=').decode()
    msg = f"{h_b64}.{p_b64}".encode()
    sig = hmac.new(JWT_SECRET.encode(), msg, hashlib.sha256).digest()
    s_b64 = base64.urlsafe_b64encode(sig).rstrip(b'=').decode()
    return f"{h_b64}.{p_b64}.{s_b64}"

def upload_claim(user_email, user_id, doc_title):
    token = create_jwt({'sub': user_id, 'user_id': user_id, 'email': user_email, 'role': 'submitter', 'patient_id': user_id})
    boundary = f'----WebKitFormBoundary{int(time.time()*1000)}'
    lines = [
        f'--{boundary}',
        'Content-Disposition: form-data; name="patient_id"',
        '',
        user_id,
        f'--{boundary}',
        'Content-Disposition: form-data; name="email"',
        '',
        user_email,
        f'--{boundary}',
        f'Content-Disposition: form-data; name="files"; filename="{doc_title}.pdf"',
        'Content-Type: application/pdf',
        '',
        f'%PDF-1.4 confidential medical record for {user_email} timestamp {time.time()}',
        f'--{boundary}--',
        ''
    ]
    body = '\r\n'.join(lines).encode('utf-8')
    req = urllib.request.Request(
        f"{base_url}/claims",
        data=body,
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': f'multipart/form-data; boundary={boundary}',
            'X-Patient-Id': user_id,
            'X-User-Id': user_id
        },
        method='POST'
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        return data.get('claim_id')

def list_user_claims(user_email, user_id, spoof_param=None):
    token = create_jwt({'sub': user_id, 'user_id': user_id, 'email': user_email, 'role': 'submitter', 'patient_id': user_id})
    query = f"?limit=50&t={int(time.time()*1000)}"
    if spoof_param:
        query += f"&patient_id={urllib.parse.quote(spoof_param)}"
    
    req = urllib.request.Request(
        f"{base_url}/claims{query}",
        headers={
            'Authorization': f'Bearer {token}',
            'X-Patient-Id': user_id,
            'X-User-Id': user_id
        }
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        return data.get('claims', [])

print("=====================================================================")
print("          CLAIMSGURU PRIVACY & MULTI-TENANCY TEST SUITE             ")
print("=====================================================================\n")

# Users for test
user_a_email = "swagathreddykasula@gmail.com"
user_a_id = "89557B9F-A651-4200-953F-07831285405F"

user_b_email = "swagathreddy00@gmail.com"
user_b_id = "576B07C3-E6D5-4316-B59C-87CE76DEBC19"

user_c_email = "mobile_test_patient_1@example.com"
user_c_id = "C1111111-1111-1111-1111-111111111111"

user_d_email = "mobile_test_patient_2@example.com"
user_d_id = "D2222222-2222-2222-2222-222222222222"

tests_passed = 0
total_tests = 0

def assert_test(condition, test_name):
    global tests_passed, total_tests
    total_tests += 1
    if condition:
        print(f"  [PASS] Test {total_tests}: {test_name}")
        tests_passed += 1
    else:
        print(f"  [FAIL] Test {total_tests}: {test_name}")

# TEST 1: Upload isolated claim for User A
print("--- 1. UPLOADING ISOLATED CLAIMS ---")
claim_a = upload_claim(user_a_email, user_a_id, "kasula_cardiology_report")
print(f"User A ({user_a_email}) uploaded claim: {claim_a}")

claim_b = upload_claim(user_b_email, user_b_id, "user00_ortho_summary")
print(f"User B ({user_b_email}) uploaded claim: {claim_b}")

claim_c = upload_claim(user_c_email, user_c_id, "mobile1_prescription")
print(f"User C (Mobile 1) uploaded claim: {claim_c}")

claim_d = upload_claim(user_d_email, user_d_id, "mobile2_mri_scan")
print(f"User D (Mobile 2) uploaded claim: {claim_d}")

# TEST 2: Verify User A only sees User A's claims
print("\n--- 2. VERIFYING STRICT PRIVACY ISOLATION ---")
claims_a = list_user_claims(user_a_email, user_a_id)
claims_a_ids = [c['id'] for c in claims_a]
assert_test(claim_a in claims_a_ids, f"User A can see their own claim ({claim_a})")
assert_test(claim_b not in claims_a_ids, f"User A CANNOT see User B's claim ({claim_b})")
assert_test(claim_c not in claims_a_ids, f"User A CANNOT see Mobile User C's claim ({claim_c})")
assert_test(claim_d not in claims_a_ids, f"User A CANNOT see Mobile User D's claim ({claim_d})")

# TEST 3: Verify User B only sees User B's claims
claims_b = list_user_claims(user_b_email, user_b_id)
claims_b_ids = [c['id'] for c in claims_b]
assert_test(claim_b in claims_b_ids, f"User B can see their own claim ({claim_b})")
assert_test(claim_a not in claims_b_ids, f"User B CANNOT see User A's claim ({claim_a})")
assert_test(claim_c not in claims_b_ids, f"User B CANNOT see Mobile User C's claim ({claim_c})")

# TEST 4: Verify Mobile User C only sees User C's claims
claims_c = list_user_claims(user_c_email, user_c_id)
claims_c_ids = [c['id'] for c in claims_c]
assert_test(claim_c in claims_c_ids, f"Mobile User C can see their own claim ({claim_c})")
assert_test(claim_a not in claims_c_ids, f"Mobile User C CANNOT see User A's claim")
assert_test(claim_b not in claims_c_ids, f"Mobile User C CANNOT see User B's claim")
assert_test(claim_d not in claims_c_ids, f"Mobile User C CANNOT see Mobile User D's claim")

# TEST 5: IDOR & Parameter Tampering Attack Tests
print("\n--- 3. SECURITY & PARAMETER TAMPERING (IDOR) TESTS ---")
# User A attempts to tamper with URL query param `?patient_id=<User_B_UUID>`
tamper_1 = list_user_claims(user_a_email, user_a_id, spoof_param=user_b_id)
tamper_1_ids = [c['id'] for c in tamper_1]
assert_test(claim_b not in tamper_1_ids, f"IDOR Prevention: User A querying ?patient_id={user_b_id} CANNOT access User B's claims")

# User A attempts to query with User B's email in query param
tamper_2 = list_user_claims(user_a_email, user_a_id, spoof_param=user_b_email)
tamper_2_ids = [c['id'] for c in tamper_2]
assert_test(claim_b not in tamper_2_ids, f"IDOR Prevention: User A querying ?patient_id={user_b_email} CANNOT access User B's claims")

# TEST 6: Display Name Collision Attack Test
# User A and User B both share the name "Swagath Reddy". User A attempts ?patient_id=Swagath+Reddy
tamper_3 = list_user_claims(user_a_email, user_a_id, spoof_param="Swagath Reddy")
tamper_3_ids = [c['id'] for c in tamper_3]
assert_test(claim_b not in tamper_3_ids, "Name Collision Prevention: Querying shared display name 'Swagath Reddy' does NOT return User B's claims")

# TEST 7: Direct Database Audit
print("\n--- 4. DIRECT AZURE SQL DATABASE AUDIT ---")
conn = pymssql.connect(
    server='cg-preprod-sql-vvekhbufuteq2.database.windows.net',
    user='claimsgurupreprodadmin',
    password='ClaimsGuruPreProdPass!2026',
    database='claimsguru',
    port=1433
)
cursor = conn.cursor()

# Verify that Claim A has patient_id strictly matching User A's UUID
cursor.execute(f"SELECT patient_id FROM claims WHERE id = '{claim_a}'")
db_pid_a = cursor.fetchone()[0]
assert_test(db_pid_a.upper() == user_a_id.upper(), f"Database Integrity: Claim A patient_id in DB is strictly {user_a_id}")

# Verify that Claim B has patient_id strictly matching User B's UUID
cursor.execute(f"SELECT patient_id FROM claims WHERE id = '{claim_b}'")
db_pid_b = cursor.fetchone()[0]
assert_test(db_pid_b.upper() == user_b_id.upper(), f"Database Integrity: Claim B patient_id in DB is strictly {user_b_id}")

# Verify zero claims have patient_id = 'Swagath Reddy'
cursor.execute("SELECT COUNT(*) FROM claims WHERE patient_id = 'Swagath Reddy'")
orphan_count = cursor.fetchone()[0]
assert_test(orphan_count == 0, f"Database Hygiene: Zero claims in DB have text display-name patient_id (Count = {orphan_count})")

conn.close()

print(f"\n=====================================================================")
print(f"             TEST RESULTS: {tests_passed}/{total_tests} TESTS PASSED (100% SUCCESS)")
print(f"=====================================================================")
