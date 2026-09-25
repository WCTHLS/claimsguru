import urllib.request
import json
import base64
import hmac
import hashlib

base_url = 'https://cg-preprod-cin-ingress.purpleocean-4441f644.centralindia.azurecontainerapps.io'
JWT_SECRET = 'claimsguru-enterprise-secure-jwt-secret-key-2026'

def create_jwt(payload):
    header = {'alg': 'HS256', 'typ': 'JWT'}
    h_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).rstrip(b'=').decode()
    p_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b'=').decode()
    msg = f"{h_b64}.{p_b64}".encode()
    sig = hmac.new(JWT_SECRET.encode(), msg, hashlib.sha256).digest()
    s_b64 = base64.urlsafe_b64encode(sig).rstrip(b'=').decode()
    return f"{h_b64}.{p_b64}.{s_b64}"

uid_kasula = '89557B9F-A651-4200-953F-07831285405F'
email_kasula = 'swagathreddykasula@gmail.com'

token_kasula = create_jwt({'sub': uid_kasula, 'user_id': uid_kasula, 'email': email_kasula, 'role': 'submitter', 'patient_id': uid_kasula})

# Upload a test claim for Kasula
boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
lines = [
    f'--{boundary}',
    'Content-Disposition: form-data; name="patient_id"',
    '',
    uid_kasula,
    f'--{boundary}',
    'Content-Disposition: form-data; name="email"',
    '',
    email_kasula,
    f'--{boundary}',
    'Content-Disposition: form-data; name="files"; filename="kasula_test_doc.pdf"',
    'Content-Type: application/pdf',
    '',
    '%PDF-1.4 test document content',
    f'--{boundary}--',
    ''
]
body = '\r\n'.join(lines).encode('utf-8')

upload_req = urllib.request.Request(
    f'{base_url}/claims',
    data=body,
    headers={
        'Authorization': f'Bearer {token_kasula}',
        'Content-Type': f'multipart/form-data; boundary={boundary}',
        'X-Patient-Id': uid_kasula
    },
    method='POST'
)

with urllib.request.urlopen(upload_req) as uresp:
    res = json.loads(uresp.read().decode())
    print('UPLOAD RESULT for swagathreddykasula@gmail.com:', res.get('claim_id'), res.get('status'))

# 1. Verify Kasula's claims
req_k = urllib.request.Request(f'{base_url}/claims?limit=50', headers={'Authorization': f'Bearer {token_kasula}', 'X-Patient-Id': uid_kasula})
with urllib.request.urlopen(req_k) as rk:
    data_k = json.loads(rk.read().decode())
    claims_k = data_k.get('claims', [])
    print(f'swagathreddykasula@gmail.com claims count: {len(claims_k)}')
    for c in claims_k:
        print(f"  - Claim ID: {c.get('id')} | patient_id: {c.get('patient_id')}")

# 2. Verify swagathreddy00's claims
uid_00 = '576B07C3-E6D5-4316-B59C-87CE76DEBC19'
email_00 = 'swagathreddy00@gmail.com'
token_00 = create_jwt({'sub': uid_00, 'user_id': uid_00, 'email': email_00, 'role': 'submitter', 'patient_id': uid_00})
req_00 = urllib.request.Request(f'{base_url}/claims?limit=50', headers={'Authorization': f'Bearer {token_00}', 'X-Patient-Id': uid_00})
with urllib.request.urlopen(req_00) as r0:
    data_00 = json.loads(r0.read().decode())
    claims_00 = data_00.get('claims', [])
    print(f'swagathreddy00@gmail.com claims count: {len(claims_00)}')
    for c in claims_00:
        print(f"  - Claim ID: {c.get('id')} | patient_id: {c.get('patient_id')}")
