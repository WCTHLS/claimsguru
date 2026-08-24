import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))
os.environ["DATABASE_URL"] = os.environ.get("DATABASE_URL", "mssql+pymssql://sa:YourStrong!Password@localhost:1433/claimgpt")

from app.db import SessionLocal
from sqlalchemy import text

def query_claim():
    claim_id = "fba088f9-98a7-4249-a824-942fe0bb9e71"
    print(f"Querying database for claim {claim_id}...")
    with SessionLocal() as db:
        # Check claim
        claim_row = db.execute(
            text("SELECT id, status, created_at FROM claims WHERE id = :id"),
            {"id": claim_id}
        ).mappings().first()
        
        if not claim_row:
            print("Claim not found!")
            return
            
        print("\n--- Claim Info ---")
        print(dict(claim_row))
        
        # Check documents
        print("\n--- Documents ---")
        docs = db.execute(
            text("SELECT id, file_name, file_type, minio_path, doc_type, content_hash FROM documents WHERE claim_id = :id"),
            {"id": claim_id}
        ).mappings().all()
        for d in docs:
            print(f"ID: {d['id']}, Name: {d['file_name']}, Type: {d['file_type']}, MinioPath: {d['minio_path']}, DocType: {d['doc_type']}, ContentHash: {d['content_hash']}")
            
        # Check parsed fields
        print("\n--- Parsed Fields ---")
        parsed_fields = db.execute(
            text("SELECT field_name, field_value FROM parsed_fields WHERE claim_id = :id"),
            {"id": claim_id}
        ).mappings().all()
        for pf in parsed_fields:
            print(f"Field: {pf['field_name']}, Value: {pf['field_value']}")
            
        # Check expenses
        print("\n--- Expenses ---")
        expenses = db.execute(
            text("SELECT id, category, description, amount, status FROM expenses WHERE claim_id = :id"),
            {"id": claim_id}
        ).mappings().all()
        for e in expenses:
            print(f"ID: {e['id']}, Category: {e['category']}, Description: {e['description']}, Amount: {e['amount']}, Status: {e['status']}")

if __name__ == "__main__":
    query_claim()
