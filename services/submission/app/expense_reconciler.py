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
    "relation to insured", "member id", "policy number", "group number", "sum insured"
)

def _normalize_desc(text: str) -> str:
    if not text:
        return ""
    # Strip common prefixes like Rx:, Tab., Inj., Syrup, etc.
    s = text.lower().strip()
    s = re.sub(r"^(rx\s*:?|tab\s*\.?|inj\s*\.?|cap\s*\.?|syr\s*\.?)\s*", "", s)
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
    if any(k in sample for k in ("final hospital bill", "itemized inpatient hospital bill", "hospital bill", "reimbursement claim summary", "hospitalization details")):
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
    3. Identifies supporting pharmacy voucher tables/pages vs master hospital bill tables.
    4. Suppresses supporting internal voucher documents/pages when already itemized in master bill.
    5. Preserves independent additive receipts (outpatient chemist, pre/post hospitalization).
    """
    if not raw_expenses:
        return []

    # 1. Filter obvious aggregate/subtotal lines and narrative text noise
    filtered_expenses: list[dict[str, Any]] = []
    for exp in raw_expenses:
        cat = (exp.get("category") or "").strip().lower()
        amt = float(exp.get("amount") or 0.0)
        if amt <= 0 and "free" not in cat and "included" not in cat:
            continue
        # Skip grand totals / sub-totals
        if any(cat == kw or cat.startswith(kw + " ") or cat.endswith(" " + kw) for kw in SUBTOTAL_KEYWORDS):
            continue
        # Skip narrative non-expense text snippets
        if any(np_kw in cat for np_kw in NON_EXPENSE_NARRATIVE_PATTERNS):
            continue
        filtered_expenses.append(exp)

    if not filtered_expenses:
        return []

    # 2. Group expenses by (document_id, source_page) to isolate distinct tables/pages
    page_to_expenses: dict[tuple[str, Any], list[dict[str, Any]]] = {}
    for exp in filtered_expenses:
        key = (exp.get("document_id") or "unknown", exp.get("source_page"))
        page_to_expenses.setdefault(key, []).append(exp)

    # 3. Clean intra-page duplicates within each page table
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
        cleaned_by_page[pkey] = unique_items

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

    return reconciled_final



