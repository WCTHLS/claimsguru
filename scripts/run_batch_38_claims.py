import os
import sys
import time
import requests
import mimetypes

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

INGRESS_URL = "https://cg-preprod-cin-ingress.purpleocean-4441f644.centralindia.azurecontainerapps.io"
CLAIMS_DIR = r"C:\Users\Admin\Downloads\claims"
TOKEN = """eyJ0eXAiOiJKV1QiLCJub25jZSI6ImxWSDQyUVZqbHVNUG12TkxpZDJhM3c1OHdIdEF4ZXk2c1BjMzVrRDdub3ciLCJhbGciOiJSUzI1NiIsIng1dCI6InJ5QngtNjVqTm94SDRGUUhfNnphck5qYU5mNCIsImtpZCI6InJ5QngtNjVqTm94SDRGUUhfNnphck5qYU5mNCJ9.eyJhdWQiOiIwMDAwMDAwMy0wMDAwLTAwMDAtYzAwMC0wMDAwMDAwMDAwMDAiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC8wZmFjMjVjNy0wZDhjLTRmMzQtOGM4ZC0zOTgxYTVkMmE0ODIvIiwiaWF0IjoxNzkyNTc3NjQ1LCJuYmYiOjE3OTI1Nzc2NDUsImV4cCI6MTc5MjU4MjUxMSwiYWNjdCI6MCwiYWNyIjoiMSIsImFjcnMiOlsicGZkciJdLCJhaW8iOiJBVVFBdS84ZUFBQUFoNEZyR0F0WjNaK1NRc1hxeGtldHplYkRmVU9GdjBITGZNYUtydHVVZHZHcENMOEt4TTMrdW9UN2lhMjhLZVhyWVlWN3BaallEdFp2Q0J2eUhkOTg4dz09IiwiYW1yIjpbInB3ZCJdLCJhcHBfZGlzcGxheW5hbWUiOiJDbGFpbXNHdXJ1IEZvciBQYXRpZW50cyIsImFwcGlkIjoiMTJhMjViZjktNDI1Zi00MjIyLWE4OGYtYWE3MmI5OWFhNjVhIiwiYXBwaWRhY3IiOiIwIiwiaWR0eXAiOiJ1c2VyIiwiaXBhZGRyIjoiMTgzLjgyLjExOC4xNTciLCJuYW1lIjoidW5rbm93biIsIm9pZCI6ImE3MDBmNTE1LTczOWQtNDdhNi1iODliLWQ1NTg5YjA0MjY4NyIsInBsYXRmIjoiMyIsInB1aWQiOiIxMDAzMjAwNjU3MzMzOTEyIiwicmgiOiIxLkFjOEF4eVdzRDR3Tk5FLU1qVG1CcGRLa2dnTUFBQUFBQUFBQXdBQUFBQUFBQUFBQUFEWFBBQS4iLCJzY3AiOiJlbWFpbCBvcGVuaWQgcHJvZmlsZSIsInNpZCI6IjAwOWIzNjdhLWU4OTEtNWY5Zi1iZjExLWQ4NzQ3YmQ4NDA4OSIsInNpZ25pbl9zdGF0ZSI6WyJrbXNpIl0sInN1YiI6IlpaeGFFUU1wdWtSNzFISFMxNmdncTlHakVPdnhaSUpOWkpaMTVaN19nQ28iLCJ0ZW5hbnRfcmVnaW9uX3Njb3BlIjoiTkEiLCJ0aWQiOiIwZmFjMjVjNy0wZDhjLTRmMzQtOGM4ZC0zOTgxYTVkMmE0ODIiLCJ1bmlxdWVfbmFtZSI6InN3YWdhdGhyZWRkeWthc3VsYUBnbWFpbC5jb20iLCJ1cG4iOiJhNzAwZjUxNS03MzlkLTQ3YTYtYjg5Yi1kNTU4OWIwNDI2ODdAY2xhaW1zZ3VydWFwcC5vbm1pY3Jvc29mdC5jb20iLCJ1dGkiOiJONWtwYkR2ZTAwZWxzQlpicmRNbEFBIiwidmVyIjoiMS4wIiwid2lkcyI6WyJiNzlmYmY0ZC0zZWY5LTQ2ODktODE0My03NmIxOTRlODU1MDkiXSwieG1zX2FjZCI6MTc5MDc4NjAwMSwieG1zX2FjdF9mY3QiOiI5IDMiLCJ4bXNfYXVkX2d1aWQiOiIwMDAwMDAwMy0wMDAwLTAwMDAtYzAwMC0wMDAwMDAwMDAwMDAiLCJ4bXNfZnRkIjoiXzNIT2JIYmI4X3JKRUlUa1ZYR3EySkc1enNCcmJiLVVaWjZiNVU5YW9mSUJkWE51YjNKMGFDMWtjMjF6IiwieG1zX2lkcmVsIjoiMzAgMSIsInhtc19wZnRleHAiOjE3OTI2Njg5MTEsInhtc19zdCI6eyJzdWIiOiI3d3pkR2xBSF9aaW16NWNQdWJKOVEybEF6bWdwQnplSG1SSmYzMjVJbWpvIn0sInhtc19zdWJfZmN0IjoiMyA2IiwieG1zX3RjZHQiOjE3ODg1Mzc0NTQsInhtc190bnRfZmN0IjoiNiAzIn0.MvZ6KctlPNZp59mCZvtkdk3qDFe8vFPuIkQKqIaJOH8JF5SXOowHsYrmXMN4KU18GtrXwN0CDTG2hEOQzD2r75UKNtoTT5Vgj-C7KeMJR5RSbQp3o8CmmPtIfXw9J2SzKMNgeBN6SZw8Gqq6XR8U7xe5jXtULXrBT5UtMPzcKT_58y1e_cq7fuY2zq4CbasAAKEq6tUUnt25uMRZyedfwXBDDhlwd5Zbr4mKOx_6GtWAn5vwbOvWRqpHK4HSjGQkRtXj6NiMyZbjg1W2RNbYUqFKXmpJ2o3ePKrjpTIscB2UTYDYM2AmtqNbsw2HfJ9xGYQBz3vdJCubozDnByNgaA""".strip()

