import re
import time
import requests

with open("scripts/run_batch_38_claims.py", "r", encoding="utf-8") as f:
    content = f.read()

m = re.search(r'TOKEN = """(.*?)"""', content, re.DOTALL)
token = m.group(1).strip()

PATIENT_ID = "60624570-D81C-4B09-A361-64527F86AFF2"
USER_EMAIL = "swagathreddykasula@gmail.com"

headers = {
    "Authorization": f"Bearer {token}",
    "x-user-email": USER_EMAIL,
    "x-patient-id": PATIENT_ID,
    "x-user-id": PATIENT_ID,
}

base_url = "https://cg-preprod-cin-ingress.purpleocean-4441f644.centralindia.azurecontainerapps.io"

print(f"=== Safely querying claims ONLY for test patient {PATIENT_ID} ===")
resp = requests.get(
    f"{base_url}/claims",
    headers=headers,
    params={"patient_id": PATIENT_ID, "limit": 100},
    timeout=20,
)
resp.raise_for_status()
claims = resp.json().get("claims", [])
print(f"Found {len(claims)} claims belonging to test patient {PATIENT_ID}.")

deleted_count = 0
for idx, c in enumerate(claims, 1):
    cid = c["id"]
    print(f"[{idx}/{len(claims)}] Deleting claim {cid} ({c.get('status')})...")
    del_resp = requests.delete(
        f"{base_url}/claims/{cid}",
        headers=headers,
        params={"patient_id": PATIENT_ID},
        timeout=20,
    )
    if del_resp.status_code in (200, 204):
        deleted_count += 1
    else:
        print(f"  [WARNING] Failed to delete {cid}: {del_resp.status_code} {del_resp.text}")
    time.sleep(0.2)

print("\n" + "=" * 50)
print(f"Successfully deleted {deleted_count} claims for patient {PATIENT_ID}.")
print("=" * 50)
