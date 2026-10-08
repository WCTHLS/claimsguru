import sys
import os
sys.path.insert(0, os.path.abspath("."))

from services.submission.app.irda_pdf_modern import generate_irda_pdf_modern
from services.submission.app.tpa_pdf_modern import generate_tpa_pdf_modern

mock_claim = {
    "claim_id": "CLM-TEST-001",
    "patient_name": "Odilia Mertz",
    "policy_id": "POL-SH-2024",
    "hospital_name": "MIDDLETON FAMILY MEDICINE URGENT CARE LLC",
    "expenses": [
        {"category": "Hemoglobin A1C/Hemoglobin, Body Height", "amount": "2263.00"},
        {"category": "Tramadol Hydrochloride 50 Mg O", "amount": "31186.00"},
        {"category": "Surgical Consumables, Iv Lines", "amount": "9366.00"},
        {"category": "Assessment Of Health And Social Care Needs (Procedure)", "amount": "129420.00"},
        {"category": "Nursing Care - 1 Days", "amount": "1200.00"},
        {"category": "General Ward - 1 Days", "amount": "8000.00"},
        {"category": "Admin, Food, Transport", "amount": "1720.00"},
        {"category": "Specialist - 3 Visits", "amount": "2400.00"}
    ],
    "parsed_fields": {
        "patient_name": "Odilia Mertz",
        "hospital_name": "MIDDLETON FAMILY MEDICINE URGENT CARE LLC",
        "policy_number": "POL-SH-2024",
        "total_amount": "0",
        "admission_date": "27-12-2019",
        "discharge_date": "27-12-2019",
        "diagnosis": "Medical Treatment",
    },
    "icd_codes": [{"code": "Z31.0", "description": "Tuboplasty or vasovasostomy"}],
    "predictions": [{"rejection_score": 0.10}]
}

irda_pdf = generate_irda_pdf_modern(mock_claim)
tpa_pdf = generate_tpa_pdf_modern(mock_claim)
print(f"VERIFIED: IRDAI PDF size={len(irda_pdf)} bytes, TPA PDF size={len(tpa_pdf)} bytes")
