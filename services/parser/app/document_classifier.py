from __future__ import annotations

import re
from pathlib import Path
from typing import Any


def classify_document(ocr_pages: list[dict[str, Any]], layout: dict[str, Any] | None = None) -> str:
    """Classifies an uploaded document into a standard medical/insurance document type.
    
    If the document does not match any recognized medical, billing, clinical, or insurance
    patterns, returns 'unknown_document'.
    """
    if not ocr_pages:
        return "unknown_document"

    sections = (layout or {}).get("sections", []) or []
    section_types = {str(section.get("type", "")).lower() for section in sections}
    combined_text = " ".join(str(page.get("text", "")) for page in ocr_pages).lower().strip()
    
    if len(combined_text) < 15:
        return "unknown_document"

    first_page_text = str(ocr_pages[0].get("text", "")).lower()[:1500]

    # 1. Identity & KYC documents (High priority checks for unique government header markers)
    if any(kw in combined_text for kw in ("unique identification authority", "uidai", "government of india", "enrollment no", "enrolment no")):
        return "aadhaar_card"
    if any(kw in combined_text for kw in ("income tax department", "permanent account number")):
        return "pan_card"

    # 2. Clinical / Discharge Documents (Explicit discharge indicators)
    if "discharge summary" in combined_text or any(kw in combined_text for kw in (
        "treatment on discharge", "course in hospital", "condition on discharge",
        "condition at discharge", "discharge card", "advice on discharge"
    )):
        return "discharge_summary"

    # 3. Hospital / Patient Bills & Inpatient Invoices (High priority - must precede generic insurer matching)
    strict_billing_header = any(kw in first_page_text or kw in combined_text for kw in (
        "patient bill", "inpatient hospital bill", "inpatient bill", "hospital bill",
        "itemized inpatient", "itemized bill", "bill of supply", "tax invoice",
        "discharge bill", "final bill", "interim bill", "detailed charges statement",
        "billing summary", "breakup of charges", "break-up of charges"
    ))
    has_hospital_charge_terms = any(kw in combined_text for kw in (
        "general ward charges", "ward charges", "room rent", "room charges",
        "nursing charges", "ot charges", "operation theatre", "icu charges",
        "doctor consultation fee", "duty doctor fees", "consultant visit charges",
        "bed charges", "admission charges", "investigation charges"
    ))
    has_billing_table = (
        "expense_table" in section_types or
        "bill_table" in section_types or
        ("table" in section_types and any(kw in combined_text for kw in ("amount (rs.)", "amount (rs)", "total amount", "net payable", "billed amount", "subtotal", "sub total")))
    )

    if strict_billing_header or has_billing_table or has_hospital_charge_terms:
        return "hospital_bill"

    # 4. Lab & Diagnostic / Radiology Reports
    has_radiology = any(kw in combined_text for kw in (
        "radiology", "ultrasound", "x-ray", "x ray", "ct scan", "mri scan",
        "mri report", "sonography", "2d echo", "echocardiography", "ecg"
    ))
    has_lab_kw = any(kw in combined_text for kw in (
        "lab report", "laboratory", "investigation report", "pathology",
        "test result", "cbc", "lft", "kft", "rft", "lipid profile", "blood test"
    ))
    has_ref_range = any(kw in combined_text for kw in (
        "reference range", "ref range", "ref. range", "normal range",
        "observed value", "biological reference", "normal values"
    ))
    if has_radiology or (has_lab_kw and has_ref_range):
        return "lab_report"

    # 5. Pharmacy / Chemist Bills
    has_pharmacy_kw = any(kw in combined_text for kw in (
        "pharmacy", "chemist", "dispensing", "drug store", "drug license",
        "pharmacist", "medicines dispensed"
    ))
    if has_pharmacy_kw and any(kw in combined_text for kw in (
        "batch", "exp", "mrp", "qty", "tablets", "capsules", "injection", "syrup", "mfg date"
    )):
        return "pharmacy_bill"

    # 6. Policy Schedule / Insurance Health Card (Strictly checked without hospital charge markers)
    has_policy_kw = any(kw in combined_text for kw in (
        "policy schedule", "member schedule", "policy details", "policy period",
        "policy issuance", "sum insured", "health card", "e-health card",
        "policy wording", "mediclaim policy", "my:health", "irdai regn", "irdai reg",
        "pre-authorization request", "pre-auth request", "cashless request form"
    ))
    # Exclude if it looks like medical treatment charges
    if has_policy_kw and not has_hospital_charge_terms:
        return "insurance_form"

    # 7. Low priority identity fallbacks
    if any(kw in combined_text for kw in ("aadhaar", "aadhhaar", "adhar")):
        return "aadhaar_card"
    if any(kw in combined_text for kw in ("pan card",)):
        return "pan_card"
    if any(kw in combined_text for kw in ("voter id", "passport", "driving licence", "identity card", "kyc")):
        return "identity_proof"

    # 8. Unrecognized / Unknown document
    return "unknown_document"


