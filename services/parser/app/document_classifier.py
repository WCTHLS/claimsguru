from __future__ import annotations

from typing import Any


def classify_document(ocr_pages: list[dict[str, Any]], layout: dict[str, Any] | None = None) -> str:
    sections = (layout or {}).get("sections", []) or []
    section_types = {str(section.get("type", "")).lower() for section in sections}
    combined_text = " ".join(str(page.get("text", "")) for page in ocr_pages).lower()

    # 1. Identity & KYC documents (High priority checks for unique header markers)
    if any(kw in combined_text for kw in ("unique identification authority", "uidai", "government of india", "enrollment no", "enrolment no")):
        return "aadhaar_card"
    if any(kw in combined_text for kw in ("income tax department", "permanent account number")):
        return "pan_card"

    # 2. Clinical / Discharge Documents (High priority - must contain explicit discharge indicators)
    if "discharge summary" in combined_text or any(kw in combined_text for kw in ("treatment on discharge", "course in hospital", "condition at discharge")):
        return "discharge_summary"

    # 3. Billing & Expense Tables (Strict High-Priority Check)
    strict_billing_kw = any(kw in combined_text for kw in ("hospital bill", "inpatient hospital", "itemized inpatient", "final bill", "inpatient bill", "billing summary", "discharge bill", "patient bill", "itemized bill"))
    if "expense_table" in section_types or "bill_table" in section_types:
        return "hospital_bill"
    if strict_billing_kw:
        return "hospital_bill"

    # 4. Lab & Investigation Reports
    has_radiology = any(kw in combined_text for kw in ("radiology", "ultrasound", "x-ray", "ct scan", "mri scan", "mri report", "sonography"))
    has_lab_kw = any(kw in combined_text for kw in ("lab report", "laboratory", "investigation report", "pathology", "test result", "cbc", "lft", "kft", "lipid profile"))
    has_ref_range = any(kw in combined_text for kw in ("reference range", "ref range", "ref. range", "normal range", "observed value", "biological reference", "normal values"))
    if has_radiology or (has_lab_kw and has_ref_range):
        return "lab_report"

    # 5. Pharmacy / Chemist Bills
    has_pharmacy_kw = any(kw in combined_text for kw in ("chemist", "dispensing", "mfg date", "batch no", "exp date", "drug store", "drug license", "pharmacist", "medicines dispensed"))
    if has_pharmacy_kw:
        return "pharmacy_bill"

    # 6. Insurance Claim Form / Pre-authorizations
    if any(kw in combined_text for kw in ("claim form", "insurance form", "policy number", "tpa", "sum insured", "pre-authorization", "pre-auth", "insurer communication", "part a", "part b")):
        return "insurance_form"

    # 6b. Billing & Expense Tables (Loose Fallback Check)
    has_billing_kw = any(kw in combined_text for kw in ("total amount", "net payable", "billed amount", "room rent", "room charges", "nursing charges", "bill", "invoice", "receipt", "total payment"))
    if "table" in section_types and has_billing_kw:
        return "hospital_bill"
    if any(kw in combined_text for kw in ("room rent", "room charges", "nursing charges")):
        return "hospital_bill"

    # 7. Low priority fallbacks for KYC using keywords like "aadhaar", "pan", etc.
    if any(kw in combined_text for kw in ("aadhaar", "aadhhaar", "adhar")):
        return "aadhaar_card"
    if any(kw in combined_text for kw in ("govt of india", "pan card")):
        return "pan_card"
    if any(kw in combined_text for kw in ("voter id", "passport", "driving licence", "identity card", "health card", "kyc")):
        return "identity_proof"

    return "hospital_bill"


def generate_smart_display_title(
    doc_type: str,
    fields_map: dict[str, str],
    original_filename: str = "",
) -> str:
    """Generate a clean, human-readable display title for a document based on its type and extracted metadata."""
    import re
    from pathlib import Path

    hospital = str(fields_map.get("hospital_name") or fields_map.get("hospital") or "").strip()
    patient = str(fields_map.get("patient_name") or fields_map.get("patient") or "").strip()
    amount = str(fields_map.get("claimed_total") or fields_map.get("total_amount") or "").strip()

    if doc_type == "hospital_bill":
        if hospital and amount:
            return f"Hospital Bill - {hospital} (₹{amount})"
        elif hospital:
            return f"Hospital Bill - {hospital}"
        elif patient:
            return f"Hospital Bill - {patient}"
        return "Hospital Itemized Bill"

    elif doc_type == "discharge_summary":
        if patient:
            return f"Discharge Summary - {patient}"
        elif hospital:
            return f"Discharge Summary - {hospital}"
        return "Hospital Discharge Summary"

    elif doc_type == "aadhaar_card":
        if patient:
            return f"Aadhaar Card - {patient}"
        return "ID Proof - Aadhaar Card"

    elif doc_type == "pan_card":
        if patient:
            return f"PAN Card - {patient}"
        return "ID Proof - PAN Card"

    elif doc_type == "identity_proof":
        if patient:
            return f"KYC Identity Proof - {patient}"
        return "KYC Identity Proof"

    elif doc_type == "pharmacy_bill":
        if hospital:
            return f"Pharmacy Receipt - {hospital}"
        return "Pharmacy / Medicine Bill"

    elif doc_type == "lab_report":
        if hospital:
            return f"Lab Report - {hospital}"
        return "Diagnostic Lab Report"

    elif doc_type == "insurance_form":
        if "pre-auth" in original_filename.lower() or "pre-authorization" in original_filename.lower():
            if patient:
                return f"Pre-Authorization - {patient}"
            return "Pre-Authorization Note"
        if patient:
            return f"Claim Form - {patient}"
        return "Insurance Claim Form"

    if original_filename and not original_filename.startswith("tmp"):
        stem = Path(original_filename).stem
        if len(stem) > 3 and not re.match(r"^[a-f0-9]{12,}$", stem.lower()):
            return re.sub(r"[\-_]", " ", stem).title()

    return "Medical Document"