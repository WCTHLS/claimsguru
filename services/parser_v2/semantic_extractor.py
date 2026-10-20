from __future__ import annotations

import concurrent.futures
import json
import logging
import os
import re
from collections import defaultdict
from pathlib import Path
from typing import Any, Iterable

from PIL import Image

from services.parser.app.config import settings

from .models import DocumentStructure, Region, TableRegion
from .schema_normalizer import normalize_fields, normalize_tables, _is_medical_procedure
from .semantic_backends import SemanticBackendRegistry, SemanticRequest
from .semantic_models import SemanticDocumentOutput, SemanticFieldOutput, SemanticRegionOutput, SemanticTableOutput, SemanticTableRowOutput

logger = logging.getLogger("parser-debug")


SEMANTIC_EXPENSE_TABLE_KINDS = {"expenses", "expense", "expense_table", "bill_table"}
SEMANTIC_MEDICAL_TABLE_KINDS = {"medications", "lab_results", "vitals", "diagnoses"}

_NON_EXPENSE_ROW_PREFIXES = (
    "total",
    "grand total",
    "subtotal",
    "net payable",
    "collection",
    "ip collection",
    "lab collection",
    "cash collection",
    "patient paid",
    "paid amount",
    "due amount",
    "balance due",
    "total claimed",
    "amount claimed",
    "claim amount",
    "claim requested",
    "requested amount",
    "procedure code",
    "diagnosis code",
    "code",
)

_NON_EXPENSE_ROW_KEYWORDS = {
    "deposit",
    "deposits",
    "payment",
    "collection",
    "ip collection",
    "lab collection",
    "cash collection",
    "patient paid",
    "paid amount",
    "due amount",
    "balance due",
    "advance",
    "refund",
    "claim",
    "claims",
    "policy",
    "payer",
    "premium",
    "deductible",
    "risk factor",
    "member id",
    "policy number",
    "insurance",
    "sum insured",
    "previous claims",
    "previous claim",
    "claim vs sum insured",
    "amount exceeding policy",
    "icd-10",
    "snomed",
    "cpt:",
    "cpt code",
    "procedure 1",
    "procedure 2",
    "procedure 3",
    "procedure 4",
    "diagnosis count",
    "ward type",
    "admission type",
    "policy status",
    "active prescriptions",
    "documented conditions",
    "patient name",
    "age/gender",
    "admission date",
    "discharge date",
    "consultant name",
    "consultant doctor name",
    "consultant in-charge",
    "uhid",
    "hospital name",
    "hospital address",
    "hospital registration",
    "diagnosis",
    "code",
    "claim(s)",
    "hereby declare",
    "attendant signature",
    "patient signature",
    "doctor signature",
    "hospital signature",
    "physician signature",
    "signature",
    "declaration",
    "somajiguda",
    "yashoda",
    "hyderabad",
    "tel:",
    "claim submitted",
    "paramount health",
    "emergency surgery",
    "emergency pci",
    "risk factor",
    "high risk",
    "previous claims",
    "claims in last",
    "acute cardiac event",
    "medically necessary",
    "life-saving",
    "suresh reddy",
    "ramesh kumar",
    "condition",
    "conditions",
    "condition(s)",
    "medication review",
    "disorder",
    "situation",
}


def _join_region_text(tokens: Iterable[Any]) -> str:
    parts = []
    for token in tokens:
        text = getattr(token, "text", None) if not isinstance(token, dict) else token.get("text")
        if text and str(text).strip():
            parts.append(str(text).strip())
    return " ".join(parts).strip()


def _token_payloads(tokens: Iterable[Any]) -> list[dict[str, Any]]:
    payloads: list[dict[str, Any]] = []
    for token in tokens:
        if isinstance(token, dict):
            payloads.append({
                "text": token.get("text", ""),
                "x0": float(token.get("x0", 0.0)),
                "y0": float(token.get("y0", 0.0)),
                "x1": float(token.get("x1", 0.0)),
                "y1": float(token.get("y1", 0.0)),
                "page": int(token.get("page", 1)),
                "document_id": token.get("document_id"),
                "claim_id": token.get("claim_id"),
            })
        else:
            payloads.append({
                "text": getattr(token, "text", ""),
                "x0": float(getattr(token, "x0", 0.0)),
                "y0": float(getattr(token, "y0", 0.0)),
                "x1": float(getattr(token, "x1", 0.0)),
                "y1": float(getattr(token, "y1", 0.0)),
                "page": int(getattr(token, "page", 1)),
                "document_id": getattr(token, "document_id", None),
                "claim_id": getattr(token, "claim_id", None),
            })
    return payloads


def _crop_region_image(page_image: Image.Image | None, bbox: list[float] | None) -> Image.Image | None:
    if page_image is None or not bbox or len(bbox) != 4:
        return None

    left, top, right, bottom = bbox
    left = max(0, int(left) - 8)
    top = max(0, int(top) - 8)
    right = min(page_image.width, int(right) + 8)
    bottom = min(page_image.height, int(bottom) + 8)
    if right <= left or bottom <= top:
        return None
    return page_image.crop((left, top, right, bottom))


def _row_cells_payload(table: TableRegion) -> list[list[dict[str, Any]]]:
    payload: list[list[dict[str, Any]]] = []
    for row in table.rows:
        row_payload = []
        for cell in row.cells:
            row_payload.append({
                "text": cell.text,
                "bbox": cell.bbox,
                "tokens": [token.model_dump() if hasattr(token, "model_dump") else token for token in (cell.tokens or [])],
                "column_id": cell.column_id,
                "row_id": cell.row_id,
                "cell_id": cell.cell_id,
                "token_count": cell.token_count,
            })
        payload.append(row_payload)
    return payload


def _table_text_payload(table: TableRegion) -> str:
    parts: list[str] = []
    for row in table.rows:
        for cell in row.cells:
            text = (cell.text or "").strip()
            if text:
                parts.append(text)
    return " ".join(parts).strip()


def _table_tokens_payload(table: TableRegion) -> list[dict[str, Any]]:
    tokens: list[dict[str, Any]] = []
    for row in table.rows:
        for cell in row.cells:
            for token in cell.tokens or []:
                if hasattr(token, "model_dump"):
                    tokens.append(token.model_dump())
                elif isinstance(token, dict):
                    tokens.append(token)
    return tokens


def _table_to_semantic_rows(table: SemanticTableOutput) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for row in table.rows:
        row_data = dict(row.cells or {})
        row_data["row_index"] = row.row_index
        row_data["confidence"] = row.confidence
        rows.append(row_data)
    return rows


