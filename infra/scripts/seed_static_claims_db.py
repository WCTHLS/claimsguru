import os
import sys
import uuid
import json
from datetime import datetime
from sqlalchemy import create_engine, text

# Get DB URL from environment
DB_URL = os.getenv("DATABASE_URL", "postgresql://claimgpt:claimgpt@localhost:5432/claimgpt")
engine = create_engine(DB_URL)

# 5 Static Claim IDs
STATIC_CLAIMS = {
    # 1. Rajesh Kumar
    "00000000-0000-0000-0000-000000000001": {
        "policy_id": "POL-MAX-90812",
        "patient_id": "PAT-RK-45",
        "status": "MANUAL_REVIEW_REQUIRED",
        "parsed_fields": {
            "patient_name": "Rajesh Kumar",
            "policy_number": "POL-MAX-90812",
            "age": "54",
            "gender": "Male",
            "hospital_name": "Max Super Speciality Hospital, Saket, New Delhi",
            "doctor_name": "Dr. Ashish Chandra (Cardiology)",
            "admission_date": "2026-06-05",
            "discharge_date": "2026-06-10",
            "diagnosis": "Acute Coronary Syndrome (STEMI), Double Vessel Disease",
            "history_of_present_illness": "54-year-old male presented with crushing chest pain radiating to left arm for 4 hours, ST elevation in inferior leads.",
            "past_history": "Known hypertensive for 8 years on Tab. Amlodipine 5mg. Non-diabetic.",
            "treatment": "Coronary Angiography followed by Percutaneous Transluminal Coronary Angioplasty (PTCA) with placement of 2 Drug Eluting Stents (DES) in RCA and LAD.",
            "discharge_summary": "Patient was admitted in cardiac ICU, monitored, initiated on double anti-platelet therapy. Angioplasty performed successfully.",
            "bank_name": "State Bank of India",
            "bank_branch": "Saket Metro Branch, New Delhi",
            "account_holder": "Rajesh Kumar",
            "account_number": "20448102391",
            "ifsc_code": "SBIN0014292",
            "total_amount": "385000",
            "net_payable": "385000",
            "billed_amount": "385000",
        },
        "icd_codes": [
            ("I21.1", "Acute transmural myocardial infarction of inferior wall", 0.98, True, 280000),
            ("I25.10", "Atherosclerotic heart disease of native coronary artery without angina pectoris", 0.92, False, 105000)
        ],
        "cpt_codes": [
            ("92928", "Percutaneous transcatheter coronary stent placement, single major coronary artery", 0.96, 150000),
            ("92929", "Percutaneous transcatheter coronary stent placement, each additional coronary artery", 0.91, 120000)
        ],
        "expenses": [
            ("ICU Room Rent (3 days @ ₹12000)", 36000),
            ("Cardiology Ward Bed (2 days @ ₹8000)", 16000),
            ("Coronary Angioplasty Procedure", 150000),
            ("Drug Eluting Stents (2 units @ ₹60000)", 120000),
            ("Pharmacy & Cardiac Consumables", 43000),
            ("Cardiac Diagnostics (Angio, ECG, Lab)", 20000)
        ],
        "predictions": {
            "score": 0.68,
            "model": "ClaimRejectionNet-v3.1",
            "reasons": [
                {"reason": "ICU room rent (₹12,000/day) exceeds the policy-defined sum-insured cap of 1% (₹5,000/day).", "weight": 0.42},
                {"reason": "Drug Eluting Stent unit price (₹60,000) exceeds GIPSA/GCN tariff agreement maximum (₹52,000/stent).", "weight": 0.38}
            ]
        },
        "validations": [
            ("sum_insured_check", "Sum Insured Verification", "INFO", "Claim total (₹3.85 Lakh) is within the policy sum insured of ₹5.00 Lakh.", True),
            ("room_rent_limit", "ICU Room Rent Ceiling Check", "WARNING", "ICU room rent of ₹12,000/day exceeds the GIPSA room rent cap (₹5,000/day for Normal / ₹10,000/day for ICU). Excess ₹6,000 total flagged.", False),
            ("tariff_agreement", "GIPSA Stent Price Check", "WARNING", "DES stent billed at ₹60,000 per unit. Tariff cap is ₹52,000 per unit. Billed total exceeds agreement by ₹16,000.", False),
            ("billing_integrity", "Billing Column Addition Audit", "INFO", "All itemized charges match the final billed invoice subtotal.", True)
        ],
        "documents": [
            ("admission_record.pdf", "application/pdf"),
            ("angioplasty_report.pdf", "application/pdf"),
            ("discharge_summary.pdf", "application/pdf"),
            ("final_invoice.pdf", "application/pdf")
        ]
    },
    # 2. Priyadarshini Rao
    "00000000-0000-0000-0000-000000000002": {
        "policy_id": "POL-APO-77123",
        "patient_id": "PAT-PR-29",
        "status": "VALIDATION_FAILED",
        "parsed_fields": {
            "patient_name": "Priyadarshini Rao",
            "policy_number": "POL-APO-77123",
            "age": "29",
            "gender": "Female",
            "hospital_name": "Apollo Cradle Hospital, Bangalore",
            "doctor_name": "Dr. Latha Reddy (OB-GYN)",
            "admission_date": "2026-06-04",
            "discharge_date": "2026-06-07",
            "diagnosis": "LSCS Delivery (Caesarean Section) due to Breech Presentation and fetal distress",
            "history_of_present_illness": "29-year-old Primigravida at 39 weeks gestation admitted with complaints of abdominal pain and decreased fetal movements.",
            "past_history": "No significant comorbidities. Hypothyroid on Thyronorm 25mcg.",
            "treatment": "Lower Segment Caesarean Section (LSCS) performed under spinal anesthesia.",
            "discharge_summary": "Post-operative course was uneventful. Pain controlled. Breastfeeding well.",
            "bank_name": "HDFC Bank",
            "bank_branch": "Koramangala 4th Block, Bangalore",
            "account_holder": "Priyadarshini Rao",
            "account_number": "501002349018",
            "ifsc_code": "HDFC0000104",
            "total_amount": "145000",
            "net_payable": "145000",
            "billed_amount": "145000",
        },
        "icd_codes": [
            ("O82", "Single delivery by cesarean section", 0.99, True, 110000),
            ("O32.1", "Maternal care for breech presentation", 0.95, False, 35000)
        ],
        "cpt_codes": [
            ("59510", "Routine obstetric care including antepartum care, cesarean delivery, and postpartum care", 0.97, 145000)
        ],
        "expenses": [
            ("Luxury Room Rent (3 days @ ₹8000)", 24000),
            ("Operation Theatre (OT) & Anesthesia charges", 45000),
            ("Obstetrician Delivery Fees", 35000),
            ("Neonatal Care & Pediatrician Fees", 15000),
            ("Maternity Pharmacy & Consumables", 18000),
            ("Diagnostics & Pre-operative USG", 13000)
        ],
        "predictions": {
            "score": 0.15,
            "model": "ClaimRejectionNet-v3.1",
            "reasons": [
                {"reason": "Maternity sub-limit clause cap of ₹50,000 applies. Remainder of ₹95,000 is client liability.", "weight": 0.95}
            ]
        },
        "validations": [
            ("maternity_limit_check", "Maternity Sub-Limit Caps Check", "CRITICAL", "Billed amount (₹1,45,000) exceeds maternity cover sub-limit of ₹50,000 for LSCS. Excess ₹95,000 will be marked non-payable.", False),
            ("waiting_period_check", "Maternity Coverage Waiting Period", "INFO", "Maternity waiting period of 9 months satisfied (Policy active for 22 months).", True),
            ("sum_insured_check", "Sum Insured Check", "INFO", "Claim fits within general sum insured (₹3.00 Lakh).", True)
        ],
        "documents": [
            ("maternity_case_sheet.pdf", "application/pdf"),
            ("lscs_procedure_notes.pdf", "application/pdf"),
            ("apollo_bill_itemized.pdf", "application/pdf")
        ]
    },
    # 3. Amit Shah
    "00000000-0000-0000-0000-000000000003": {
        "policy_id": "POL-TATA-33291",
        "patient_id": "PAT-AS-48",
        "status": "APPROVED",
        "parsed_fields": {
            "patient_name": "Amit Shah",
            "policy_number": "POL-TATA-33291",
            "age": "48",
            "gender": "Male",
            "hospital_name": "Tata Memorial Hospital, Parel, Mumbai",
            "doctor_name": "Dr. Sanjay Deshmukh (Oncology)",
            "admission_date": "2026-06-09",
            "discharge_date": "2026-06-09",
            "diagnosis": "Adenocarcinoma of Colon, Stage III (FOLFOX regimen)",
            "history_of_present_illness": "48-year-old male with diagnosed adenocarcinoma of colon, stage III. Admitted for chemotherapy daycare cycle 4.",
            "past_history": "Post left hemicolectomy in January 2026. Non-diabetic, non-hypertensive.",
            "treatment": "Intravenous administration of Oxaliplatin, Leucovorin, and 5-Fluorouracil via chemoport under oncologist supervision.",
            "discharge_summary": "Daycare chemo session completed uneventfully. Port flushed. No immediate side-effects.",
            "bank_name": "ICICI Bank",
            "bank_branch": "Parel Branch, Mumbai",
            "account_holder": "Amit Shah",
            "account_number": "000491823901",
            "ifsc_code": "ICIC0000004",
            "total_amount": "92000",
            "net_payable": "92000",
            "billed_amount": "92000",
        },
        "icd_codes": [
            ("C18.9", "Malignant neoplasm of colon, unspecified", 0.97, True, 80000),
            ("Z51.11", "Encounter for antineoplastic chemotherapy", 0.99, False, 12000)
        ],
        "cpt_codes": [
            ("96413", "Chemotherapy administration, intravenous infusion; up to 1 hour, single or initial substance/drug", 0.95, 92000)
        ],
        "expenses": [
            ("Daycare Chemotherapy Bed Rent (1 day)", 3500),
            ("Chemotherapy Drug Infusion (Oxaliplatin, Leucovorin)", 68000),
            ("Oncologist Consultation Fees", 7500),
            ("Supportive Care & Anti-emetic Drugs", 8000),
            ("Pre-chemo Diagnostics (CBC, LFT, CEA)", 5000)
        ],
        "predictions": {
            "score": 0.08,
            "model": "ClaimRejectionNet-v3.1",
            "reasons": []
        },
        "validations": [
            ("daycare_procedure_check", "Daycare Chemotherapy Coverage Check", "INFO", "Chemotherapy daycare procedure is fully covered without 24-hour hospitalization constraint.", True),
            ("waiting_period_check", "Pre-existing Cancer Waiting Period Check", "INFO", "3-year cancer waiting period is satisfied (Policy age is 4 years).", True)
        ],
        "documents": [
            ("daycare_chemo_admission.pdf", "application/pdf"),
            ("oncology_treatment_plan.pdf", "application/pdf"),
            ("pharmacy_invoice_chemo.pdf", "application/pdf")
        ]
    },
    # 4. Sarla Devi
    "00000000-0000-0000-0000-000000000004": {
        "policy_id": "POL-FOR-55610",
        "patient_id": "PAT-SD-67",
        "status": "MANUAL_REVIEW_REQUIRED",
        "parsed_fields": {
            "patient_name": "Sarla Devi",
            "policy_number": "POL-FOR-55610",
            "age": "67",
            "gender": "Female",
            "hospital_name": "Fortis Memorial Research Institute, Gurugram",
            "doctor_name": "Dr. Vikram Sethi (Orthopedics)",
            "admission_date": "2026-06-01",
            "discharge_date": "2026-06-05",
            "diagnosis": "Severe Bilateral Osteoarthritis of Knee Joints",
            "history_of_present_illness": "67-year-old female complaining of bilateral knee pain for 5 years, worsening recently.",
            "past_history": "Diabetic for 12 years on Tab. Metformin 500mg. Thyroid on Eltroxin.",
            "treatment": "Left Total Knee Arthroplasty (TKA) performed using Zimmer high-flexion total knee implant.",
            "discharge_summary": "Post-op recovery satisfactory. Wound clean, dressing dry. In-hospital physiotherapy initiated.",
            "bank_name": "Punjab National Bank",
            "bank_branch": "Sushant Lok, Gurugram",
            "account_holder": "Sarla Devi",
            "account_number": "087122094812",
            "ifsc_code": "PUNB0087100",
            "total_amount": "290000",
            "net_payable": "290000",
            "billed_amount": "290000",
        },
        "icd_codes": [
            ("M17.12", "Unilateral primary osteoarthritis, left knee", 0.96, True, 290000)
        ],
        "cpt_codes": [
            ("27447", "Arthroplasty, knee, condyle and patella; total knee arthroplasty (TKR)", 0.98, 290000)
        ],
        "expenses": [
            ("Deluxe Single Room Rent (4 days @ ₹6000)", 24000),
            ("Total Knee Replacement (OT Charges)", 65000),
            ("Orthopedic Surgeon Fees", 55000),
            ("Zimmer Knee Joint Implant", 95000),
            ("In-hospital Physiotherapy (3 sessions)", 12000),
            ("Orthopedic Pharmacy & Consumables", 23000),
            ("Diagnostics (Bilateral X-Ray, ECG, Labs)", 16000)
        ],
        "predictions": {
            "score": 0.22,
            "model": "ClaimRejectionNet-v3.1",
            "reasons": [
                {"reason": "Implant sticker sheet verification pending. Missing manufacturer invoice barcode sticker.", "weight": 0.85}
            ]
        },
        "validations": [
            ("implant_verification", "Implant Barcode Sticker Verification", "CRITICAL", "Joint implant Zimmer billed at ₹95,000 lacks the original product serial barcode sticker. Required for audit verification.", False),
            ("room_rent_limit", "Room Rent Eligibility Check", "INFO", "Billed room rent ₹6,000/day is within the policy-allowed limit of ₹8,000/day.", True),
            ("sum_insured_check", "Sum Insured Eligibility Check", "INFO", "Billed total (₹2.90 Lakh) is within the policy sum insured of ₹4.00 Lakh.", True)
        ],
        "documents": [
            ("admission_clinical_notes.pdf", "application/pdf"),
            ("total_knee_arthroplasty_notes.pdf", "application/pdf"),
            ("implant_sticker_dossier.pdf", "application/pdf"),
            ("fortis_final_breakdown.pdf", "application/pdf")
        ]
    },
    # 5. Aarav Mehta
    "00000000-0000-0000-0000-000000000005": {
        "policy_id": "POL-KDA-12109",
        "patient_id": "PAT-AM-12",
        "status": "COMPLETED",
        "parsed_fields": {
            "patient_name": "Aarav Mehta",
            "policy_number": "POL-KDA-12109",
            "age": "12",
            "gender": "Male",
            "hospital_name": "Kokilaben Dhirubhai Ambani Hospital, Mumbai",
            "doctor_name": "Dr. Meera Patel (Pediatrics)",
            "admission_date": "2026-06-03",
            "discharge_date": "2026-06-07",
            "diagnosis": "Severe Dengue Hemorrhagic Fever (DHF) with Thrombocytopenia",
            "history_of_present_illness": "12-year-old male child presented with high-grade fever for 5 days, severe headache, body ache, and vomiting.",
            "past_history": "No previous hospitalizations, normal developmental milestones.",
            "treatment": "Admitted to Pediatric ICU for close monitoring. IV fluid therapy, oral paracetamol. Transfused 2 units of Platelet Concentrate on Day 2.",
            "discharge_summary": "Platelet counts rose progressively to 1.10 Lakh. Patient afebrile for 48 hours.",
            "bank_name": "Kotak Mahindra Bank",
            "bank_branch": "Andheri West, Mumbai",
            "account_holder": "Siddharth Mehta (Father)",
            "account_number": "90129841029",
            "ifsc_code": "KKBK0000642",
            "total_amount": "68000",
            "net_payable": "68000",
            "billed_amount": "68000",
        },
        "icd_codes": [
            ("A91", "Dengue hemorrhagic fever", 0.98, True, 55000),
            ("D69.59", "Other secondary thrombocytopenia", 0.94, False, 13000)
        ],
        "cpt_codes": [
            ("36430", "Transfusion, blood or blood components", 0.91, 68000)
        ],
        "expenses": [
            ("Pediatric ICU Room Rent (2 days @ ₹12000)", 24000),
            ("Pediatric Ward Bed Rent (2 days @ ₹5000)", 10000),
            ("Platelet Concentrate Transfusion charges", 12500),
            ("Pediatrician Daily Care Visits", 8000),
            ("Diagnostics (Daily Hemograms, Serology)", 9000),
            ("PPE Kits, Sanitization & Hygiene Chargers (Non-Payable)", 4500)
        ],
        "predictions": {
            "score": 0.35,
            "model": "ClaimRejectionNet-v3.1",
            "reasons": [
                {"reason": "Billed non-medical consumables (₹4,500) under standard medical lines.", "weight": 0.90}
            ]
        },
        "validations": [
            ("non_medical_items_deduction", "Non-Medical Items Deduction Check", "WARNING", "PPE and administrative hygiene packs billed at ₹4,500 are non-payable under IRDA guidelines. Marked for deduction.", False),
            ("clinical_necessity_check", "ICU Admission Clinical Justification", "INFO", "ICU admission justified by platelet count of 22,000/μL and hemorrhagic symptoms.", True)
        ],
        "documents": [
            ("emergency_admission_sheet.pdf", "application/pdf"),
            ("daily_lab_reports_platelets.pdf", "application/pdf"),
            ("hospital_invoice_dengue.pdf", "application/pdf")
        ]
    }
}

