import sys
import requests

INGRESS_URL = "http://localhost:8001/claims"

def delete_all_claims():
    print(f"Sending DELETE request to {INGRESS_URL}...")
    try:
        response = requests.delete(INGRESS_URL)
        if response.status_code == 204:
            print("[SUCCESS] All claims, documents, and associated storage files have been deleted successfully!")
        else:
            print(f"[FAILED] Status code: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"[ERROR] Could not connect to API: {e}")

if __name__ == "__main__":
    delete_all_claims()