def generate_smart_display_title(
    doc_type: str,
    fields_map: dict[str, str],
    original_filename: str = "",
    ocr_pages: list[dict[str, Any]] | None = None,
) -> str:
    """Generate a clean, human-readable display title for a document based on its type and extracted metadata.
    
    If doc_type is unknown_document or unrecognized, returns 'Unknown Document'.
    """
    hospital = str(fields_map.get("hospital_name") or fields_map.get("hospital") or "").strip()
    patient = str(fields_map.get("patient_name") or fields_map.get("patient") or "").strip()
    amount = str(fields_map.get("claimed_total") or fields_map.get("total_amount") or "").strip()
    raw_insurer = str(fields_map.get("insurance_company") or fields_map.get("insurer") or fields_map.get("tpa_name") or "").strip()
    
    combined_sample = ""
    if ocr_pages:
        combined_sample = " ".join(str(p.get("text", "")) for p in ocr_pages).lower()[:2000]

    insurer = ""
    if raw_insurer:
        ins_lower = raw_insurer.lower()
        if "hdfc" in ins_lower:
            insurer = "HDFC ERGO"
        elif "star" in ins_lower and "hdfc" not in ins_lower:
            insurer = "Star Health"
        elif "icici" in ins_lower:
            insurer = "ICICI Lombard"
        elif "care" in ins_lower:
            insurer = "Care Health"
        elif "niva" in ins_lower or "bupa" in ins_lower:
            insurer = "Niva Bupa"
        elif "bajaj" in ins_lower:
            insurer = "Bajaj Allianz"
        elif "new india" in ins_lower:
            insurer = "New India Assurance"
        elif "national insurance" in ins_lower:
            insurer = "National Insurance"
        elif "oriental" in ins_lower:
            insurer = "Oriental Insurance"
        elif "united india" in ins_lower:
            insurer = "United India Insurance"
        else:
            insurer = raw_insurer

    if doc_type == "hospital_bill":
        # Dynamically determine exact declared bill title from text or filename
        bill_header = "Hospital Bill"
        if "patient bill" in combined_sample or "patient_bill" in original_filename.lower():
            bill_header = "Patient Bill"
        elif "inpatient hospital bill" in combined_sample:
            bill_header = "Inpatient Hospital Bill"
        elif "inpatient bill" in combined_sample:
            bill_header = "Inpatient Bill"
        elif "bill of supply" in combined_sample:
            bill_header = "Bill of Supply"

        clean_hospital = hospital
        if clean_hospital.lower() in ("inpatient hospital", "hospital bill", "patient bill", "hospital", "patient", "inpatient"):
            clean_hospital = ""

        if clean_hospital and amount:
            return f"{bill_header} - {clean_hospital} (₹{amount})"
        elif clean_hospital:
            return f"{bill_header} - {clean_hospital}"
        elif patient:
            return f"{bill_header} - {patient}"
        elif original_filename and not original_filename.startswith("tmp"):
            stem = Path(original_filename).stem
            if len(stem) > 2 and not re.match(r"^[a-f0-9]{12,}$", stem.lower()):
                clean_stem = re.sub(r"[\-_]", " ", stem).title()
                return f"{bill_header} - {clean_stem}"
        return bill_header

    elif doc_type == "discharge_summary":
        if patient:
            return f"Discharge Summary - {patient}"
        elif hospital:
            return f"Discharge Summary - {hospital}"
        return "Discharge Summary"

    elif doc_type == "aadhaar_card":
        if patient:
            return f"Aadhaar Card - {patient}"
        return "Aadhaar Card"

    elif doc_type == "pan_card":
        if patient:
            return f"PAN Card - {patient}"
        return "PAN Card"

    elif doc_type == "identity_proof":
        if patient:
            return f"Identity Proof - {patient}"
        return "Identity Proof"

    elif doc_type == "pharmacy_bill":
        if hospital:
            return f"Pharmacy Invoice - {hospital}"
        return "Pharmacy Invoice"

    elif doc_type == "lab_report":
        if hospital:
            return f"Diagnostic Lab Report - {hospital}"
        return "Diagnostic Lab Report"

    elif doc_type in ("insurance_form", "policy_document"):
        if "pre-auth" in original_filename.lower() or "pre-authorization" in original_filename.lower():
            if patient:
                return f"Pre-Authorization - {patient}"
            return "Pre-Authorization Note"
        if insurer:
            return f"Policy Document - {insurer}"
        if patient:
            return f"Policy Document - {patient}"
        return "Policy Document"

    # Explicit fallback for unknown or unrecognized documents
    return "Unknown Document"