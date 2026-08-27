import os
import requests
import uuid
import sys

# Folder path containing the batch files
BATCH_FOLDER = r"C:\Users\Admin\OneDrive - WaferWire Cloud Technologies\Documents\Documents\Batch"
INGRESS_URL = "http://localhost:8001/claims"

def run_batch_upload():
    print(f"Scanning folder: {BATCH_FOLDER}")
    if not os.path.exists(BATCH_FOLDER):
        print(f"Error: Folder '{BATCH_FOLDER}' does not exist.")
        sys.exit(1)

    files_in_folder = [
        f for f in os.listdir(BATCH_FOLDER)
        if f.lower().endswith(('.pdf', '.png', '.jpg', '.jpeg'))
    ]

    if not files_in_folder:
        print("No compatible documents (.pdf, .png, .jpg, .jpeg) found in the folder.")
        return

    print(f"Found {len(files_in_folder)} files to upload.")
    print("-" * 50)

    import time

    for idx, filename in enumerate(files_in_folder, start=1):

        file_path = os.path.join(BATCH_FOLDER, filename)
        # Use 'swagath' as the default patient_id so the uploaded claims show in your dashboard
        patient_id = sys.argv[1] if len(sys.argv) > 1 else "swagath"
        policy_id = f"batch_policy_{uuid.uuid4().hex[:8]}"
        
        print(f"[{idx}/{len(files_in_folder)}] Uploading: {filename}")
        print(f"  └─ Patient ID: {patient_id}")
        
        retries = 3
        while retries > 0:
            try:
                with open(file_path, 'rb') as f:
                    files = {
                        'files': (filename, f, 'application/pdf' if filename.lower().endswith('.pdf') else 'image/jpeg')
                    }
                    data = {
                        'patient_id': patient_id,
                        'policy_id': policy_id
                    }
                    
                    response = requests.post(INGRESS_URL, files=files, data=data, timeout=30)
                    
                if response.status_code in (200, 201, 202):
                    res_data = response.json()
                    task_id = res_data.get("task_id")
                    status = res_data.get("status")
                    print(f"  └─ [SUCCESS] Status: {status} | Celery Task ID: {task_id}")
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
            
        print("-" * 50)

    print("Batch upload complete!")

if __name__ == "__main__":
    run_batch_upload()