def _table_to_expenses(table: SemanticTableOutput, source_page: int | None) -> list[dict[str, Any]]:
    """Convert LLM-extracted expense table to standardized expense items.
    
    The LLM now returns pre-standardized expense rows with:
    - category: Expense category (ICU, Room, Surgery, Pharmacy, etc.)
    - description: Full description of the expense
    - amount: Numeric amount (already calculated and deduplicated by LLM)
    
    This function just validates and formats the data for the report.
    """
    expenses: list[dict[str, Any]] = []
    
    # Skip non-expense tables
    if table.table_kind not in SEMANTIC_EXPENSE_TABLE_KINDS:
        return expenses
    
    # Track seen expenses to avoid duplicates without collapsing distinct line items
    # that happen to share the same category or amount.
    seen_expense_keys = set()
    
    for row in table.rows:
        cells = row.cells or {}
        
        # Extract standardized fields from LLM
        category = str(cells.get("category") or table.table_kind or "Miscellaneous").strip()
        description = str(cells.get("description") or cells.get("desc") or cells.get("item") or "").strip()
        amount = cells.get("amount")
        normalized_description = description.lower().strip()
        normalized_category = category.lower().strip()

        is_bad_prefix = False
        if not description:
            is_bad_prefix = True
        else:
            for prefix in _NON_EXPENSE_ROW_PREFIXES:
                if prefix == "total":
                    if (normalized_description.startswith("total") or "total" in normalized_description) and not _is_medical_procedure(normalized_description):
                        is_bad_prefix = True
                        break
                else:
                    if normalized_description.startswith(prefix) or prefix in normalized_description:
                        is_bad_prefix = True
                        break
        if is_bad_prefix:
            logger.debug(f"[EXPENSE_FILTER] Skipping summary/label row: {category} - {description}")
            continue

        if any(keyword in normalized_category or keyword in normalized_description for keyword in _NON_EXPENSE_ROW_KEYWORDS):
            logger.debug(f"[EXPENSE_FILTER] Skipping non-expense row: {category} - {description}")
            continue

        # Reject 6-digit pincodes in description or category (e.g. Somajiguda pincode 500082)
        if re.search(r"\b\d{6}\b", normalized_description) or re.search(r"\b\d{6}\b", normalized_category):
            logger.info(f"[EXPENSE_FILTER] Skipping pincode/metadata row: {category} - {description}")
            continue

        # Safety net: descriptions longer than 300 chars are almost certainly
        # garbage-concatenated declaration/footer blocks from the LLM where
        # multiple rows were merged into a single cell.
        if len(description) > 300:
            logger.info(
                "[EXPENSE_FILTER] Skipping oversized description row (%d chars): %s...",
                len(description), description[:80],
            )
            continue
        
        if not amount or not description:
            continue
        
        amount_text = str(amount).strip()
        
        # Parse amount - LLM should already provide clean numeric values
        # But handle cases where there might still be currency symbols
        try:
            # Remove common currency symbols and commas
            cleaned = amount_text.replace("Rs.", "").replace("₹", "").replace(",", "").strip()
            amount_numeric = float(cleaned)
        except (ValueError, AttributeError):
            continue
        
        if amount_numeric <= 0:
            continue
        
        # Deduplicate on description + amount so we keep separate services
        # even if the semantic model assigns the same category to both.
        expense_key = (category.lower(), description.lower(), amount_numeric)
        if expense_key in seen_expense_keys:
            logger.debug(f"[EXPENSE_DEDUP] Skipping duplicate: {description} - Rs. {amount_numeric}")
            continue
        seen_expense_keys.add(expense_key)
        
        # Standardized expense format for report
        expenses.append({
            "description": description,
            "amount": str(amount_numeric),  # Keep as string for JSON consistency
            "category": category,
            "page": source_page,
            "source_region_id": table.source_region_id,
            "source_region_type": table.source_region_type,
            "model_name": table.model_name,
            "confidence": row.confidence or table.confidence,
        })
        
        logger.info(f"[EXPENSE] {category}: {description} - Rs. {amount_numeric}")
    
    return expenses


def _is_expense_like_table_payload(table: TableRegion) -> bool:
    if _is_medications_table(table) or _is_lab_results_table(table) or _is_vitals_table(table):
        return False
    rows = list(getattr(table, "rows", []) or [])
    if len(rows) < 2:
        return False

    table_text = " ".join(str(cell.text or "") for row in rows for cell in row.cells).lower()
    # If table contains bank details or cheque terms, skip
    if any(b_kw in table_text for b_kw in ["ifsc", "account number", "account no", "branch name", "micr code", "cancelled cheque"]):
        return False

    def _looks_monetary(text: str) -> bool:
        s = str(text or "").strip().lower()
        if not s:
            return False
        s = s.replace("₹", "").replace("rs.", "").replace("rs", "").replace("inr", "")
        s = s.replace(",", "").replace(" ", "")
        if s.startswith("(") and s.endswith(")"):
            s = "-" + s[1:-1]
        # Match standard monetary amounts like 1200.00, 342.00, 42269.03 or pure numbers > 0
        return bool(re.fullmatch(r"-?\d+\.\d{2}", s)) or (bool(re.fullmatch(r"-?\d+", s)) and len(s) >= 2)

    # Billing header keywords
    has_billing_header = False
    billing_header_kws = ["gross", "payable", "rate", "mrp", "amount", "charges", "particulars", "qty", "item description", "unit price"]
    for candidate_row in rows[:5]:
        candidate_text = " ".join((cell.text or "") for cell in candidate_row.cells).lower()
        if sum(1 for kw in billing_header_kws if kw in candidate_text) >= 2:
            has_billing_header = True
            break

    # Count rows with genuine monetary amounts
    monetary_row_count = 0
    data_rows = rows[1:] if len(rows) > 1 else rows
    for row in data_rows:
        cells = [c for c in row.cells if str(c.text or "").strip()]
        if any(_looks_monetary(c.text) for c in cells):
            monetary_row_count += 1

    monetary_ratio = monetary_row_count / max(1, len(data_rows))
    has_currency_marker = "₹" in table_text or "rs." in table_text or "inr" in table_text or "gross" in table_text or "payable" in table_text

    # Medical billing concepts & continuation indicators
    clinical_billing_kws = [
        "anesthesia", "anaesthesia", "blood", "oxygen", "operation theater", "ot charges",
        "surgical", "medicines", "drugs", "pharmacy", "investigation", "radiology", "pathology",
        "consultation", "room rent", "nursing", "icu", "bed charges", "procedure charges",
        "lab charges", "implant", "dialysis", "chemotherapy", "physiotherapy", "duty doctor",
        "ward charges", "admission charges", "doctor charges", "practitioner charges",
        "surgeon charges", "anesthetist charges", "specialist charges", "injection charges",
        "iv fluids", "transfusion", "diagnostic materials"
    ]
    has_clinical_billing_terms = any(kw in table_text for kw in clinical_billing_kws)
    
    # Summary or footer billing keywords (e.g. "grand total", "total of other expenses", "patient paid", "balance amount")
    summary_billing_kws = [
        "grand total", "net payable", "total amount", "amount in rs", "total of other",
        "patient paid", "balance amount", "sub total", "subtotal", "bill amount", "total bill"
    ]
    has_summary_billing = any(kw in table_text for kw in summary_billing_kws)

    is_continuation_expense_table = (has_clinical_billing_terms or has_summary_billing) and monetary_row_count >= 2

    return (
        (has_billing_header and monetary_ratio >= 0.25)
        or (has_currency_marker and monetary_row_count >= 2)
        or is_continuation_expense_table
        or (has_clinical_billing_terms and monetary_row_count >= 1 and monetary_ratio >= 0.20)
    )


