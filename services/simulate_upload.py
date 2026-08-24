import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import requests
from sqlalchemy import create_engine, text
from libs.shared.storage import MinioStorage

def main():
    db_url = os.getenv("DATABASE_URL")
    engine = create_engine(db_url)
    
    with engine.connect() as conn:
        res = conn.execute(
            text("SELECT minio_path FROM documents WHERE file_name = 'high_risk_claim_2_liver_transplant 1.pdf'")
        )
        row = res.fetchone()
        if not row:
            print("Document not found in database.")
            return
        minio_path = row[0]
        print(f"Found MinIO path: {minio_path}")
        
    # Read file bytes from MinIO via temporary file
    temp_file = "temp_download_file.pdf"
    MinioStorage.download_file(minio_path, temp_file)
    with open(temp_file, "rb") as f:
        file_bytes = f.read()
    os.remove(temp_file)
    print(f"Downloaded {len(file_bytes)} bytes from MinIO.")
    
    # Upload to ingress under patient 'rohan'
    files = {
        "files": ("high_risk_claim_2_liver_transplant 1.pdf", file_bytes, "application/pdf")
    }
    data = {
        "patient_id": "rohan",
        "policy_id": "rohan"
    }
    
    url = "http://gateway:8000/ingress/claims"
    resp = requests.post(url, files=files, data=data)
    print(f"Upload Response: {resp.status_code}")
    print(resp.json())

if __name__ == "__main__":
    main()
