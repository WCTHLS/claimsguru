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
    docs: list[Any],
    doc_ocr_map: dict[str, str],
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

    # 2. Group expenses by (document_id, source_page) to isolate distinct tables/pages
    page_to_expenses: dict[tuple[str, Any], list[dict[str, Any]]] = {}
    for exp in filtered_expenses:
        key = (exp.get("document_id") or "unknown", exp.get("source_page"))
        page_to_expenses.setdefault(key, []).append(exp)

    # 3. Clean intra-page duplicates & filter table fragments within each page
    cleaned_by_page: dict[tuple[str, Any], list[dict[str, Any]]] = {}
    for pkey, exp_list in page_to_expenses.items():
        unique_items: list[dict[str, Any]] = []
        for item in exp_list:
            amt = round(float(item.get("amount") or 0.0), 2)
            desc_norm = _normalize_desc(item.get("category") or "")
            
            is_dup = False
            words_curr = set(w for w in desc_norm.split() if w not in ("qty", "rate", "unit", "units", "rs", "inr") and not w.isdigit())
            for prev in unique_items:
                prev_amt = round(float(prev.get("amount") or 0.0), 2)
                prev_desc_norm = _normalize_desc(prev.get("category") or "")
                words_prev = set(w for w in prev_desc_norm.split() if w not in ("qty", "rate", "unit", "units", "rs", "inr") and not w.isdigit())
                
                # Exact same amount and text overlap (substring or substantial token overlap)
                same_amount = abs(amt - prev_amt) < 0.05
                has_text_overlap = (
                    desc_norm in prev_desc_norm or prev_desc_norm in desc_norm or
                    (len(words_curr & words_prev) >= 2) or
                    (len(words_curr) > 0 and len(words_prev) > 0 and (words_curr.issubset(words_prev) or words_prev.issubset(words_curr)))
                )
                if same_amount and has_text_overlap:
                    is_dup = True
                    if len(item.get("category", "")) > len(prev.get("category", "")):
                        prev["category"] = item["category"]
                    break
            if not is_dup:
                unique_items.append(item)

        # Drop spurious column fragment rows (e.g., 'care - 1 days: 1', 'room: 1', 'nursing: 1', 'ward - 1 days: 1', 'charges general: 1')
        # when a full legitimate expense row on the same page already covers the description
        legit_rows = [it for it in unique_items if float(it.get("amount") or 0.0) > 10.0]
        final_page_items: list[dict[str, Any]] = []
        for it in unique_items:
            amt = round(float(it.get("amount") or 0.0), 2)
            desc_norm = _normalize_desc(it.get("category") or "")
            if amt <= 10.0 and legit_rows:
                desc_words = set(desc_norm.split())
                is_fragment = False
                for lr in legit_rows:
                    lr_desc_norm = _normalize_desc(lr.get("category") or "")
                    lr_words = set(lr_desc_norm.split())
                    if desc_norm in lr_desc_norm or (desc_words and desc_words.issubset(lr_words) and len(desc_words) <= 3):
                        is_fragment = True
                        break
                if is_fragment:
                    logger.info("[EXPENSE_RECONCILER] Dropped table fragment row: %s (Rs. %s)", it.get("category"), amt)
                    continue
            final_page_items.append(it)
        cleaned_by_page[pkey] = final_page_items

    # 4. Identify Master Bill Page(s) vs Supporting Voucher Page(s)
    # Master bill pages contain broader clinical line items (Room, Nursing, Lab, Rx)
    # Voucher pages are composed almost entirely of items with batch/expiry numbers or pharmacy lines
    master_pages: list[tuple[str, Any]] = []
    voucher_pages: list[tuple[str, Any]] = []

    for pkey, items in cleaned_by_page.items():
        if not items:
            continue
        voucher_count = sum(1 for it in items if _is_pharmacy_voucher_line(it.get("category") or ""))
        # If majority of items on this page have batch/expiry formats, it is a supporting pharmacy voucher page
        if len(items) >= 2 and (voucher_count / len(items)) >= 0.5:
            voucher_pages.append(pkey)
        else:
            master_pages.append(pkey)

    # If we identified master page(s) and voucher page(s), check if voucher page lines overlap with master page
    final_items: list[dict[str, Any]] = []
    if master_pages and voucher_pages:
        master_items: list[dict[str, Any]] = []
        for mp in master_pages:
            master_items.extend(cleaned_by_page[mp])

        master_stems = set()
        for m in master_items:
            stem = _extract_drug_stem(m.get("category") or "")
            if stem:
                master_stems.add(stem)

        final_items = list(master_items)
        for vp in voucher_pages:
            vp_items = cleaned_by_page[vp]
            overlapping = sum(1 for it in vp_items if _extract_drug_stem(it.get("category") or "") in master_stems)
            if overlapping > 0 or len(vp_items) == sum(1 for it in vp_items if _is_pharmacy_voucher_line(it.get("category") or "")):
                logger.info("[EXPENSE_RECONCILER] Suppressed supporting voucher page %s with %d rows", vp, len(vp_items))
            else:
                final_items.extend(vp_items)
    else:
        for items in cleaned_by_page.values():
            final_items.extend(items)

    # 5. Individual line-item voucher deduplication fallback
    # If any remaining items have duplicate batch/voucher format where a clinical line already exists:
    clinical_stems = set()
    for it in final_items:
        cat = it.get("category") or ""
        if not _is_pharmacy_voucher_line(cat):
            stem = _extract_drug_stem(cat)
            if stem and len(stem) >= 3:
                clinical_stems.add(stem)

    reconciled_final: list[dict[str, Any]] = []
    for it in final_items:
        cat = it.get("category") or ""
        if _is_pharmacy_voucher_line(cat):
            stem = _extract_drug_stem(cat)
            if stem in clinical_stems:
                logger.info("[EXPENSE_RECONCILER] Dropped duplicate voucher line: %s", cat[:60])
                continue
        reconciled_final.append(it)

    for it in reconciled_final:
        cat = str(it.get("category") or "").strip()
        # Clean leading digits like "1 ", "2 ", "#3 "
        cat = re.sub(r"^#?\d+[\.\-\s]+", "", cat).strip()
        if cat and not cat[0].isupper():
            cat = cat.title()
        it["category"] = cat

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