def _is_vertical_layout_table(table: TableRegion) -> bool:
    """Detect single-column vertical receipt layouts that get scrambled by LLM grid parsing."""
    columns = getattr(table, "columns", []) or []
    rows = getattr(table, "rows", []) or []
    col_count = len(columns)
    row_count = len(rows)

    # Vertical layout indicator 1: many columns but very few logical rows
    # A real multi-column table with 5+ cols would normally have many rows, not 2-8
    if col_count >= 5 and row_count <= 8:
        # Verify by checking column token density
        col_token_counts = {}
        for i, c in enumerate(columns):
            col_id = c.get("column_id", f"col_{i}") if isinstance(c, dict) else getattr(c, "column_id", f"col_{i}")
            tok_cnt = c.get("token_count", 0) if isinstance(c, dict) else getattr(c, "token_count", 0)
            col_token_counts[col_id] = tok_cnt
            
        total_tokens = sum(col_token_counts.values())
        if total_tokens > 0:
            sorted_cols = sorted(col_token_counts.values(), reverse=True)
            top2_tokens = sum(sorted_cols[:2])
            concentration_ratio = top2_tokens / max(1, total_tokens)
            if concentration_ratio >= 0.70:
                logger.info(
                    "[VERTICAL_LAYOUT] Detected vertical receipt: col_count=%d row_count=%d concentration=%.2f",
                    col_count, row_count, concentration_ratio,
                )
                return True
            else:
                logger.info(
                    "[VERTICAL_LAYOUT] Potential vertical layout table layout: col_count=%d row_count=%d concentration=%.2f",
                    col_count, row_count, concentration_ratio,
                )
                return True

    # Vertical layout indicator 2: cells contain concatenated multi-line descriptions
    # indicating multiple separate items were merged into a single grid cell
    for row in rows:
        for cell in row.cells:
            cell_text = str(cell.text or "").strip()
            # If a single cell contains 3+ distinct line-items (repeated patterns),
            # the table is likely a vertical list collapsed into one cell
            repeated_patterns = len(re.findall(
                r"\b(?:private charges|nursing charges|duty doctor|doctor fees|operation theatre|spinal anaesthesia|room charges|consultation|pharmacy|medicine|inj|tablet|ward|fees?|charges?)\b",
                cell_text, re.IGNORECASE
            ))
            if repeated_patterns >= 3:
                logger.info(
                    "[VERTICAL_LAYOUT] Cell contains %d repeated item patterns — vertical receipt detected",
                    repeated_patterns,
                )
                return True

    return False


def _fallback_semantic_expense_table(table: TableRegion, source_region_type: str, model_name: str) -> SemanticTableOutput | None:
    # Bridge path when backend returns empty/invalid output for a table that is
    # clearly expense-like: convert normalized table rows to semantic row schema.
    fallback_rows = normalize_tables([table]) or []
    if not fallback_rows:
        return None

    semantic_rows: list[SemanticTableRowOutput] = []
    for idx, row in enumerate(fallback_rows):
        description = str(row.get("field_name") or row.get("description") or "").strip()
        amount = row.get("payable_amount") or row.get("amount")
        if not description or amount in {None, ""}:
            continue
        semantic_rows.append(
            SemanticTableRowOutput(
                row_index=idx,
                cells={
                    "category": str(row.get("category") or "Miscellaneous").strip(),
                    "description": description,
                    "amount": str(amount).strip(),
                },
                confidence=0.55,
            )
        )

    if not semantic_rows:
        return None

    return SemanticTableOutput(
        table_kind="expenses",
        confidence=0.55,
        source_region_id=table.region_id,
        source_region_type=source_region_type,
        source_tokens=_table_tokens_payload(table),
        headers=["category", "description", "amount"],
        rows=semantic_rows,
        model_name=model_name,
        metadata={"source": "expense_fallback_bridge"},
    )


def _is_patient_form_table(table: TableRegion) -> bool:
    """Detect if a table is actually a patient information form, not an expense/medical data table.

    Patient forms typically have:
    - Rows with label:value pairs (Patient:, Age/Sex:, DOA:, DOD:, etc.)
    - First column contains form labels, second column contains values
    - First cell often contains keywords like "Patient", "DOB", "Gender", "Address", "Policy", etc.

    NOTE: Form check runs BEFORE expense-like check so patient admission forms
    (which may contain numeric data) are never promoted to LLM expense analysis.
    """
    if not table.rows or len(table.rows) < 2:
        return False

    # Substring-based patient form keyword detection (catches multi-word labels)
    PATIENT_FORM_KEYWORDS = [
        "patient",
        "date of birth",
        "dob",
        "gender",
        "sex",
        "age",
        "address",
        "phone",
        "email",
        "admission",
        "discharge",
        "doa",
        "dod",
        "ward",
        "los",
        "consultant",
        "doctor",
        "hospital",
        "insurance",
        "policy",
        "member id",
        "uhid",
        "ip no",
        "ipd no",
        "reg. no",
        "registration no",
    ]

    form_keyword_count = 0
    for row in table.rows[:5]:  # Check first 5 rows
        row_text = " ".join((c.text or "") for c in row.cells).strip().lower()
        # If the row has billing indicators (charges, fees, rs, inr, amount, qty, rate, price) without a colon,
        # skip counting it towards form keywords. This ensures actual billing lines do not trigger form classification.
        billing_indicators = ["charges", "fees", "rs", "inr", "amount", "qty", "rate", "price"]
        if any(ind in row_text for ind in billing_indicators) and ":" not in row_text:
            continue

        for cell in row.cells:
            text = (cell.text or "").strip().lower()
            if not text:
                continue
            # Use substring matching so "ip no. 1234" and "uhid: XYZ" are detected
            if any(keyword in text for keyword in PATIENT_FORM_KEYWORDS):
                form_keyword_count += 1
                break  # Only count at most one form keyword per row

    # If 3+ form keywords found in first 5 rows, it's likely a patient form
    if form_keyword_count >= 3:
        if _is_expense_like_table_payload(table):
            logger.info(
                "[TABLE_FILTER] Table region_id=%s has %d form keywords but is also verified as expense-like: not skipping",
                table.region_id, form_keyword_count,
            )
            return False
        logger.info(
            "[TABLE_FILTER] Skipping patient form table (region_id=%s): found %d form keywords",
            table.region_id, form_keyword_count,
        )
        return True

    return False