with engine.connect() as conn:
    print("Deleting old static claim references if any exist...")
    for cid in STATIC_CLAIMS.keys():
        conn.execute(text("DELETE FROM claims WHERE id = :cid"), {"cid": cid})
    conn.commit()

    print("Seeding new static claims...")
    for cid, data in STATIC_CLAIMS.items():
        # 1. Insert Claim
        conn.execute(
            text("INSERT INTO claims (id, policy_id, patient_id, status, source) VALUES (:id, :policy_id, :patient_id, :status, 'PATIENT')"),
            {"id": cid, "policy_id": data["policy_id"], "patient_id": data["patient_id"], "status": data["status"]}
        )

        # 2. Insert Documents
        doc_ids = []
        for i, (fname, ftype) in enumerate(data["documents"]):
            doc_id = str(uuid.uuid4())
            doc_ids.append(doc_id)
            conn.execute(
                text("INSERT INTO documents (id, claim_id, file_name, file_type, minio_path, content_hash) "
                     "VALUES (:id, :claim_id, :file_name, :file_type, :minio_path, :chash)"),
                {
                    "id": doc_id,
                    "claim_id": cid,
                    "file_name": fname,
                    "file_type": ftype,
                    "minio_path": f"/storage/raw/{cid}/{fname}",
                    "chash": f"hash-{cid}-{i}"
                }
            )

        # 3. Insert Parsed Fields
        for name, val in data["parsed_fields"].items():
            conn.execute(
                text("INSERT INTO parsed_fields (claim_id, field_name, field_value, model_version) VALUES (:claim_id, :name, :val, 'parser-v2')"),
                {"claim_id": cid, "name": name, "val": val}
            )

        # 4. Insert Expenses as structured ParsedFields (so submission service parses them correctly)
        for i, (cat, amt) in enumerate(data["expenses"]):
            expense_json = json.dumps({"category": cat, "amount": float(amt)})
            conn.execute(
                text("INSERT INTO parsed_fields (claim_id, field_name, field_value, model_version) "
                     "VALUES (:claim_id, :name, :val, 'expense-table-ui')"),
                {"claim_id": cid, "name": f"expense_table_row_{i+1}", "val": expense_json}
            )

        # 5. Insert ICD/CPT codes
        for code, desc, conf, is_primary, est in data["icd_codes"]:
            conn.execute(
                text("INSERT INTO medical_codes (claim_id, code, code_system, description, confidence, is_primary, estimated_cost) "
                     "VALUES (:claim_id, :code, 'ICD10', :desc, :conf, :is_primary, :est)"),
                {"claim_id": cid, "code": code, "desc": desc, "conf": conf, "is_primary": is_primary, "est": est}
            )
        for code, desc, conf, est in data["cpt_codes"]:
            conn.execute(
                text("INSERT INTO medical_codes (claim_id, code, code_system, description, confidence, is_primary, estimated_cost) "
                     "VALUES (:claim_id, :code, 'CPT', :desc, :conf, false, :est)"),
                {"claim_id": cid, "code": code, "desc": desc, "conf": conf, "est": est}
            )

        # 6. Insert Predictions
        pred_data = data["predictions"]
        conn.execute(
            text("INSERT INTO predictions (claim_id, rejection_score, top_reasons, model_name, model_version) "
                 "VALUES (:claim_id, :score, :reasons, :model, 'v3.1')"),
            {"claim_id": cid, "score": pred_data["score"], "reasons": json.dumps(pred_data["reasons"]), "model": pred_data["model"]}
        )

        # 7. Insert Validations
        for rule_id, rname, sev, msg, passed in data["validations"]:
            conn.execute(
                text("INSERT INTO validations (claim_id, rule_id, rule_name, severity, message, passed) "
                     "VALUES (:claim_id, :rule_id, :rname, :sev, :msg, :passed)"),
                {"claim_id": cid, "rule_id": rule_id, "rname": rname, "sev": sev, "msg": msg, "passed": passed}
            )

        # 8. Create a matching workflow state so progress bar loads
        conn.execute(
            text("INSERT INTO workflow_state (claim_id, current_step, status) "
                 "VALUES (:claim_id, 'Finalizing Report', 'COMPLETED')"),
            {"claim_id": cid}
        )

    conn.commit()

print("✅ SUCCESS: 5 static claims have been seeded successfully in the PostgreSQL database!")
