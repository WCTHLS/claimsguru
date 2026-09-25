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

target_email = 'swagathreddy.k@waferwire.com'
token = create_jwt({'sub': 'admin', 'user_id': 'admin', 'email': 'admin@claimsguru.com', 'role': 'admin'})

# 1. Search claims matching swagathreddy.k@waferwire.com
req = urllib.request.Request(
    f"{base_url}/claims?patient_id={urllib.parse.quote(target_email)}&limit=50",
    headers={'Authorization': f'Bearer {token}'}
)

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        claims = data.get('claims', [])
        print(f"=== CLAIMS FOR {target_email} ===")
        print(f"Total claims found: {len(claims)}")
        for idx, c in enumerate(claims, 1):
            print(f"  {idx}. ID: {c.get('id')} | patient_id in DB: {c.get('patient_id')} | policy_id: {c.get('policy_id')} | patient_name: {c.get('patient_name')} | status: {c.get('status')}")
            docs = c.get('documents', [])
            for d in docs:
                print(f"      - Doc ID: {d.get('id')} | file: {d.get('file_name')} | type: {d.get('file_type')}")
except Exception as e:
    print('Error:', e)