def _is_medications_table(table: TableRegion) -> bool:
    """Detect if a table is actually a medications / discharge treatment table instead of an expense table."""
    rows = list(getattr(table, "rows", []) or [])
    if not rows:
        return False
        
    table_text = " ".join(str(cell.text or "") for row in rows for cell in row.cells).lower()
    
    import re
    
    # Safeguard: if the table has billing/pricing terms (including pharmacy bill headers like PaidAmt, DueAmt, BillDate, Billno)
    # AND price/amount numbers, it is an itemised pharmacy BILL/INVOICE, not a clinical prescription log!
    pharmacy_billing_indicators = [
        "paidamt", "dueamt", "netamt", "totalamt", "billdate", "billno", "batchno", "expdate",
        "paid amt", "due amt", "net amt", "total amt", "bill date", "bill no", "batch no", "exp date",
        "gross", "payable", "rate", "inr", "amount", "price", "bill", "invoice", "receipt", "charge", "charges", "total"
    ]
    has_billing_terms = any(ind in table_text for ind in pharmacy_billing_indicators) or ("₹" in table_text) or bool(re.search(r"\brs\b\.?", table_text))
            
    has_prices = False
    for row in rows:
        for cell in row.cells:
            text = str(cell.text or "").strip().replace(",", "")
            cleaned = re.sub(r"^(?:rs|inr|₹)\.?\s*", "", text, flags=re.IGNORECASE).strip()
            if re.fullmatch(r"-?\d+\.\d{2}", cleaned) or (cleaned.isdigit() and len(cleaned) >= 2):
                has_prices = True
                break
        if has_prices:
            break
            
    if has_billing_terms and has_prices:
        return False

    # Check if the table has common medication/prescription column headers
    med_headers = {"drug name", "drug", "medicine", "dose", "dosage", "frequency", "instruction", "instructions", "duration", "days", "qunt.", "quantity"}
    
    # Check first few rows for header names
    has_med_header = False
    for candidate_row in rows[:2]:
        row_text_cells = [str(cell.text or "").strip().lower() for cell in candidate_row.cells]
        if any(h in row_text_cells for h in ["drug name", "instruction", "dosage", "frequency"]) or (any("dose" in h for h in row_text_cells) and any("days" in h for h in row_text_cells)):
            has_med_header = True
            break
            
    # Also check if the table text contains clear discharge medication markers or inpatient administration headers
    discharge_med_markers = [
        "treatment on discharge", "treatment on dicharge", "discharge summary", 
        "discharge medications", "medications on discharge", "treatment on discharge:",
        "medications administered", "medication administered", "administered medications",
        "in-hospital medications", "medications administered (in-hospital)", "medication list",
        "medications", "discharge advice & medications"
    ]
    has_discharge_marker = any(marker in table_text for marker in discharge_med_markers)
    
    # Dynamic clinical pattern check:
    # If the table cells contain medication keywords (inj., tab., cap., etc.) AND route/strength terms (iv, po, mg, ml, bd, tds)
    # in multiple rows, it is highly likely a medications list.
    med_keyword_count = sum(1 for term in ["inj.", "tab.", "cap.", "inj ", "tab ", "cap "] if term in table_text)
    route_strength_count = sum(1 for term in [" po ", " iv ", " im ", " sc ", " bd", " tds", " od", " mg ", " ml ", " mcg "] if term in table_text)
    looks_like_clinical_log = med_keyword_count >= 2 and route_strength_count >= 2
    
    # If it has medication columns, discharge summaries treatment indicators, or looks like a clinical log
    return has_med_header or has_discharge_marker or looks_like_clinical_log


def _is_lab_results_table(table: TableRegion) -> bool:
    """Detect if a table is actually a lab results/investigations table."""
    rows = list(getattr(table, "rows", []) or [])
    if not rows:
        return False
    table_text = " ".join(str(cell.text or "") for row in rows for cell in row.cells).lower()
    
    import re
    # Safeguard: If the table contains billing columns (totalamt, paid, due, amount, rate, disc, bill no)
    # with decimal prices, it is an itemized investigation BILL, not a lab result report!
    lab_billing_terms = [
        "totalamt", "paidamt", "dueamt", "invst name", "investigation name", "paid", "due",
        "total amt", "paid amt", "due amt", "rate", "disc", "discount", "bill no", "bill date", "day total"
    ]
    if any(bt in table_text for bt in lab_billing_terms):
        has_prices = any(re.search(r"\b\d+\.\d{2}\b", str(c.text or "")) for r in rows for c in r.cells)
        if has_prices:
            return False

    lab_indicators = [
        "reference range", "ref range", "ref. range", "reference interval", "biological reference", 
        "normal range", "observed value", "flag", "subtest", "specimen", "nabl accredited", "nabl ref",
        "laboratory investigation report", "results are for clinical correlation", "verified by: dr"
    ]
    if any(indicator in table_text for indicator in lab_indicators):
        return True
    # If table mentions multiple lab test names and units/results without billing keywords
    lab_tests = ["haemoglobin", "platelets", "wbc count", "bilirubin", "sgot", "sgpt", "creatinine", "blood sugar", "pt/inr", "hbsag", "electrolytes"]
    lab_test_matches = sum(1 for test in lab_tests if test in table_text)
    if lab_test_matches >= 2 and not any(term in table_text for term in ["gross", "payable", "rate", "bill no", "mrp", "totalamt", "amount", "paid"]):
        return True
    if "units" in table_text and any(term in table_text for term in ["reference", "normal", "ref.", "biological", "observed", "patient value"]):
        return True
    return False


