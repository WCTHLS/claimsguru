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

test_pids = [
    'Swagath Reddy',
    'swagathreddykasula@gmail.com',
    'swagathreddy00@gmail.com',
    '89557B9F-A651-4200-953F-07831285405F',
    '576B07C3-E6D5-4316-B59C-87CE76DEBC19',
    'User',
    'user',
    'anonymous',
    'patient',
    'Mr. Margarito178 Stokes453',
    'Tomoko463 Dickens475'
]

for pid in test_pids:
    token = create_jwt({'sub': 'admin', 'user_id': 'admin', 'email': 'admin@claimsguru.com', 'role': 'submitter'})
    req = urllib.request.Request(
        f"{base_url}/claims?patient_id={urllib.parse.quote(pid)}&limit=50",
        headers={'Authorization': f'Bearer {token}'}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            claims = data.get('claims', [])
            if claims:
                print(f"=== Found {len(claims)} claim(s) matching patient_id='{pid}' ===")
                for c in claims:
                    print(f"  ID: {c.get('id')} | patient_id in DB: {c.get('patient_id')} | name: {c.get('patient_name')}")
    except Exception as e:
        print(f"Error for '{pid}':", e)
