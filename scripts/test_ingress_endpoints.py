import requests

INGRESS_URL = "https://cg-preprod-cin-ingress.purpleocean-4441f644.centralindia.azurecontainerapps.io"

print("1. Health Check:")
try:
    r = requests.get(f"{INGRESS_URL}/health")
    print(f"Status: {r.status_code}, Body: {r.text}")
except Exception as e:
    print(f"Error: {e}")

print("\n2. GET /claims/active:")
try:
    r = requests.get(f"{INGRESS_URL}/claims/active")
    print(f"Status: {r.status_code}, Body: {r.text}")
except Exception as e:
    print(f"Error: {e}")

print("\n3. GET /ingress/claims/active:")
try:
    r = requests.get(f"{INGRESS_URL}/ingress/claims/active")
    print(f"Status: {r.status_code}, Body: {r.text}")
except Exception as e:
    print(f"Error: {e}")

print("\n4. POST /auth/sync-entra-user (Sync Entra User):")
try:
    payload = {
        "email": "swagathreddykasula@gmail.com",
        "name": "Swagath Reddy Kasula",
        "requested_role": "patient"
    }
    r = requests.post(f"{INGRESS_URL}/auth/sync-entra-user", json=payload)
    print(f"Status: {r.status_code}, Body: {r.text}")
except Exception as e:
    print(f"Error: {e}")

print("\n5. POST /claims (Create Claim):")
try:
    payload = {
        "user_email": "swagathreddykasula@gmail.com",
        "hospital_name": "Apollo Hospital"
    }
    r = requests.post(f"{INGRESS_URL}/claims", json=payload)
    print(f"Status: {r.status_code}, Body: {r.text}")
except Exception as e:
    print(f"Error: {e}")