def _is_vitals_table(table: TableRegion) -> bool:
    """Detect if a table is actually a vital signs table."""
    rows = list(getattr(table, "rows", []) or [])
    if not rows:
        return False
    table_text = " ".join(str(cell.text or "") for row in rows for cell in row.cells).lower()
    vitals_indicators = ["spo2", "pulse rate", "respiratory rate", "blood pressure", "temperature", "systolic", "diastolic"]
    # Require at least 2 distinct vitals signs keywords to prevent misclassifying billing tables
    matches = sum(1 for indicator in vitals_indicators if indicator in table_text)
    return matches >= 2


def _is_payment_receipt_table(table: TableRegion) -> bool:
    """Detect if a table is purely a payment receipt / advance voucher / cash collection acknowledgement rather than billed hospital services."""
    rows = list(getattr(table, "rows", []) or [])
    if not rows:
        return False
    table_text = " ".join(str(cell.text or "") for row in rows for cell in row.cells).lower()

    receipt_markers = [
        "receipt no", "receipt number", "receipt date", "payment receipt", "advance receipt",
        "collection receipt", "money receipt", "received with thanks", "mode of payment",
        "payment mode", "txn id", "transaction id", "payment towards", "amount received",
        "towards ip advance", "advance payment", "paid by:", "drawn on:", "cheque no",
        "neft ref", "upi ref", "cash received", "total received"
    ]
    matches = sum(1 for marker in receipt_markers if marker in table_text)
    if matches >= 2:
        # If there are explicit hospital service breakdown lines (surgery, bed rent, nursing, ot charges), it's a bill
        clinical_bill_indicators = ["ot charges", "bed charges", "nursing charges", "surgeon fee", "icu charges", "pharmacy charges", "anaesthesia fee"]
        has_clinical_bill = any(ind in table_text for ind in clinical_bill_indicators)
        if not has_clinical_bill:
            return True
    return False


def _build_compact_page_digest(tokens: list[Any], page_num: int = 1) -> str:
    """
    Extract ONLY raw lines that contain patient demographics, hospital/doctor info,
    clinical diagnosis/summary, or billing grand totals.
    Strictly filters out lab biochemistry numbers, prescription drug dosages, and itemized billing rows.
    """
    if not tokens:
        return ""
    sorted_toks = sorted(tokens, key=lambda t: (getattr(t, "y0", 0.0), getattr(t, "x0", 0.0)))
    lines: list[list[Any]] = []
    current_line: list[Any] = []
    current_y = None
    for t in sorted_toks:
        text = str(getattr(t, "text", "")).strip()
        if not text:
            continue
        y0 = getattr(t, "y0", 0.0)
        if current_y is None:
            current_y = y0
            current_line.append(t)
        elif abs(y0 - current_y) <= 0.02 or abs(y0 - current_y) <= 12.0:
            current_line.append(t)
        else:
            if current_line:
                lines.append(current_line)
            current_line = [t]
            current_y = y0
    if current_line:
        lines.append(current_line)
    if not lines:
        return ""

    line_strings = [" ".join(str(getattr(t, "text", "")).strip() for t in line).strip() for line in lines]
    line_strings = [ls for ls in line_strings if ls]
    total_lines = len(line_strings)

    # Keywords indicating critical demographic, clinical, or billing metadata
    KEYWORD_ANCHORS = (
        "patient", "name", "age", "gender", "sex", "mrno", "ipno", "uhid", "opno", "reg",
        "hospital", "dr.", "doctor", "consultant", "physician", "surgeon",
        "admission", "discharge", "doa", "dod", "date",
        "diagnosis", "complaint", "clinical", "impression", "history", "under treatment",
        "grand total", "total billed", "net payable", "amount payable", "claimed", "rupees", "balance",
        "certificate", "emergency", "essentiality", "invoice", "bill no", "cash bill",
        "procedure", "intervention", "investigation", "course in hospital", "hospital course",
        "condition at discharge", "chief complaint", "comorbidit", "illness", "past history",
    )

    CLINICAL_SECTION_HEADERS = (
        "diagnosis", "clinical summary", "course in hospital", "hospital course",
        "impression", "complaint", "treatment", "history of present illness",
        "past medical history", "past history", "procedure", "intervention", "investigation",
        "condition at discharge", "discharge advice", "chief complaint",
    )

    # Noise patterns indicating raw biochemistry lab values or prescription drug schedules to omit
    NOISE_KEYWORDS = (
        "mg/dl", "iu/l", "cells/cum", "cumm", "g/dl", "sgot", "sgpt", "wbc", "rbc",
        "cholesterol", "lymphocyte", "eosinophil", "neutrophil", "bilirubin", "creatinine",
        "haematology", "urine analysis", "diabetic profile", "lipid profile",
        "1-0-1", "0-0-1", "1-1-1", "0-1-0", "1-0-0", "0-0-2", "5yp.", "syp."
    )

    selected_indices: set[int] = set()

    # On Page 1 or 2, take top 8 header lines unconditionally (Hospital letterhead & patient summary)
    if page_num <= 2:
        for i in range(min(8, total_lines)):
            ls_lower = line_strings[i].lower()
            if not any(nk in ls_lower for nk in NOISE_KEYWORDS):
                selected_indices.add(i)

    # On all pages, take lines matching target keywords (unless they are lab/dosage noise)
    for i in range(total_lines):
        ls_lower = line_strings[i].lower()
        if any(nk in ls_lower for nk in NOISE_KEYWORDS):
            continue
        if any(kw in ls_lower for kw in KEYWORD_ANCHORS):
            selected_indices.add(i)
            # If line introduces a diagnosis, chief complaint, clinical summary, or course, keep immediate lines
            if any(h in ls_lower for h in CLINICAL_SECTION_HEADERS):
                for j in range(1, 8):
                    if i + j < total_lines:
                        next_lower = line_strings[i + j].lower()
                        if not any(nk in next_lower for nk in NOISE_KEYWORDS):
                            selected_indices.add(i + j)

    compact_lines = [line_strings[i] for i in sorted(selected_indices)]
    return "\n".join(compact_lines)


