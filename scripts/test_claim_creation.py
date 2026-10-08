import requests

INGRESS_URL = "https://cg-preprod-cin-ingress.purpleocean-4441f644.centralindia.azurecontainerapps.io"
USER_EMAIL = "swagathreddykasula@gmail.com"
PATIENT_ID = "ed686f14-ddc3-4b2c-9c3b-420260db0ae1"

print(f"Testing claim submission on {INGRESS_URL}...")

# Create a small dummy PDF in memory
pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF"

files = [
    ("files", ("test_hospital_bill.pdf", pdf_content, "application/pdf")),
]

data = {
    "patient_name": "Swagath Reddy Kasula",
    "patient_id": PATIENT_ID,
    "user_email": USER_EMAIL,
}

headers = {
    "x-user-email": USER_EMAIL,
    "x-patient-id": PATIENT_ID,
    "x-user-id": PATIENT_ID,
}

try:
    r = requests.post(f"{INGRESS_URL}/claims", files=files, data=data, headers=headers)
    print(f"POST /claims -> Status: {r.status_code}")
    print(f"Response: {r.text}")
    if r.ok:
        res_data = r.json()
        claim_id = res_data.get("claim_id")
        print(f"\nCreated claim ID: {claim_id}")

        # Check claim status
        sr = requests.get(f"{INGRESS_URL}/claims/{claim_id}/status", headers=headers)
        print(f"GET /claims/{claim_id}/status -> {sr.status_code}: {sr.text}")
except Exception as e:
    print(f"Error during claim submission: {e}")
