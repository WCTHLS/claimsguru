import os
import sys
import uuid
import requests
from dotenv import load_dotenv

# Ensure project root is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

load_dotenv()

# We can query the storage directly using our backend wrapper
from libs.shared.storage import MinioStorage

print("Checking Storage Configuration...")
print("Azure Configured:", MinioStorage.is_azure_configured())

filename = "sas_test_claim.pdf"
temp_key = f"pending/{uuid.uuid4().hex}_{filename}"

# 1. Generate the pre-signed URL / SAS token
print(f"\n1. Generating upload token for: {temp_key}")
token_info = MinioStorage.generate_presigned_upload_url(temp_key)
print("Token Info:", token_info)

# 2. Upload dummy file bytes via direct PUT request to the pre-signed URL
dummy_data = b"%PDF-1.4 dummy pdf content for testing direct upload pipeline %%\nEOF"
print(f"\n2. Performing direct PUT upload to URL...")
put_headers = token_info.get("headers", {})
put_url = token_info["url"]

res_put = requests.put(put_url, data=dummy_data, headers=put_headers)
print("PUT Status Code:", res_put.status_code)
if res_put.status_code in (200, 201):
    print("PUT Upload Succeeded!")
else:
    print("PUT Upload Failed!")
    sys.exit(1)

# 3. Call Ingress /claims API to register the pre-uploaded file
print("\n3. Registering storage path with Ingress /claims API...")
ingress_url = "http://localhost:8001/claims"
storage_path = f"s3://{MinioStorage.BUCKET_NAME}/{temp_key}"

payload = {
    "policy_id": "swagath",
    "patient_id": "swagath",
    "storage_paths": [storage_path]
}

res_post = requests.post(ingress_url, data=payload)
print("POST Status Code:", res_post.status_code)
print("POST Response:", res_post.json())

if res_post.status_code == 202:
    print("\n[SUCCESS] Direct upload registration succeeded and enqueued in Celery pipeline!")
else:
    print("\n[ERROR] Failed to register direct upload with Ingress!")
    sys.exit(1)
