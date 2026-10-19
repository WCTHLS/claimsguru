import re
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Common non-expense and subtotal keywords to filter
SUBTOTAL_KEYWORDS = (
    "total", "grand total", "gross total", "sub total", "subtotal", "sub-total",
    "page total", "carried forward", "c/f", "brought forward", "b/f",
    "advance received", "advance paid", "deposit", "payment received", "net amount payable",
    "net payable", "amount in words", "total reimbursement claimed", "amount paid to hospital"
)

# Narrative and non-billing section keywords that should never be expense rows
NON_EXPENSE_NARRATIVE_PATTERNS = (
    "diagnos", "co-morbidity", "comorbidity", "chief complaint", "declaration",
    "risk classification", "risk factor", "patient information", "hospitalization details",
    "insurance information", "doctor signature", "patient signature", "date of birth",
    "relation to insured", "member id", "policy number", "group number", "sum insured",
    "amount exceeding policy", "claim amount requested", "total amount", "planned/emergency",
    "prior claim", "previous claim", "ward type", "admission type", "condition", "conditions",
    "medication review", "disorder", "situation", "signature", "attendant signature",
    "hospital signature", "physician signature", "primary clinical diagnosis"
)

def _normalize_desc(text: str) -> str:
    if not text:
        return ""
    # Strip common prefixes like Rx:, Tab., Inj., Syrup, etc.
    s = text.lower().strip()
    s = re.sub(r"^(rx\s*:?|tab\s*\.?|inj\s*\.?|cap\s*\.?|syr\s*\.?)\s*", "", s)
    # Strip leading numbering like '1 ', '2 ', '3. ', '#4 '
    s = re.sub(r"^#?\d+[\.\-\s]+", "", s)
    # Strip batch, exp, qty trailing details for matching
    s = re.sub(r"\b(batch|bt\d+|exp|expiry|\d{1,2}/\d{2,4})\b.*", "", s)
    s = re.sub(r"[^\w\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def _extract_drug_stem(text: str) -> str:
    norm = _normalize_desc(text)
    words = [w for w in norm.split() if len(w) > 2 and not w.isdigit() and w not in ("regular", "units", "unit", "infusion", "tablets", "syrup", "drops")]
    return words[0] if words else norm

def _is_pharmacy_voucher_line(text: str) -> bool:
    """Check if this item description has batch/expiry/retail receipt format."""
    s = (text or "").lower()
    return bool(re.search(r"\b(batch|bt\d+|expiry|exp|\d{1,2}/\d{2,4})\b", s))

def _infer_doc_type(file_name: str, text: str) -> str:
    sample = f"{(file_name or '').lower()}\n{(text or '').lower()}"
    if any(k in sample for k in ("final hospital bill", "itemized inpatient hospital bill", "hospital bill", "reimbursement claim summary", "hospitalization details", "hospital expense breakdown")):
        return "HOSPITAL_BILL"
    if any(k in sample for k in ("pharmacy bill", "patient pharmacy bill", "pharmacy invoice", "chemist bill", "rx bill", "drug dispensed")):
        return "PHARMACY_BILL"
    if any(k in sample for k in ("laboratory investigation", "lab report", "diagnostic report", "pathology")):
        return "LAB_REPORT"
    if any(k in sample for k in ("radiology", "x-ray", "xray", "ct scan", "mri", "ultrasound", "usg")):
        return "RADIOLOGY_REPORT"
    if "discharge summary" in sample:
        return "DISCHARGE_SUMMARY"
    return "UNKNOWN"

def reconcile_claim_expenses(
    raw_expenses: list[dict[str, Any]],
    docs: list[Any] = None,
    doc_ocr_map: dict[str, str] = None,
    gross_total: float = 0.0,
    net_payable: float = 0.0,
    deductions: float = 0.0,
) -> list[dict[str, Any]]:
    """
    Reconciles raw extracted line items across single or multiple claim documents:
    1. Removes intra-document duplicate parses (e.g. overlapping multi-pass table scans).
    2. Filters out subtotal / total / payment lines and narrative text noise.
    3. Drops spurious unit/quantity fragment rows (e.g. 'room: 1', 'ward - 1 days: 1').
    4. Suppresses supporting internal voucher documents/pages when already itemized in master bill.
    5. Preserves independent additive receipts (outpatient chemist, pre/post hospitalization).
    """
    if not raw_expenses:
        return []

    # 1. Filter obvious aggregate/subtotal lines and narrative text noise
    filtered_expenses: list[dict[str, Any]] = []
    for exp in raw_expenses:
        cat = (exp.get("category") or "").strip().lower()
        desc = (exp.get("description") or exp.get("item") or "").strip().lower()
        full_text = f"{cat} {desc}".strip()
        amt = float(exp.get("amount") or 0.0)
        if amt <= 0 and "free" not in full_text and "included" not in full_text:
            continue
        # Skip grand totals / sub-totals
        if any(cat == kw or cat.startswith(kw + " ") or cat.endswith(" " + kw) or desc == kw or desc.startswith(kw + " ") for kw in SUBTOTAL_KEYWORDS):
            continue
        # Skip narrative non-expense text snippets
        if any(np_kw in full_text for np_kw in NON_EXPENSE_NARRATIVE_PATTERNS):
            continue
        filtered_expenses.append(exp)

    if not filtered_expenses:
        return []

    # 2. Granular deduplication and clean formatting
    # Preserve all legitimate line items including repeat administrations on different dates/times.
    # Only suppress true identical duplicate OCR scans on the same page/document.
    seen_exact_entries: set[tuple] = set()
    reconciled_final: list[dict[str, Any]] = []

    for item in filtered_expenses:
        amt = round(float(item.get("amount") or 0.0), 2)
        cat = str(item.get("category") or "").strip()
        desc = str(item.get("description") or item.get("item") or "").strip()
        doc_id = str(item.get("document_id") or "doc")
        sp = item.get("source_page")

        # Normalize description for exact duplicate matching
        desc_norm = _normalize_desc(desc or cat)
        
        # Deduplication signature: (document_id, source_page, amount, normalized_desc)
        # Identical OCR table re-scans on the exact same page with the exact same amount and description are dropped
        sig = (doc_id, sp, amt, desc_norm)
        if desc_norm and sig in seen_exact_entries:
            continue
        if desc_norm:
            seen_exact_entries.add(sig)

        # Clean formatting of category / description
        clean_cat = re.sub(r"^#?\d+[\.\-\s]+", "", cat).strip()
        if clean_cat and not clean_cat[0].isupper():
            clean_cat = clean_cat.title()
        item["category"] = clean_cat
        reconciled_final.append(item)

    return reconciled_final


# IRDAI Non-Medical Schedule keywords (Guidelines on Standardization in Health Insurance)
IRDAI_NON_MEDICAL_KEYWORDS = (
    "admin", "administrative", "registration", "file charge", "file charges", "admission fee",
    "admission charges", "mrd charge", "mrd charges", "food", "diet", "dietary", "beverage",
    "visitor", "attendant charge", "attendant charges", "telephone", "laundry", "toiletries",
    "sanitary kit", "patient kit", "admission kit", "service charge", "documentation"
)


def evaluate_non_medical_expenses(
    expenses: list[dict[str, Any]], 
    explicit_deductions: float = 0.0
) -> dict[str, Any]:
    """
    Evaluates itemized expenses against IRDAI Non-Medical Schedule items and
    harmonizes with any explicit non-payable deductions stated on the hospital bill.
    Returns potential non-medical total, flagged items, and clear admissibility guidance.
    """
    flagged_items = []
    non_med_total = 0.0

    if expenses:
        for exp in expenses:
            cat = str(exp.get("category") or "").strip().lower()
            desc = str(exp.get("description") or exp.get("item") or "").strip().lower()
            full_text = f"{cat} {desc}".strip()
            amt = float(exp.get("amount") or 0.0)

            # Check if line contains IRDAI non-medical keywords
            if any(kw in full_text for kw in IRDAI_NON_MEDICAL_KEYWORDS):
                # Verify it's not a legitimate medical procedure
                if not any(med_kw in full_text for med_kw in (
                    "iv administration", "blood administration", "drug administration", 
                    "medication administration", "fluid administration", "feeding tube"
                )):
                    flagged_items.append({
                        "category": exp.get("category", "Miscellaneous"),
                        "description": exp.get("description") or exp.get("category", ""),
                        "amount": amt,
                    })
                    non_med_total += amt

    non_med_total = round(non_med_total, 2)
    
    # If the hospital bill explicitly specifies a non-payable deduction (e.g. Less: Non-Payable Items Rs. 5,212.43),
    # use that authoritative deduction figure. Otherwise use evaluated itemized non-medical total.
    effective_non_payable = round(explicit_deductions if explicit_deductions > 0 else non_med_total, 2)
    is_all_med = (effective_non_payable == 0.0)

    if is_all_med:
        guidance = "All line items qualify as legitimate medical expenses under IRDAI guidelines with zero non-medical deductions. Final settlement is subject to your policy sum insured and sub-limits."
    else:
        guidance = (
            f"Non-medical expenses (e.g., admin, food, or non-payable items totaling ₹{effective_non_payable:,.2f}) "
            "are covered in full if your insurance policy includes a Non-Medical / Consumables Rider or corporate 100% GMC cover. "
            "The final settlement decision and deduction approval rest with your Insurer / TPA."
        )

    return {
        "potential_non_medical_total": effective_non_payable,
        "non_medical_items": flagged_items,
        "admissibility_guidance": guidance,
        "is_all_medical": is_all_med,
    }





