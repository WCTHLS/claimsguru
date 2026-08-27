import os
import requests
import uuid
import sys
import mimetypes

# Folder path containing the batch files or subfolders
BATCH_FOLDER = r"C:\Users\Admin\OneDrive - WaferWire Cloud Technologies\Documents\Documents\Batch"
INGRESS_URL = "http://localhost:8001/claims"

def get_content_type(filename: str) -> str:
    fn = filename.lower()
    if fn.endswith('.pdf'):
        return 'application/pdf'
    elif fn.endswith('.png'):
        return 'image/png'
    elif fn.endswith(('.jpg', '.jpeg')):
        return 'image/jpeg'
    return 'application/octet-stream'

def run_batch_upload():
    print(f"Scanning folder: {BATCH_FOLDER}")
    if not os.path.exists(BATCH_FOLDER):
        print(f"Error: Folder '{BATCH_FOLDER}' does not exist.")
        sys.exit(1)

    patient_id = sys.argv[1] if len(sys.argv) > 1 else "swagath"

    # 1. Discover subfolders (where each subfolder represents 1 patient claim with multiple images)
    subfolders = [
        os.path.join(BATCH_FOLDER, d) for d in os.listdir(BATCH_FOLDER)
        if os.path.isdir(os.path.join(BATCH_FOLDER, d))
    ]

    # 2. Discover direct root files
    direct_files = [
        os.path.join(BATCH_FOLDER, f) for f in os.listdir(BATCH_FOLDER)
        if os.path.isfile(os.path.join(BATCH_FOLDER, f)) and f.lower().endswith(('.pdf', '.png', '.jpg', '.jpeg'))
    ]

    claims_to_upload = []

    # Process subfolders as multi-document claims
    for folder in subfolders:
        folder_name = os.path.basename(folder)
        doc_files = [
            os.path.join(folder, f) for f in os.listdir(folder)
            if f.lower().endswith(('.pdf', '.png', '.jpg', '.jpeg'))
        ]
        if doc_files:
            claims_to_upload.append({
                "name": folder_name,
                "files": doc_files,
                "is_folder": True
            })

    # Process loose root files as single-document claims
    for file_path in direct_files:
        claims_to_upload.append({
            "name": os.path.basename(file_path),
            "files": [file_path],
            "is_folder": False
        })

    if not claims_to_upload:
        print("No compatible documents (.pdf, .png, .jpg, .jpeg) or subfolders found.")
        return

    print(f"Found {len(claims_to_upload)} patient claims ({len(subfolders)} multi-document folders, {len(direct_files)} single files).")
    print("-" * 50)

    import time

    for idx, claim_item in enumerate(claims_to_upload, start=1):
        claim_name = claim_item["name"]
        file_paths = claim_item["files"]
        policy_id = f"batch_policy_{uuid.uuid4().hex[:8]}"

        print(f"[{idx}/{len(claims_to_upload)}] Uploading claim: {claim_name}")
        print(f"  └─ Patient ID: {patient_id} | Documents attached: {len(file_paths)}")
        for fp in file_paths:
            print(f"      📄 {os.path.basename(fp)}")

        # Open all file handles
        open_files = []
        multipart_files = []
        try:
            for fp in file_paths:
                f_handle = open(fp, 'rb')
                open_files.append(f_handle)
                fn = os.path.basename(fp)
                multipart_files.append(
                    ('files', (fn, f_handle, get_content_type(fn)))
                )

            data = {
                'patient_id': patient_id,
                'policy_id': policy_id
            }

            retries = 3
            while retries > 0:
                try:
                    response = requests.post(INGRESS_URL, files=multipart_files, data=data, timeout=60)
                    
                    if response.status_code in (200, 201, 202):
                        res_data = response.json()
                        task_id = res_data.get("task_id")
                        claim_id = res_data.get("claim_id")
                        status = res_data.get("status")
                        print(f"  └─ [SUCCESS] Status: {status} | Claim ID: {claim_id} | Task ID: {task_id}")
                        break
                    elif response.status_code == 429:
                        try:
                            retry_after = response.json().get("detail", {}).get("retry_after", 60)
                        except Exception:
                            retry_after = 60
                        print(f"  └─ [RATE LIMIT] Exceeded rate limit. Sleeping for {retry_after}s before retry...")
                        time.sleep(retry_after + 1)
                        retries -= 1
                    else:
                        print(f"  └─ [FAILED] Status Code {response.status_code}: {response.text}")
                        break
                        
                except Exception as e:
                    print(f"  └─ [ERROR] Failed to send request: {e}")
                    break
        finally:
            # Ensure all open file handles are closed
            for fh in open_files:
                try:
                    fh.close()
                except Exception:
                    pass

        print("-" * 50)

    print("Batch upload complete!")

if __name__ == "__main__":
    run_batch_upload()