def extract_semantics(
    doc: DocumentStructure,
    page_images: dict[int, Image.Image] | None = None,
    debug_dir: str | None = None,
    claim_id: str | None = None,
) -> SemanticDocumentOutput:
    """Run region-first semantic extraction over isolated regions and reconstructed tables."""
    import threading
    import concurrent.futures

    registry = SemanticBackendRegistry()
    backend = registry.choose()
    if backend:
        logger.info(f"[SEMANTIC_BACKEND] Selected active semantic backend: {backend.name} (Model: {getattr(backend, 'model', 'N/A')})")
    else:
        logger.warning("[SEMANTIC_BACKEND] No semantic backend available or configured! Semantic parsing will fall back to heuristic extraction.")

    if backend is None:
        logger.warning("Semantic extractor running without backend; using geometry/heuristic table flow only.")
    else:
        logger.info("Semantic extractor using backend=%s", getattr(backend, "name", backend.__class__.__name__))

    output = SemanticDocumentOutput(model_name=getattr(backend, "name", None))
    region_outputs: list[SemanticRegionOutput] = []
    semantic_fields: list[SemanticFieldOutput] = []
    classified_tables: list[SemanticTableOutput] = []
    model_predictions: list[dict[str, Any]] = []
    semantic_field_mapping: dict[str, Any] = {}
    semantic_table_mapping: dict[str, Any] = {}
    expenses: list[dict[str, Any]] = []

    region_by_id = {region.region_id: region for region in doc.regions}
    lock = threading.Lock()
    failure_state = {"consecutive_failures": 0, "short_circuit": False}

    # 1. Document-level Clinical & Patient Entity Extraction
    if backend is not None:
        try:
            page_tokens_map: dict[int, list[Any]] = defaultdict(list)
            for reg in doc.regions:
                for tok in (reg.tokens or []):
                    p = getattr(tok, "page", 1) or 1
                    page_tokens_map[p].append(tok)

            if page_tokens_map:
                doc_text_parts = []
                max_pages = min(5, len(page_tokens_map))
                for p in sorted(page_tokens_map.keys())[:max_pages]:
                    pts = page_tokens_map[p]
                    p_text = _build_compact_page_digest(pts, page_num=p)
                    if p_text:
                        doc_text_parts.append(f"--- Page {p} ---\n{p_text}")

                combined_clinical_text = "\n\n".join(doc_text_parts)
                if combined_clinical_text:
                    entities = backend.extract_document_entities(combined_clinical_text)
                    if entities and isinstance(entities, dict):
                        field_map = {
                            "patient_name": "patient_name",
                            "patient_age": "patient_age",
                            "patient_gender": "patient_gender",
                            "hospital_name": "hospital_name",
                            "doctor_name": "doctor_name",
                            "admission_date": "admission_date",
                            "discharge_date": "discharge_date",
                            "diagnosis": "diagnosis",
                            "clinical_diagnosis_summary": "clinical_diagnosis_summary",
                            "insurance_company": "insurance_company",
                            "tpa_name": "tpa_name",
                            "policy_number": "insurance_policy_number",
                            "member_id": "member_id",
                            "sum_insured": "sum_insured",
                            "policy_start_date": "policy_start_date",
                            "policy_end_date": "policy_end_date",
                            "claimed_total": "claimed_total",
                        }
                        for k, v in entities.items():
                            canon = field_map.get(k)
                            if canon and v and str(v).strip():
                                clean_v = str(v).strip()
                                # Strict zero-hallucination guard against placeholders
                                if clean_v.lower() not in {"none", "null", "n/a", "no_insurance", "no insurance", "unknown", "nil", "-", "--", "undefined"}:
                                    semantic_fields.append(SemanticFieldOutput(
                                        canonical_field=canon,
                                        value=clean_v,
                                        confidence=0.96,
                                        source_region_id="doc_header",
                                        source_region_type="clinical_summary",
                                        source_tokens=[],
                                        model_name=getattr(backend, "name", "llm"),
                                        extractor_name=getattr(backend, "name", "llm"),
                                        metadata={"source": "document_level_entity_extractor"}
                                    ))
                                    log_snippet = clean_v if len(clean_v) <= 120 else f"{clean_v[:120]}..."
                                    logger.info(f"[SEMANTIC_ENTITY] Extracted {canon}='{log_snippet}' via {getattr(backend, 'name', 'llm')}")
        except Exception as e:
            logger.warning(f"Failed document entity extraction: {e}")

    def _analyze_region(region: Region, table: TableRegion | None = None) -> None:
        if backend is None:
            with lock:
                model_predictions.append({
                    "region_id": region.region_id,
                    "page": region.page,
                    "region_type": region.region_type,
                    "model_name": None,
                    "available": False,
                    "reason": "No semantic backend available",
                })
            return

        # Privacy boundary: only expense-style table regions or text blocks
        # containing itemized billing/expense data are sent to the LLM.
        is_expense_text = False
        if table is None:
            lower_text = (region.text or "").lower()
            billing_kws = ["patient bill", "invoice", "receipt", "particulars", "amount (rs.)", "total", "charges", "duty doctor", "ward charges"]
            matches = sum(1 for kw in billing_kws if kw in lower_text)
            if matches >= 2:
                is_expense_text = True
                logger.info("[SEMANTIC_PROMOTE] Promoted plain text region_id=%s to expense_table for LLM analysis", region.region_id)
            else:
                return

        page_image = page_images.get(region.page) if page_images else None
        crop = _crop_region_image(page_image, region.bbox)
        is_vertical = _is_vertical_layout_table(table) if table else False
        if is_vertical and table:
            table_tokens = []
            for r_row in table.rows:
                for r_cell in r_row.cells:
                    table_tokens.extend(r_cell.tokens or [])
            seen_tokens = set()
            unique_tokens = []
            for tok in table_tokens:
                tok_id = id(tok)
                if tok_id not in seen_tokens:
                    seen_tokens.add(tok_id)
                    unique_tokens.append(tok)
            if unique_tokens:
                unique_tokens.sort(key=lambda t: (t.y0, t.x0))
                lines = []
                current_line = []
                current_y_center = None
                for tok in unique_tokens:
                    y_center = (tok.y0 + tok.y1) / 2.0
                    if current_y_center is None:
                        current_line.append(tok)
                        current_y_center = y_center
                    elif abs(y_center - current_y_center) < 8.0:
                        current_line.append(tok)
                    else:
                        current_line.sort(key=lambda t: t.x0)
                        lines.append(" ".join(t.text for t in current_line))
                        current_line = [tok]
                        current_y_center = y_center
                if current_line:
                    current_line.sort(key=lambda t: t.x0)
                    lines.append(" ".join(t.text for t in current_line))
                region_text = "\n".join(lines).strip()
            else:
                region_text = _table_text_payload(table)
        else:
            region_text = _table_text_payload(table) if table else (region.text or "")

        region_tokens = _table_tokens_payload(table) if table else _token_payloads(region.tokens)
        table_kind_hint = str(getattr(table, "table_kind", "") or "").lower() if table else "expenses"
        request_region_type = (
            "expense_table"
            if (table and (table_kind_hint in SEMANTIC_EXPENSE_TABLE_KINDS or _is_expense_like_table_payload(table))) or is_expense_text
            else region.region_type
        )
        request = SemanticRequest(
            region_id=region.region_id,
            region_type=request_region_type,
            page=region.page,
            document_id=region.document_id,
            claim_id=region.claim_id or claim_id,
            text=region_text,
            tokens=region_tokens,
            table_cells=None if (is_vertical or table is None) else _row_cells_payload(table),
            image=crop,
            bbox=region.bbox,
        )

        with lock:
            is_short_circuited = failure_state["short_circuit"]

        if is_short_circuited:
            logger.warning(
                "[SEMANTIC_SHORT_CIRCUIT] Skipping region_id=%s page=%s LLM query due to previous consecutive rate limits or failures.",
                region.region_id,
                region.page,
            )
            prediction = None
        else:
            prediction = backend.analyze(request)
            with lock:
                if prediction is None:
                    failure_state["consecutive_failures"] += 1
                    if failure_state["consecutive_failures"] >= 3:
                        failure_state["short_circuit"] = True
                        logger.error(
                            "[SEMANTIC_SHORT_CIRCUIT] LLM backend has failed 3 times consecutively. Short-circuiting remaining LLM requests for this document."
                        )
                else:
                    failure_state["consecutive_failures"] = 0

        with lock:
            model_predictions.append({
                "region_id": region.region_id,
                "page": region.page,
                "region_type": region.region_type,
                "model_name": getattr(backend, "name", None),
                "available": not is_short_circuited,
                "prediction": prediction,
            })

        if not prediction:
            logger.warning(
                "Semantic backend %s returned no output for region=%s page=%s type=%s",
                getattr(backend, "name", None),
                region.region_id,
                region.page,
                request_region_type,
            )

        if not prediction:
            if table and (table_kind_hint in SEMANTIC_EXPENSE_TABLE_KINDS or _is_expense_like_table_payload(table)):
                fallback_table = _fallback_semantic_expense_table(table, source_region_type=request_region_type, model_name="heuristic-expense-bridge")
                if fallback_table is not None:
                    logger.info(
                        "Semantic fallback bridge used for expense table region=%s page=%s kind=%s",
                        region.region_id,
                        region.page,
                        table_kind_hint or "unknown",
                    )
                    fallback_region = SemanticRegionOutput(
                        region_id=region.region_id,
                        region_type=request_region_type,
                        semantic_type=request_region_type,
                        confidence=0.55,
                        source_page=region.page,
                        document_id=region.document_id,
                        claim_id=region.claim_id or claim_id,
                        source_tokens=[],
                        fields=[],
                        tables=[fallback_table],
                        model_name="heuristic-expense-bridge",
                        notes="semantic backend returned empty output; used expense fallback bridge",
                        metadata={"source": "expense_fallback_bridge"},
                    )
                    with lock:
                        region_outputs.append(fallback_region)
                        classified_tables.append(fallback_table)
            return

        try:
            region_output = SemanticRegionOutput.model_validate(prediction)
        except Exception:
            region_output = SemanticRegionOutput(
                region_id=str(prediction.get("region_id") or region.region_id),
                region_type=str(prediction.get("region_type") or region.region_type),
                semantic_type=str(prediction.get("semantic_type") or prediction.get("region_type") or region.region_type),
                confidence=float(prediction.get("confidence") or 0.0),
                source_page=region.page,
                document_id=region.document_id,
                claim_id=region.claim_id or claim_id,
                source_tokens=[SemanticFieldOutput.model_validate(tok) for tok in []],
                model_name=prediction.get("model_name") or getattr(backend, "name", None),
                notes=prediction.get("notes"),
                metadata=prediction,
            )
            for field_item in prediction.get("fields", []) or []:
                try:
                    region_output.fields.append(SemanticFieldOutput.model_validate(field_item))
                except Exception:
                    continue
            for table_item in prediction.get("tables", []) or []:
                try:
                    region_output.tables.append(SemanticTableOutput.model_validate(table_item))
                except Exception:
                    continue

        # Apply heuristic expense fallback ONLY when LLM returned no tables at all.
        # Do NOT apply if LLM returned tables classified as medications/lab/vitals/diagnoses
        # — respect the LLM's correct identification of non-expense table types.
        llm_returned_non_expense = any(
            str(t.table_kind or "").lower() in {"medications", "lab_results", "vitals", "diagnoses", "generic_table"}
            for t in region_output.tables
        )
        if (table and not region_output.tables and not llm_returned_non_expense
                and (table_kind_hint in SEMANTIC_EXPENSE_TABLE_KINDS or _is_expense_like_table_payload(table))):
            fallback_table = _fallback_semantic_expense_table(table, source_region_type=request_region_type, model_name="heuristic-expense-bridge")
            if fallback_table is not None:
                logger.info(
                    "[SEMANTIC_FALLBACK] Expense bridge applied for region=%s page=%s",
                    region.region_id, region.page,
                )
                region_output.tables.append(fallback_table)
                region_output.notes = (region_output.notes or "") + " | added expense fallback bridge table"

        with lock:
            region_outputs.append(region_output)
            semantic_fields.extend(region_output.fields)
            for tbl in region_output.tables:
                if not getattr(tbl, "source_region_id", None):
                    tbl.source_region_id = region.region_id
                if getattr(tbl, "page", None) is None:
                    tbl.page = region.page
            classified_tables.extend(region_output.tables)

    # Collect and configure tables to be analyzed
    tables_to_analyze = []
    for table in doc.tables:
        # Coerce generic/misclassified tables that look like billing tables so
        # LLM gets the correct expense-table context and schema.
        table_kind = str(getattr(table, "table_kind", "") or "").lower()
        is_expense_like = table_kind in SEMANTIC_EXPENSE_TABLE_KINDS or _is_expense_like_table_payload(table)

        # Skip patient form tables — they should not be sent to LLM for semantic analysis
        # (to protect PHI and avoid misclassification as expense tables).
        # We do not skip if it is clearly a billing/expense table.
        if _is_patient_form_table(table) and not is_expense_like:
            logger.info("[TABLE_FILTER] Skipping patient form table (region_id=%s)", table.region_id)
            continue

        # Do not skip vertical/single-column receipt layouts from LLM promotion!
        # Instead, promote them to the LLM backend but bypass the geometrically scrambled
        # table cells payload, sending only the clean vertical reading order of the raw OCR text.
        if _is_vertical_layout_table(table):
            logger.info(
                "[TABLE_FILTER] Reconstructed table region_id=%s is vertical layout. Promoted to LLM with scrambled table cells bypassed.",
                table.region_id,
            )

        if table_kind not in SEMANTIC_EXPENSE_TABLE_KINDS and is_expense_like:
            table.table_kind = "expenses"
            if table.region_id in region_by_id:
                region_by_id[table.region_id].region_type = "expense_table"
            logger.info("[SEMANTIC_COERCE] Promoted table region_id=%s to expenses for LLM", table.region_id)
        elif _is_medications_table(table):
            table.table_kind = "medications"
            if table.region_id in region_by_id:
                region_by_id[table.region_id].region_type = "medications"
            logger.info("[SEMANTIC_COERCE] Promoted table region_id=%s to medications", table.region_id)

        region = region_by_id.get(table.region_id)
        if not region:
            region = Region(
                region_id=table.region_id,
                region_type="table",
                bbox=table.bbox,
                tokens=[],
                page=table.page,
                confidence=table.confidence,
                model_name=table.model_name,
            )
        # Only send actual billing/expense tables to the LLM backend (minimum 2 rows)
        if table and len(getattr(table, "rows", [])) >= 2:
            is_lab_or_vitals = _is_lab_results_table(table) or _is_vitals_table(table)
            is_receipt = _is_payment_receipt_table(table)
            is_patient_form = _is_patient_form_table(table)
            is_relevant_billing = (
                table.table_kind in SEMANTIC_EXPENSE_TABLE_KINDS
                or is_expense_like
            ) and not is_lab_or_vitals and not is_receipt and not is_patient_form
            if is_relevant_billing:
                tables_to_analyze.append((region, table))
            elif is_receipt:
                logger.info("[TABLE_FILTER] Skipping payment receipt table (region_id=%s) from LLM expense analysis", table.region_id)

    # Run region analyses in parallel using ThreadPoolExecutor
    # Strictly limit tasks to actual tables to minimize LLM calls and API cost
    tasks_to_analyze = []
    for region, table in tables_to_analyze:
        tasks_to_analyze.append((region, table))

    if tasks_to_analyze:
        # Run table semantic extractions concurrently (up to 6 parallel workers) across Azure OpenAI
        concurrency_limit = int(os.environ.get("SEMANTIC_CONCURRENCY", getattr(settings, "semantic_concurrency", 6)))
        effective_concurrency = min(concurrency_limit, 6)
        logger.info(
            "[SEMANTIC_EXTRACTOR] Processing %d table(s) via Azure OpenAI in parallel (concurrency=%d)",
            len(tasks_to_analyze), effective_concurrency
        )
        with concurrent.futures.ThreadPoolExecutor(max_workers=effective_concurrency) as executor:
            list(executor.map(lambda args: _analyze_region(*args), tasks_to_analyze))

    # Semantic tables should create canonical expenses, medications, labs, and diagnosis tables.
    semantic_expenses: list[dict[str, Any]] = []
    semantic_medications: list[dict[str, Any]] = []
    semantic_labs: list[dict[str, Any]] = []
    semantic_diagnoses: list[dict[str, Any]] = []

    for table in classified_tables:
        semantic_table_mapping.setdefault(table.table_kind, []).append(table.model_dump())
        source_page = getattr(table, "page", None)
        if source_page is None and table.source_region_id and table.source_region_id in region_by_id:
            source_page = region_by_id[table.source_region_id].page
        if source_page is None:
            tokens = getattr(table, "source_tokens", []) or []
            for token in tokens:
                p = getattr(token, "page", None) if not isinstance(token, dict) else token.get("page")
                if p is not None:
                    source_page = p
                    break

        if table.table_kind in SEMANTIC_EXPENSE_TABLE_KINDS:
            semantic_expenses.extend(_table_to_expenses(table, source_page))
        elif table.table_kind == "medications":
            semantic_medications.extend(_table_to_semantic_rows(table))
        elif table.table_kind == "lab_results":
            semantic_labs.extend(_table_to_semantic_rows(table))
        elif table.table_kind == "diagnoses":
            semantic_diagnoses.extend(_table_to_semantic_rows(table))

    # Build a compact field map with best-confidence values.
    for field in semantic_fields:
        current = semantic_field_mapping.get(field.canonical_field)
        candidate = field.model_dump()
        if not current or float(candidate.get("confidence") or 0.0) > float(current.get("confidence") or 0.0):
            semantic_field_mapping[field.canonical_field] = candidate

    output.model_predictions = model_predictions
    output.semantic_regions = region_outputs
    output.semantic_fields = semantic_fields
    output.classified_tables = classified_tables
    output.semantic_field_mapping = semantic_field_mapping
    output.semantic_table_mapping = semantic_table_mapping

    if debug_dir and settings.semantic_debug_enabled:
        try:
            from services.parser.app.utils import ensure_dir
            dump_dir = Path(debug_dir)
            dump_dir = ensure_dir(dump_dir)
            (dump_dir / "semantic_region_outputs.json").write_text(
                json.dumps([region.model_dump() for region in region_outputs], indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            (dump_dir / "model_predictions.json").write_text(
                json.dumps(model_predictions, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            (dump_dir / "classified_tables.json").write_text(
                json.dumps([table.model_dump() for table in classified_tables], indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            (dump_dir / "semantic_field_mapping.json").write_text(
                json.dumps(semantic_field_mapping, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
        except Exception as e:
            logger.warning(f"Failed to write semantic parser debug dump: {e}")

    # If semantic extraction failed or no backend was available, fall back to the
    # existing normalized outputs to keep the runtime usable. The semantic outputs
    # remain the primary path.
    if not semantic_fields:
        output.semantic_fields = []
    if not classified_tables and not semantic_expenses:
        output.errors.append("No semantic backend output produced; fallback required")

    # Attach fallback-derived outputs for callers that want a complete payload.
    output.classified_tables = classified_tables
    if semantic_expenses:
        expenses = semantic_expenses
        output.semantic_table_mapping.setdefault("expenses", [])

    # Expose the extracted line items and summary rows in a model-friendly way.
    if semantic_medications:
        output.semantic_table_mapping.setdefault("medications", semantic_medications)
    if semantic_labs:
        output.semantic_table_mapping.setdefault("lab_results", semantic_labs)
    if semantic_diagnoses:
        output.semantic_table_mapping.setdefault("diagnoses", semantic_diagnoses)

    # Record extracted expenses in the output metadata for pipeline consumers.
    output.semantic_table_mapping.setdefault("expense_line_items", expenses)

    return output
