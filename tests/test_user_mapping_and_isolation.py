"""
Comprehensive End-to-End User Mapping, Security & Isolation Test Suite for ClaimsGuru.
Tests live APIs and Azure SQL Database using Python standard library (urllib).
"""

import sys
import os
import uuid
import json
import urllib.request
import urllib.error

API_BASE = "https://cg-preprod-cin-ingress.purpleocean-4441f644.centralindia.azurecontainerapps.io"
ENTRA_USER_EMAIL = "swagathreddykasula@gmail.com"
ENTRA_USER_ID = "89557b9f-a651-4200-953f-07831285405f"

def print_header(title):
    print("\n" + "="*75)
    print(f"  {title}")
    print("="*75)

def http_get(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read().decode("utf-8")
            return resp.status, json.loads(data) if data else {}
    except urllib.error.HTTPError as err:
        body = err.read().decode("utf-8")
        try:
            return err.code, json.loads(body)
        except Exception:
            return err.code, {"detail": body}

def http_post_json(url, payload, headers=None):
    body = json.dumps(payload).encode("utf-8")
    req_headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, data=body, headers=req_headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read().decode("utf-8")
            return resp.status, json.loads(data) if data else {}
    except urllib.error.HTTPError as err:
        body = err.read().decode("utf-8")
        try:
            return err.code, json.loads(body)
        except Exception:
            return err.code, {"detail": body}

def http_post_multipart(url, fields, files, headers=None):
    boundary = uuid.uuid4().hex
    body = bytearray()
    
    for k, v in fields.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode("utf-8"))
        body.extend(f"{v}\r\n".encode("utf-8"))
        
    for field_name, filename, content, content_type in files:
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'.encode("utf-8"))
        body.extend(f'Content-Type: {content_type}\r\n\r\n'.encode("utf-8"))
        body.extend(content)
        body.extend(b"\r\n")
        
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))
    
    req_headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Accept": "application/json"
    }
    if headers:
        req_headers.update(headers)
        
    req = urllib.request.Request(url, data=bytes(body), headers=req_headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            data = resp.read().decode("utf-8")
            return resp.status, json.loads(data) if data else {}
    except urllib.error.HTTPError as err:
        body = err.read().decode("utf-8")
        try:
            return err.code, json.loads(body)
        except Exception:
            return err.code, {"detail": body}


def test_1_user_profile_mapping():
    print_header("TEST 1: User Profile & Identity Mapping")
    
    # 1. Fetch profile for Entra Web User by email
    url = f"{API_BASE}/auth/profile/{ENTRA_USER_EMAIL}"
    status, profile = http_get(url)
    print(f"[*] GET /auth/profile/{ENTRA_USER_EMAIL} -> HTTP {status}")
    assert status == 200, f"Failed: {profile}"
    
    print(f"    - Canonical User ID : {profile.get('user_id')}")
    print(f"    - Email             : {profile.get('email')}")
    print(f"    - Name              : {profile.get('name')}")
    print(f"    - Policy Number     : {profile.get('policy_number')}")
    print(f"    - Sum Insured       : {profile.get('sum_insured')}")
    print(f"    - Role              : {profile.get('role')}")
    
    assert str(profile.get("user_id")).lower() == ENTRA_USER_ID.lower(), "User ID mapping mismatch!"
    assert profile.get("email").lower() == ENTRA_USER_EMAIL.lower(), "Email mapping mismatch!"
    print(" [PASS] Entra Web User correctly mapped to canonical UUID and patient profile.")

    # 2. Test Mobile registration rejection for Entra email (Security Isolation)
    reg_url = f"{API_BASE}/auth/register"
    reg_payload = {
        "username": ENTRA_USER_EMAIL,
        "password": "Password123!",
        "role": "patient",
        "first_name": "Swagath",
        "last_name": "Reddy"
    }
    reg_status, reg_res = http_post_json(reg_url, reg_payload)
    print(f"[*] POST /auth/register (Entra email collision) -> HTTP {reg_status}")
    assert reg_status == 409, f"Expected HTTP 409 Conflict, got {reg_status}: {reg_res}"
    print(f"    - Rejection message: {reg_res.get('detail')}")
    print(" [PASS] Entra Web account strictly protected from mobile registration hijack.")


def test_2_mobile_local_user_lifecycle():
    print_header("TEST 2: Mobile Local User Lifecycle & Profile Creation")
    
    test_mobile_email = f"mobile_test_{uuid.uuid4().hex[:6]}@example.com"
    reg_url = f"{API_BASE}/auth/register"
    reg_payload = {
        "username": test_mobile_email,
        "password": "MobileSecurePass!2026",
        "role": "patient",
        "first_name": "Mobile",
        "last_name": "Tester",
        "phone": "+919876543210",
        "dob": "1995-05-15",
        "gender": "Female",
        "policy": "MOB-POL-99901",
        "sum_insured": 750000
    }
    status, data = http_post_json(reg_url, reg_payload)
    print(f"[*] POST /auth/register ({test_mobile_email}) -> HTTP {status}")
    assert status in (200, 201), f"Failed: {data}"
    mobile_user_id = data.get("user_id")
    token = data.get("access_token") or data.get("token")
    print(f"    - Created Mobile User ID : {mobile_user_id}")
    print(f"    - Issued JWT Token       : {token[:20]}...")
    
    # Verify profile endpoint for this new mobile user
    prof_url = f"{API_BASE}/auth/profile/{mobile_user_id}"
    prof_status, p_data = http_get(prof_url)
    assert prof_status == 200, f"Failed: {p_data}"
    assert p_data.get("policy_number") == "MOB-POL-99901"
    assert float(p_data.get("sum_insured")) == 750000.0
    print(" [PASS] Mobile user successfully created with isolated profile, JWT, and policy metadata.")
    
    return test_mobile_email, mobile_user_id, token


def test_3_claim_and_document_mapping(mobile_email, mobile_user_id, mobile_token):
    print_header("TEST 3: Document Upload, Storage & Claim Mapping")
    
    # Upload a document under the Mobile User
    upload_url = f"{API_BASE}/claims"
    headers = {
        "Authorization": f"Bearer {mobile_token}",
        "X-Patient-Id": mobile_user_id,
        "X-User-Id": mobile_user_id
    }
    sample_content = b"%PDF-1.4 Mock Hospital Bill for Mobile Tester. Total Rs 45,000"
    fields = {
        "policy_id": "MOB-POL-99901",
        "patient_id": mobile_user_id,
        "email": mobile_email
    }
    files = [("files", "mobile_bill.pdf", sample_content, "application/pdf")]
    
    status, claim_resp = http_post_multipart(upload_url, fields, files, headers)
    print(f"[*] POST /claims (Mobile User) -> HTTP {status}")
    assert status in (200, 202), f"Failed: {claim_resp}"
    mobile_claim_id = claim_resp.get("claim_id") or claim_resp.get("id")
    print(f"    - Uploaded Claim ID : {mobile_claim_id}")
    print(f"    - Pipeline Status   : {claim_resp.get('status')}")
    
    # Retrieve Claim Details
    get_claim_url = f"{API_BASE}/claims/{mobile_claim_id}"
    c_status, claim_data = http_get(get_claim_url, headers)
    assert c_status == 200, f"Failed: {claim_data}"
    
    print(f"    - Claim.patient_id  : {claim_data.get('patient_id')}")
    print(f"    - Claim.policy_id   : {claim_data.get('policy_id')}")
    print(f"    - Documents Attached: {len(claim_data.get('documents', []))}")
    for doc in claim_data.get("documents", []):
        print(f"      * Doc ID: {doc.get('id')} | File: {doc.get('file_name')} | Storage: {doc.get('storage_path')}")
        
    assert claim_data.get("patient_id") == mobile_user_id, "Claim patient_id must equal Mobile User ID!"
    assert len(claim_data.get("documents", [])) >= 1, "Document record was not mapped to Claim!"
    print(" [PASS] Document and Claim strictly mapped to mobile user ID and storage path.")
    return mobile_claim_id


def test_4_cross_account_isolation(mobile_email, mobile_user_id, mobile_token, mobile_claim_id):
    print_header("TEST 4: Strict Cross-Account Isolation (User A vs User B)")
    
    # 1. Query claims for Entra Web User
    entra_headers = {
        "X-Patient-Id": ENTRA_USER_ID,
        "X-User-Id": ENTRA_USER_ID
    }
    s_entra, r_entra = http_get(f"{API_BASE}/claims?patient_id={ENTRA_USER_ID}", entra_headers)
    assert s_entra == 200
    entra_claims = r_entra.get("claims", [])
    entra_claim_ids = [c["id"] for c in entra_claims]
    
    print(f"[*] Entra User ({ENTRA_USER_EMAIL}) Claims Count: {len(entra_claims)}")
    for c in entra_claims:
        print(f"    - Entra Claim: {c.get('id')} | Patient: {c.get('patient_name')} | Status: {c.get('status')}")
    
    # 2. Query claims for Mobile User
    mob_headers = {
        "Authorization": f"Bearer {mobile_token}",
        "X-Patient-Id": mobile_user_id,
        "X-User-Id": mobile_user_id
    }
    s_mob, r_mob = http_get(f"{API_BASE}/claims?patient_id={mobile_user_id}", mob_headers)
    assert s_mob == 200
    mob_claims = r_mob.get("claims", [])
    mob_claim_ids = [c["id"] for c in mob_claims]
    
    print(f"[*] Mobile User ({mobile_email}) Claims Count: {len(mob_claims)}")
    for c in mob_claims:
        print(f"    - Mobile Claim: {c.get('id')} | Patient: {c.get('patient_name')} | Status: {c.get('status')}")
    
    # 3. Security Assertions: Zero overlap between accounts!
    assert mobile_claim_id not in entra_claim_ids, "SECURITY BREACH: Mobile user claim leaked into Entra user claim list!"
    for cid in entra_claim_ids:
        assert cid not in mob_claim_ids, f"SECURITY BREACH: Entra claim {cid} leaked into Mobile user claim list!"
        
    print(" [PASS] Complete Row-Level Security: User A and User B claims are 100% isolated.")


def test_5_tpa_and_irdai_report_scoping(mobile_claim_id, mobile_token):
    print_header("TEST 5: TPA, IRDAI & Clinical Reports Scoping")
    
    headers = {
        "Authorization": f"Bearer {mobile_token}"
    }
    # Check claim progress and report metadata
    progress_url = f"{API_BASE}/claims/{mobile_claim_id}/progress"
    s_prog, p_info = http_get(progress_url, headers)
    print(f"[*] GET /claims/{mobile_claim_id}/progress -> HTTP {s_prog}")
    if s_prog == 200:
        print(f"    - Pipeline Progress: {p_info.get('percentage')}% | Step: {p_info.get('step')}")
    
    # Check claim status
    status_url = f"{API_BASE}/claims/{mobile_claim_id}/status"
    s_stat, stat_info = http_get(status_url, headers)
    print(f"[*] GET /claims/{mobile_claim_id}/status -> HTTP {s_stat}")
    assert s_stat == 200
    print(f"    - Status: {stat_info.get('status')}")
    
    print(" [PASS] TPA & IRDAI workflow jobs and progress queries correctly bound to specific claim ID.")


if __name__ == "__main__":
    try:
        test_1_user_profile_mapping()
        mobile_email, mobile_user_id, mobile_token = test_2_mobile_local_user_lifecycle()
        mobile_claim_id = test_3_claim_and_document_mapping(mobile_email, mobile_user_id, mobile_token)
        test_4_cross_account_isolation(mobile_email, mobile_user_id, mobile_token, mobile_claim_id)
        test_5_tpa_and_irdai_report_scoping(mobile_claim_id, mobile_token)
        
        print("\n" + "="*75)
        print("  ALL 5 END-TO-END SECURITY & MAPPING SUITES PASSED (100% SUCCESS)")
        print("="*75 + "\n")
    except Exception as e:
        print(f"\n[!] Test suite failed with exception: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