PATIENT_ID = "60624570-D81C-4B09-A361-64527F86AFF2"
USER_EMAIL = "swagathreddykasula@gmail.com"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "x-user-email": USER_EMAIL,
    "x-patient-id": PATIENT_ID,
    "x-user-id": PATIENT_ID,
}

def get_mime(filename):
    mime, _ = mimetypes.guess_type(filename)
    if mime:
        return mime
    if filename.lower().endswith(".pdf"):
        return "application/pdf"
    if filename.lower().endswith(".png"):
        return "image/png"
    if filename.lower().endswith((".jpg", ".jpeg")):
        return "image/jpeg"
    return "application/octet-stream"

def run_batch():
    print(f"=== Starting Batch Ingestion from {CLAIMS_DIR} ===")
    items = sorted(os.listdir(CLAIMS_DIR))
    
    successful = []
    failed = []

    for idx, item_name in enumerate(items, 1):
        full_path = os.path.join(CLAIMS_DIR, item_name)
        print(f"\n[{idx}/{len(items)}] Processing: {item_name} ...")
        
        file_handles = []
        files_payload = []
        
        try:
            if os.path.isdir(full_path):
                # Folder containing multiple docs for this claim
                sub_files = [f for f in sorted(os.listdir(full_path)) if not f.startswith(".")]
                print(f"  -> Multi-document claim package ({len(sub_files)} files)")
                for sf in sub_files:
                    sf_path = os.path.join(full_path, sf)
                    if os.path.isfile(sf_path):
                        fh = open(sf_path, "rb")
                        file_handles.append(fh)
                        files_payload.append(("files", (sf, fh, get_mime(sf))))
            elif os.path.isfile(full_path):
                # Single document claim
                print(f"  -> Single file claim ({os.path.getsize(full_path)} bytes)")
                fh = open(full_path, "rb")
                file_handles.append(fh)
                files_payload.append(("files", (item_name, fh, get_mime(item_name))))
            else:
                continue

            data_payload = {
                "patient_id": PATIENT_ID,
                "email": USER_EMAIL,
                "user_email": USER_EMAIL,
                "force": "true",
            }

            resp = requests.post(
                f"{INGRESS_URL}/claims",
                headers=HEADERS,
                data=data_payload,
                files=files_payload,
                timeout=120,
            )

            if resp.status_code in (200, 201, 202):
                res_json = resp.json()
                cid = res_json.get("claim_id") or res_json.get("id")
                tid = res_json.get("task_id")
                status = res_json.get("status")
                print(f"  [OK] SUBMITTED | Claim ID: {cid} | Status: {status} | Task ID: {tid}")
                successful.append({
                    "item": item_name,
                    "claim_id": cid,
                    "task_id": tid,
                    "status": status,
                })
            else:
                print(f"  [FAIL] ({resp.status_code}): {resp.text}")
                failed.append({"item": item_name, "error": resp.text, "code": resp.status_code})

        except Exception as e:
            print(f"  [FAIL] EXCEPTION: {e}")
            failed.append({"item": item_name, "error": str(e)})
        finally:
            for fh in file_handles:
                try:
                    fh.close()
                except Exception:
                    pass

        # Brief pause between uploads to stream them cleanly into the queue
        time.sleep(0.5)

    print("\n" + "=" * 60)
    print(f"BATCH SUBMISSION COMPLETE: {len(successful)} Successful, {len(failed)} Failed")
    print("=" * 60)

if __name__ == "__main__":
    run_batch()
