import urllib.request
import json

BASE_URL = "https://cg-preprod-cin-ingress.purpleocean-4441f644.centralindia.azurecontainerapps.io"

def test_tpa_entra_sync():
    payload = {
        "email": "swagathreddy00@gmail.com",
        "name": "Swagath Reddy",
        "requested_role": "tpa",
        "company_name": "Star Health",
        "organization": "Star Health",
        "external_subject_id": "entra-swagath-starhealth-test"
    }
    url = f"{BASE_URL}/auth/sync-entra-user"
    print(f"Testing POST {url} with TPA payload...")
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    
    with urllib.request.urlopen(req, timeout=30) as resp:
        status_code = resp.getcode()
        body = resp.read().decode("utf-8")
        print(f"Status Code: {status_code}")
        print(f"Response Body: {body}")
        res_json = json.loads(body)
        print("SUCCESS: TPA Profile synchronized correctly:")
        print(json.dumps(res_json, indent=2))

if __name__ == "__main__":
    test_tpa_entra_sync()
