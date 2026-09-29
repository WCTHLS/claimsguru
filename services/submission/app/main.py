from __future__ import annotations

import hashlib
import io
import logging
from pathlib import Path
import re
import uuid
from typing import Any

from fastapi import APIRouter, Depends, FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy.orm import Session

from .adapters import get_adapter
from .config import settings
from .db import SessionLocal, check_db_health, engine
from .models import (
    Claim,
    ClaimFieldFeedback,
    Document,
    DocValidation,
    MedicalCode,
    OcrResult,
    ParsedField,
    Prediction,
    ScanAnalysis,
    Submission,
    TpaProvider,
    Organization,
)
from libs.auth.middleware import get_current_user
from libs.auth.models import TokenPayload
from libs.shared.field_mapping import get_all_expense_fields, get_expense_label
from .schemas import SubmissionDetailOut, SubmissionOut, SubmitRequest
from .tpa_pdf import _generate_brain_insights, _generate_reimbursement_brain, generate_tpa_pdf
from .irda_pdf import generate_irda_pdf
weasyprint_error_warning = None
try:
    from .irda_pdf_modern import generate_irda_pdf_modern  # type: ignore
    from .tpa_pdf_modern import generate_tpa_pdf_modern  # type: ignore
    
    # WeasyPrint imports successfully, but native GTK/Cairo/Pango DLLs on Windows
    # can cause fatal heap corruption/segmentation faults that crash/hang the server
    # when rendering. Let's smoke-test it in a subprocess to ensure it actually works.
    import subprocess
    import sys
    
    def _is_weasyprint_functional() -> bool:
        try:
            cmd = [
                sys.executable,
                "-c",
                "import weasyprint; weasyprint.HTML(string='<p>test</p>').write_pdf()"
            ]
            res = subprocess.run(cmd, capture_output=True, timeout=5.0)
            return res.returncode == 0
        except Exception:
            return False
            
    if not _is_weasyprint_functional():
        weasyprint_error_warning = (
            "WeasyPrint is installed but fails to render due to native library/GTK environment issues. "
            "Falling back to legacy fpdf2 renderer."
        )
        logging.getLogger("submission").warning(weasyprint_error_warning)
        generate_irda_pdf_modern = None
        generate_tpa_pdf_modern = None
except Exception as _exc:  # pragma: no cover - WeasyPrint optional at import time
    generate_irda_pdf_modern = None  # type: ignore
    generate_tpa_pdf_modern = None  # type: ignore
    logging.getLogger("submission").warning("Modern IRDA renderer unavailable: %s", _exc)

# Import rules engine for live re-validation in preview.
# In isolated service containers, this package may be unavailable.
try:
    from services.validator.app.rules import run_rules as _run_validation_rules
except Exception:  # pragma: no cover - environment-specific fallback
    _run_validation_rules = None

# ------------------------------------------------------------------ logging
logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("submission")

app = FastAPI(title="ClaimGPT Submission Service")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https://.*|http://localhost:.*|http://127.0.0.1:.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------ observability
try:
    import os
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    from libs.observability.metrics import PrometheusMiddleware, init_metrics, metrics_endpoint
    from libs.observability.tracing import init_tracing, instrument_fastapi
    init_tracing("submission")
    init_metrics("submission")
    instrument_fastapi(app)
    app.add_middleware(PrometheusMiddleware)
    _metrics_handler = metrics_endpoint()
    if _metrics_handler:
        app.get("/metrics")(_metrics_handler)
except Exception:
    logger.debug("Observability libs not available — skipping")


@app.on_event("shutdown")
def _shutdown():
    engine.dispose()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _safe_float(val: Any) -> float:
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    val_str = str(val).strip().lower()
    # Remove currency prefixes first to prevent preserving the period in "rs." as a decimal dot
    val_str = val_str.replace("₹", "").replace("rs.", "").replace("rs", "").replace("inr", "").strip()
    # Remove commas, currency signs, other non-numeric garbage
    cleaned = re.sub(r"[^\d\.\-]", "", val_str)
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


from sqlalchemy import types as sa_types

def _parse_uuid(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(value).strip())
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid UUID")


def _resolve_claim(claim_id: str, db: Session) -> Claim | None:
    """Resolve a Claim from UUID, short ID, patient/policy number, or latest claim."""
    if not claim_id:
        return db.query(Claim).order_by(Claim.created_at.desc()).first()

    # 1. Try exact UUID parse
    try:
        cid = uuid.UUID(str(claim_id).strip())
        claim = db.query(Claim).filter(Claim.id == cid).first()
        if claim:
            return claim
    except (ValueError, TypeError):
        pass

    # 2. Try match on patient_id, policy_id, or short ID substring
    clean_id = str(claim_id).strip()
    try:
        claim = (
            db.query(Claim)
            .filter(
                (Claim.policy_id == clean_id) |
                (Claim.patient_id == clean_id) |
                (Claim.id.cast(sa_types.String).ilike(f"%{clean_id}%"))
            )
            .order_by(Claim.created_at.desc())
            .first()
        )
        if claim:
            return claim
    except Exception:
        pass

    # 3. If not found by UUID, patient_id, or policy_id, return None
    return None

def _pick_best_field_value(field_name: str, values: list[tuple[str, str]]) -> str:
    """Pick the best value for a parsed field.

    Each element in *values* is a ``(raw_value, model_version)`` tuple so
    that source-aware prioritisation can be applied.  For money fields the
    expense-table extraction is authoritative (it sums line items correctly),
    so if an expense-table value exists we prefer it over heuristic/regex
    values.  Otherwise we fall back to the previous "pick MAX" behaviour.
    """
    clean: list[tuple[str, str]] = [
        (v, mv) for v, mv in values if isinstance(v, str) and v.strip()
    ]
    if not clean:
        return ""

    money_fields = {
        "total_amount", "room_charges", "consultation_charges", "pharmacy_charges",
        "investigation_charges", "surgery_charges", "surgeon_fees", "anaesthesia_charges",
        "ot_charges", "consumables", "nursing_charges", "icu_charges",
        "ambulance_charges", "misc_charges", "other_charges",
        "laboratory_charges", "radiology_charges", "physiotherapy_charges",
        "blood_charges", "isolation_charges", "transplant_charges", "chemotherapy_charges",
        "net_payable", "net_amount", "billed_amount", "claimed_total",
    }

    if field_name in money_fields:
        PRIORITY_ORDER = [
            "expense-table-v4",
            "expense-table-geo-v1",
            "expense-table-v2",
            "heuristic-v2",
        ]
        
        def get_priority(mv: str) -> int:
            for i, p in enumerate(PRIORITY_ORDER):
                if (mv or "").startswith(p):
                    return i
            return len(PRIORITY_ORDER)

        # Group valid numeric candidates by model priority
        grouped_candidates = {}
        for v, mv in clean:
            m = re.search(r"\d[\d,]*\.?\d*", v)
            if not m:
                continue
            try:
                num = float(m.group(0).replace(",", ""))
            except ValueError:
                continue
                
            priority = get_priority(mv)
            if priority not in grouped_candidates:
                grouped_candidates[priority] = []
            grouped_candidates[priority].append(num)

        if grouped_candidates:
            # Get the highest priority group (lowest index)
            best_priority = min(grouped_candidates.keys())
            best_group = grouped_candidates[best_priority]
            
            # If the best group is from an expense-table, we must sum the values
            # because they might represent partial totals across multiple pages.
            # If it's heuristic or unknown, we just pick the max to avoid double counting noisy regexes.
            best_mv_name = PRIORITY_ORDER[best_priority] if best_priority < len(PRIORITY_ORDER) else ""
            if best_mv_name.startswith("expense-table"):
                return f"{sum(best_group):.2f}"
            else:
                return f"{max(best_group):.2f}"

    if field_name == "age":
        nums: list[int] = []
        for v, _mv in clean:
            # Prefer direct numeric candidates and ignore out-of-range matches.
            for m in re.finditer(r"\b(\d{1,3})\b", v):
                n = int(m.group(1))
                if 0 < n < 121:
                    nums.append(n)
        if nums:
            return str(min(nums))

    if field_name == "patient_name":
        cleaned_names = []
        for v, _mv in clean:
            c_val = re.sub(r"^\s*\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4}\s*", "", v).strip()
            if c_val and not any(kw in c_val.lower() for kw in ["hospital", "clinic", "center"]):
                cleaned_names.append(c_val)
        if cleaned_names:
            return sorted(cleaned_names, key=lambda x: (x.count("|") + 2 * x.count("\n"), 0 if len(x) >= 4 else 1, -len(x)))[0]

    if field_name in {"diagnosis", "primary_diagnosis"}:
        cleaned_diags = []
        for v, _mv in clean:
            c_val = re.sub(r"^(?:primary\s+diagnosis|clinical\s+diagnosis|final\s+diagnosis|provisional\s+diagnosis|chief\s+diagnosis|diagnosis|none|n/a|null)\s*(?:procedure\s*:?|diagnosis\s*:?)?[:\-=–—|]?\s*", "", v, flags=re.IGNORECASE).strip()
            c_val = re.sub(
                r"\s*(?:\(?\[?\bICD(?:-?10|-?9)?\b[:\s\-]*[A-Z0-9\.]+\)?\]?|\bICD(?:-?10|-?9)?\b[:\s\-]*[A-Z0-9\.]*|\bCPT\b[:\s\-]*\d+|Procedure\s*:?.*|Secondary\s+Diagnosis.*).*$",
                "",
                c_val,
                flags=re.IGNORECASE,
            ).strip()
            c_val = re.sub(r"[\s:\-–—,|]+$", "", c_val).strip()
            if c_val.count("(") > c_val.count(")"):
                c_val = re.sub(r"[\s\(\[\:\-–—,|]+$", "", c_val).strip()
            if c_val and c_val.lower() not in {"none", "none procedure", "n/a", "null"}:
                cleaned_diags.append(c_val)
        if cleaned_diags:
            return sorted(cleaned_diags, key=lambda x: (x.count("|") + 2 * x.count("\n"), 0 if len(x) >= 4 else 1, -len(x)))[0]

    if field_name == "doctor_name":
        cleaned_docs = []
        for v, _mv in clean:
            v_lower = v.lower()
            if any(st in v_lower for st in ["signature", "sign", "seal", "stamp", "declaration", "attendant", "license", "ug license", "dl no", "reg no", "registration", "pharmacy", "hospital"]) or re.search(r"_{2,}", v) or any(ch.isdigit() for ch in v):
                continue
            doc_cleaned = re.sub(r"^(?:treating\s+doctor|treating\s+consultant|consultant|doctor|physician|dr\.?)\s*[:\-=–—|]?\s*", "", v, flags=re.IGNORECASE).strip()
            if doc_cleaned and len(doc_cleaned.split()) <= 4:
                val = f"Dr. {doc_cleaned}" if not doc_cleaned.lower().startswith("dr") else doc_cleaned
                cleaned_docs.append(val)
        if cleaned_docs:
            return sorted(cleaned_docs, key=lambda x: (0 if x.lower().startswith("dr.") else 1, x.count("|") + 2 * x.count("\n"), -len(x)))[0]
        return ""

    if field_name in {"insurance_policy_number", "policy_number", "policy_id"}:
        cleaned_pols = []
        for v, _mv in clean:
            pm = re.search(r"\b([A-Z]{2,6}\d{6,15}|\d{8,20}|[A-Z0-9]{3,8}-[A-Z0-9]{2,6}-[A-Z0-9]{4,12})\b", v)
            if pm:
                cleaned_pols.append(pm.group(1))
            elif len(v) <= 30 and not any(kw in v.lower() for kw in ["aadhaar", "pan", "sum insured", "tpa", "declare"]):
                cleaned_pols.append(v.strip())
        if cleaned_pols:
            return cleaned_pols[0]
        return ""

    if field_name in {"patient_id", "uhid", "ip_number"}:
        cleaned_ids = []
        for v, _mv in clean:
            um = re.search(r"\b(UH\d{5,12}|MRN\d{4,12}|PID\d{4,12})\b", v, re.I)
            im = re.search(r"\b(IP\d{5,12}|IPN\d{4,12})\b", v, re.I)
            if um and im:
                cleaned_ids.append(f"{um.group(1)} / {im.group(1)}")
            elif um:
                cleaned_ids.append(um.group(1))
            elif im:
                cleaned_ids.append(im.group(1))
            elif len(v) <= 25 and not any(kw in v.lower() for kw in ["bill", "patient name", "date", "room"]):
                cleaned_ids.append(v.strip())
        if cleaned_ids:
            return cleaned_ids[0]
        return ""

    if field_name == "patient_address":
        cleaned_addrs = []
        for v, _mv in clean:
            c_addr = re.sub(r"^(?:blood\s*group\s*[A-Z\+\-]+|group\s*[A-Z\+\-]+|occupation\s*[\w\s]+|driver\s*|self\s*|salaried\s*|business\s*)\s*[\/|\-,:]*\s*", "", v, flags=re.IGNORECASE).strip()
            c_addr = re.sub(r"^(?:driver|self|salaried|business)\b\s*", "", c_addr, flags=re.IGNORECASE).strip()
            c_addr = re.sub(r"\s+(?:GSTIN|Treating\s*Doctor|Hospital|Admission|Date|Time|Duration|Department).*$", "", c_addr, flags=re.IGNORECASE).strip()
            c_addr = re.sub(r"^[\s:\-–—,|/]+|[\s:\-–—,|/]+$", "", c_addr).strip()
            if c_addr and len(c_addr) >= 5 and c_addr.lower() not in {"driver", "self", "salaried"}:
                cleaned_addrs.append(c_addr)
        if cleaned_addrs:
            return sorted(cleaned_addrs, key=lambda x: -len(x))[0]
        return ""

    def _noise_score(v: str) -> tuple[int, int, int]:
        pipes = v.count("|")
        newlines = v.count("\n")
        # Prefer richer but cleaner candidates.
        return (pipes + (2 * newlines), 0 if len(v) >= 4 else 1, -len(v))

    return sorted([v for v, _mv in clean], key=_noise_score)[0].strip()


def _build_parsed_field_map(pf_rows: list[ParsedField]) -> dict[str, str]:
    grouped: dict[str, list[tuple[str, str]]] = {}
    # Stable ordering so tie-break behavior is deterministic.
    sorted_rows = sorted(
        pf_rows,
        key=lambda r: ((r.created_at.isoformat() if r.created_at else ""), str(r.id)),
    )
    for r in sorted_rows:
        grouped.setdefault(r.field_name, []).append(
            (r.field_value or "", r.model_version or "")
        )

    resolved: dict[str, str] = {}
    for field_name, values in grouped.items():
        best = _pick_best_field_value(field_name, values)
        if best:
            resolved[field_name] = best
    return resolved


def _infer_document_type(file_name: str, text: str) -> str:
    sample = f"{(file_name or '').lower()}\n{(text or '').lower()}"
    if "medical insurance claim form" in sample:
        return "HOSPITAL_BILL"
    if "hospitalization details" in sample and ("date of admission" in sample or "admission date" in sample):
        return "HOSPITAL_BILL"
    if any(k in sample for k in (
        "hospital expense breakdown", "expense breakdown", "itemized inpatient hospital bill",
        "gross total", "bill summary", "hospital bill", "net admissible", "claim amount requested",
        "total amount", "amount exceeding policy", "sum insured"
    )):
        return "HOSPITAL_BILL"
    if "discharge summary" in sample:
        return "DISCHARGE_SUMMARY"
    if "pharmacy invoice" in sample:
        return "PHARMACY_INVOICE"
    if any(k in sample for k in ("radiology", "x-ray", "xray", "ct scan", "mri", "ultrasound", "usg", "sonography", "imaging report")):
        if not any(bk in sample for bk in ("hospital expense breakdown", "bill total", "total amount", "amount exceeding policy", "sum insured")):
            return "RADIOLOGY_REPORT"
    if "laboratory" in sample or "investigation report" in sample or "lab charges" in sample:
        if not any(bk in sample for bk in ("hospital expense breakdown", "bill total", "total amount", "amount exceeding policy", "sum insured")):
            return "LAB_REPORT"
    return "UNKNOWN"


def _extract_net_payable(text: str) -> float | None:
    if not text:
        return None
    
    # Check if document has insurance cashless pre-auth / adjusted lines
    has_insurance_settlement = bool(re.search(r"insurance\s*(?:approved|adjusted|pre-?auth|settled)", text, re.I))

    patterns = [
        re.compile(r"claim\s*amount\s*requested\s*(?:[:|\-]|\|)?\s*(?:rs|inr|usd|\$|₹)?\.?\s*([\d,]+\.?\d*)", re.I),
        re.compile(r"net\s*admissible\s*(?:amount|total)?\s*(?:[:|\-]|\|)?\s*(?:rs|inr|usd|\$|₹)?\.?\s*([\d,]+\.?\d*)", re.I),
        re.compile(r"admissible\s*amount\s*(?:[:|\-]|\|)?\s*(?:rs|inr|usd|\$|₹)?\.?\s*([\d,]+\.?\d*)", re.I),
        re.compile(r"net\s*amount\s*payable\s*by\s*patient\s*(?:[:|\-]|\|)?\s*(?:rs|inr|usd|\$|₹)?\.?\s*([\d,]+\.?\d*)", re.I),
        re.compile(r"net\s*(?:payable|amount|total)\s*(?:[:|\-]|\|)?\s*(?:rs|inr|usd|\$|₹)?\.?\s*([\d,]+\.?\d*)", re.I),
    ]
    if not has_insurance_settlement:
        patterns.extend([
            re.compile(r"amount\s*payable\s*(?:by\s*(?:patient|insurer))?\s*(?:[:|\-]|\|)?\s*(?:rs|inr|usd|\$|₹)?\.?\s*([\d,]+\.?\d*)", re.I),
            re.compile(r"patient\s*payable\s*(?:amount|total)?\s*(?:[:|\-]|\|)?\s*(?:rs|inr|usd|\$|₹)?\.?\s*([\d,]+\.?\d*)", re.I),
            re.compile(r"total\s*payable\s*(?:[:|\-]|\|)?\s*(?:rs|inr|usd|\$|₹)?\.?\s*([\d,]+\.?\d*)", re.I),
            re.compile(r"payable\s*(?:total|amount)\s*(?:[:|\-]|\|)?\s*(?:rs|inr|usd|\$|₹)?\.?\s*([\d,]+\.?\d*)", re.I),
            re.compile(r"claim\s*amount\s*(?:[:|\-]|\|)?\s*(?:rs|inr|usd|\$|₹)?\.?\s*([\d,]+\.?\d*)", re.I),
        ])

    for pat in patterns:
        matches = [m.group(1) for m in pat.finditer(text)]
        for raw in reversed(matches):
            try:
                value = float(raw.replace(",", ""))
            except ValueError:
                continue
            if value > 0:
                return value
    return None


def _extract_deductions(text: str) -> float | None:
    if not text:
        return None
    patterns = [
        re.compile(r"amount\s*exceeding\s*policy\s*(?:[:|\-]|\|)?\s*(?:rs|inr|usd|\$|₹)?\.?\s*([\d,]+\.?\d*)", re.I),
        re.compile(r"(?:less:?\s*)?non[-\s]*payable\s*(?:items|amount|charges|total)?\s*(?:[:|\-]|\|)?\s*(?:rs|inr|usd|\$|₹)?\.?\s*([\d,]+\.?\d*)", re.I),
        re.compile(r"(?:less:?\s*)?deductions?\s*(?:[:|\-]|\|)?\s*(?:rs|inr|usd|\$|₹)?\.?\s*([\d,]+\.?\d*)", re.I),
        re.compile(r"(?:less:?\s*)?discounts?\s*(?:[:|\-]|\|)?\s*(?:rs|inr|usd|\$|₹)?\.?\s*([\d,]+\.?\d*)", re.I),
    ]
    for pat in patterns:
        matches = [m.group(1) for m in pat.finditer(text)]
        for raw in reversed(matches):
            try:
                value = float(raw.replace(",", ""))
            except ValueError:
                continue
            if value > 0:
                return value
    return None


def _extract_gross_total(text: str) -> float | None:
    if not text:
        return None
    patterns = [
        re.compile(r"gross\s*hospital\s*bill\s*(?:[:|\-]|\|)?\s*(?:rs|inr|usd|\$|₹)?\.?\s*([\d,]+\.?\d*)", re.I),
        re.compile(r"gross\s*bill\s*(?:[:|\-]|\|)?\s*(?:rs|inr|usd|\$|₹)?\.?\s*([\d,]+\.?\d*)", re.I),
        re.compile(r"(?:total\s*)?gross\s*(?:total\s*)?amount\s*(?:[:|\-]|\|)?\s*(?:rs|inr|usd|\$|₹)?\.?\s*([\d,]+\.?\d*)", re.I),
        re.compile(r"gross\s*total\s*(?:[:|\-]|\|)?\s*(?:rs|inr|usd|\$|₹)?\.?\s*([\d,]+\.?\d*)", re.I),
        re.compile(r"grand\s*total\s*(?:[:|\-]|\|)?\s*(?:rs|inr|usd|\$|₹)?\.?\s*([\d,]+\.?\d*)", re.I),
        re.compile(r"bill\s*total\s*(?:[:|\-]|\|)?\s*(?:rs|inr|usd|\$|₹)?\.?\s*([\d,]+\.?\d*)", re.I),
        re.compile(r"total\s*charges\s*(?:[:|\-]|\|)?\s*(?:rs|inr|usd|\$|₹)?\.?\s*([\d,]+\.?\d*)", re.I),
        re.compile(r"total\s*bill\s*(?:amount)?\s*(?:[:|\-]|\|)?\s*(?:rs|inr|usd|\$|₹)?\.?\s*([\d,]+\.?\d*)", re.I),
        re.compile(r"total\s*amount\s*(?:[:|\-]|\|)?\s*(?:rs|inr|usd|\$|₹)?\.?\s*([\d,]+\.?\d*)", re.I),
        re.compile(r"bill\s*summary[\s\S]{0,350}?gross\s*total\s*(?:[:|\-]|\|)?\s*(?:rs|inr|usd|\$|₹)?\.?\s*([\d,]+\.?\d*)", re.I),
    ]
    for pat in patterns:
        matches = [m.group(1) for m in pat.finditer(text)]
        for raw in reversed(matches):
            try:
                value = float(raw.replace(",", ""))
            except ValueError:
                continue
            if value > 0:
                return value
    return None


def _extract_hospital_bill_subtotals(text: str) -> dict[str, float]:
    """Extract canonical A-E subtotals from a hospital bill summary block."""
    if not text:
        return {}

    subtotal_patterns = {
        "room_charges": [
            re.compile(r"sub[-\s]*total\s*A\s*(?:[-–]\s*room\s*&?\s*boarding)?\s*\|?\s*(?:rs|inr)?\s*([\d,]+\.?\d*)", re.I),
        ],
        "investigation_charges": [
            re.compile(r"sub[-\s]*total\s*B\s*(?:[-–]\s*investigations?)?\s*\|?\s*(?:rs|inr)?\s*([\d,]+\.?\d*)", re.I),
        ],
        "surgery_charges": [
            re.compile(r"sub[-\s]*total\s*C\s*(?:[-–]\s*procedures?\s*/\s*implants?)?\s*\|?\s*(?:rs|inr)?\s*([\d,]+\.?\d*)", re.I),
        ],
        "consultation_charges": [
            re.compile(r"sub[-\s]*total\s*D\s*(?:[-–]\s*consultations?)?\s*\|?\s*(?:rs|inr)?\s*([\d,]+\.?\d*)", re.I),
        ],
        "pharmacy_charges": [
            re.compile(r"sub[-\s]*total\s*E\s*(?:[-–]\s*pharmacy\s*&\s*consumables?)?\s*\|?\s*(?:rs|inr)?\s*([\d,]+\.?\d*)", re.I),
        ],
    }

    extracted: dict[str, float] = {}
    for key, patterns in subtotal_patterns.items():
        for pat in patterns:
            matches = [m.group(1) for m in pat.finditer(text)]
            if not matches:
                continue
            for raw in reversed(matches):
                try:
                    value = float(raw.replace(",", ""))
                except ValueError:
                    continue
                if value > 0:
                    extracted[key] = value
                    break
            if key in extracted:
                break

    return extracted


# ------------------------------------------------------------------ helpers

def _sort_icd_codes(codes: list[Any]) -> list[Any]:
    """Sort ICD codes prioritizing primary codes (is_primary=True) and then by confidence descending."""
    return sorted(
        codes,
        key=lambda c: (
            not getattr(c, "is_primary", False),
            -getattr(c, "confidence", 0.0) if getattr(c, "confidence", None) is not None else 0.0
        )
    )


def _gather_claim_data(db: Session, claim: Claim) -> dict[str, Any]:
    """Collect all data needed for submission payload."""
    pf_rows = db.query(ParsedField).filter(ParsedField.claim_id == claim.id).all()
    codes = db.query(MedicalCode).filter(MedicalCode.claim_id == claim.id).all()

    parsed_map = _build_parsed_field_map(pf_rows)

    return {
        "claim_id": str(claim.id),
        "policy_id": claim.policy_id,
        "patient_id": claim.patient_id,
        "parsed_fields": parsed_map,
        "icd_codes": [c.code for c in _sort_icd_codes([c for c in codes if c.code_system == "ICD10"])],
        "cpt_codes": [c.code for c in codes if c.code_system == "CPT"],
    }


def _gather_claim_data_full(db: Session, claim: Claim) -> dict[str, Any]:
    """Collect all data for TPA PDF generation (richer than submission)."""
    pf_rows = db.query(ParsedField).filter(ParsedField.claim_id == claim.id).all()
    codes = db.query(MedicalCode).filter(MedicalCode.claim_id == claim.id).all()
    docs = db.query(Document).filter(Document.claim_id == claim.id).all()

    identity_rows = []
    identity_excluded_doc_ids = set()
    identity_warnings = []
    try:
        identity_rows = db.query(DocValidation).filter(
            DocValidation.claim_id == claim.id,
            DocValidation.doc_type == "IDENTITY_GATE",
        ).all()
        identity_excluded_doc_ids = {
            r.document_id
            for r in identity_rows
            if (r.validation_metadata or {}).get("excluded_from_pipeline")
        }
        identity_warnings = [
            {
                "document_id": str(r.document_id),
                "file_name": (r.validation_metadata or {}).get("file_name", ""),
                "reason": (r.validation_metadata or {}).get("reason", "Manual review required"),
            }
            for r in identity_rows
            if (r.validation_metadata or {}).get("needs_manual_review")
        ]
    except Exception as exc:
        logger.warning(f"Could not load DocValidation for claim {claim.id}: {exc}")

    # OCR text
    doc_ids = [d.id for d in docs]
    ocr_text = ""
    doc_ocr_map: dict[str, str] = {}  # doc_id -> full OCR text
    if doc_ids:
        try:
            rows = db.query(OcrResult).filter(OcrResult.document_id.in_(doc_ids)).order_by(OcrResult.page_number).all()
            # Build per-document OCR text
            for r in rows:
                if r.text:
                    did = str(r.document_id)
                    doc_ocr_map[did] = (doc_ocr_map.get(did, "") + "\n" + r.text).strip()
            ocr_text = "\n".join(r.text for r in rows if r.text)[:3000]
        except Exception as exc:
            logger.warning(f"Could not load OcrResult for claim {claim.id}: {exc}")
    # Fallback: read PDF directly
    if not ocr_text and docs:
        for doc in docs:
            if doc.file_type == "application/pdf" and doc.minio_path:
                temp_local_path = None
                try:
                    import pdfplumber
                    import os
                    
                    actual_path = doc.minio_path
                    if doc.minio_path.startswith("s3://"):
                        from libs.shared.storage import MinioStorage
                        try:
                            temp_local_path = MinioStorage.download_to_temp(doc.minio_path)
                            actual_path = temp_local_path
                        except Exception:
                            continue
                            
                    parts = []
                    with pdfplumber.open(actual_path) as pdf:
                        for page in pdf.pages[:10]:
                            t = page.extract_text()
                            if t:
                                parts.append(t)
                    fallback_text = " ".join(parts)[:3000]
                    if fallback_text:
                        doc_ocr_map[str(doc.id)] = fallback_text
                        if not ocr_text:
                            ocr_text = fallback_text[:2000]
                except Exception:
                    pass
                finally:
                    if temp_local_path and os.path.exists(temp_local_path):
                        try:
                            os.unlink(temp_local_path)
                        except Exception:
                            pass

    # Predictions
    preds = db.query(Prediction).filter(Prediction.claim_id == claim.id).order_by(Prediction.created_at.desc()).limit(3).all()
    predictions = [{"rejection_score": p.rejection_score, "top_reasons": p.top_reasons, "model_name": p.model_name} for p in preds]

    # Validations — re-run rules live so preview always reflects current data
    parsed = _build_parsed_field_map(pf_rows)
    # If parser didn't populate hospital_name, try a lightweight fallback using OCR text
    if not parsed.get("hospital_name"):
        try:
            from services.parser.app.engine import _extract_hospital_name_fallback
            for did, dtext in doc_ocr_map.items():
                if not dtext:
                    continue
                cand = _extract_hospital_name_fallback(dtext)
                if cand:
                    parsed["hospital_name"] = cand
                    break
        except Exception:
            pass

    # If parser didn't populate doctor_name, try extracting Dr. [Name] from OCR text
    if not parsed.get("doctor_name"):
        try:
            for did, dtext in doc_ocr_map.items():
                if not dtext:
                    continue
                doc_m = re.search(r"(?im)(?:consultant|treating\s+doctor|treating\s+physician|doctor)\s*[:\-=–—|]?[ \t]*(?:dr\.?[ \t]*)?([A-Z][a-zA-Z\.\'-]+(?:[ \t]+[A-Z][a-zA-Z\.\'-]+){1,3})\b", dtext)
                if doc_m and not any(kw in doc_m.group(1).lower() for kw in ["hospital", "speciality", "clinic", "center", "license", "department", "medicine", "consultant"]):
                    parsed["doctor_name"] = f"Dr. {doc_m.group(1).strip()}"
                    break
                doc_m2 = re.search(r"(?im)\bdr\.?[ \t]+([A-Z][a-zA-Z\.\'-]+(?:[ \t]+[A-Z][a-zA-Z\.\'-]+){1,3})\b", dtext)
                if doc_m2 and not any(kw in doc_m2.group(1).lower() for kw in ["hospital", "speciality", "clinic", "center", "license", "department", "medicine", "consultant"]):
                    parsed["doctor_name"] = f"Dr. {doc_m2.group(1).strip()}"
                    break
        except Exception:
            pass

    # If parser didn't populate policy_number, try extracting clean policy token from OCR text
    if not parsed.get("policy_number") and not parsed.get("insurance_policy_number"):
        try:
            for did, dtext in doc_ocr_map.items():
                if not dtext:
                    continue
                pol_m = re.search(r"(?im)(?:policy\s*(?:no|number|id)|policy)\s*[:\-=–—|]?[ \t]*([A-Z]{2,6}\d{6,15}|\d{8,20}|[A-Z0-9]{3,8}-[A-Z0-9]{2,6}-[A-Z0-9]{4,12})\b", dtext)
                if pol_m:
                    parsed["insurance_policy_number"] = pol_m.group(1).strip()
                    parsed["policy_number"] = pol_m.group(1).strip()
                    break
        except Exception:
            pass

    # If parser didn't populate patient_address, try extracting clean address from OCR text
    if not parsed.get("patient_address"):
        try:
            for did, dtext in doc_ocr_map.items():
                if not dtext:
                    continue
                addr_m = re.search(r"(?im)(?:address|patient\s+address)\s*[:\-=–—|]?[ \t]*([0-9A-Za-z][^\n\r|]{5,100}(?:\n[ \t]*[A-Za-z0-9][^\n\r|]{3,50})?)", dtext)
                if addr_m:
                    cleaned_a = addr_m.group(1).replace("\n", " ").strip()
                    cleaned_a = re.sub(r"^(?:driver|self|salaried|business|blood\s*group\s*[A-Z\+\-]+)\b\s*[\/|\-,:]*\s*", "", cleaned_a, flags=re.IGNORECASE).strip()
                    cleaned_a = re.sub(r"\s+(?:GSTIN|Treating\s*Doctor|Hospital|Admission|Date|Time|Duration|Department).*$", "", cleaned_a, flags=re.IGNORECASE).strip()
                    if len(cleaned_a) >= 8 and not any(kw in cleaned_a.lower() for kw in ["hospital", "treating", "gstin"]):
                        parsed["patient_address"] = cleaned_a
                        break
        except Exception:
            pass
    _codes_for_rules = [{"code": c.code, "code_system": c.code_system, "is_primary": getattr(c, "is_primary", False)} for c in codes]
    _rejection_score = preds[0].rejection_score if preds else None
    _rule_ctx = {"field_map": parsed, "codes": _codes_for_rules, "rejection_score": _rejection_score}
    _rule_results = _run_validation_rules(_rule_ctx) if _run_validation_rules else []
    validations = [{"rule_id": r.rule_id, "rule_name": r.rule_name, "severity": r.severity, "message": r.message, "passed": r.passed} for r in _rule_results]

    icd_codes_sorted = _sort_icd_codes([c for c in codes if c.code_system == "ICD10"])
    icd_list = [{"code": c.code, "description": c.description or "", "confidence": c.confidence, "estimated_cost": getattr(c, "estimated_cost", None)} for c in icd_codes_sorted]
    cpt_list = [{"code": c.code, "description": c.description or "", "confidence": c.confidence, "estimated_cost": getattr(c, "estimated_cost", None)} for c in codes if c.code_system == "CPT"]

    icd_total = sum(x["estimated_cost"] or 0 for x in icd_list)
    cpt_total = sum(x["estimated_cost"] or 0 for x in cpt_list)

    # ── Build expense breakdown from parsed fields ──
    # Use centralized expense field mappings from libs.shared.field_mapping
    _EXPENSE_FIELDS = get_all_expense_fields()
    # Build dynamic, itemized expense lines from parsed field rows (preserve all rows)
    expenses: list[dict[str, Any]] = []
    # Track whether any UI-saved expense rows exist. When the user has
    # explicitly saved expenses via PUT /expenses, we must ONLY use those
    # rows and ignore the legacy heuristic fields — otherwise both sets are
    # merged and every add/remove duplicates the old parser rows.
    has_ui_expense_rows = any(
        (r.field_name or "").startswith("expense_table_row_") and (r.model_version or "") == "expense-table-ui"
        for r in pf_rows
    )
    for r in pf_rows:
        if not r.field_value:
            continue
        fn = (r.field_name or "")
        mv = (r.model_version or "")
        # Skip obvious total/grand-total anchors to avoid double-counting
        if fn in ("total_amount", "gross_total", "total", "grand_total", "gross_total_amount"):
            continue

        # First, handle structured expense rows stored by the UI (JSON payloads)
        if fn.startswith("expense_table_row_") or mv.startswith("expense-table"):
            try:
                import json as _json

                parsed_json = _json.loads(r.field_value)
                desc = parsed_json.get("description") if isinstance(parsed_json, dict) else None
                cat = desc or parsed_json.get("category") if isinstance(parsed_json, dict) else None
                amt = parsed_json.get("amount") if isinstance(parsed_json, dict) else None

                if amt is None:
                    try:
                        amt_val = _safe_float(r.field_value)
                    except Exception:
                        continue
                else:
                    amt_val = _safe_float(amt)

                if cat is None:
                    # derive a label from field name if category missing
                    if fn in _EXPENSE_FIELDS:
                        cat = _EXPENSE_FIELDS[fn]
                    else:
                        cat = re.sub(r"\s+", " ", fn).strip()

                # Allow amount == 0 for structured/parsed table rows
                if amt_val >= 0:
                    expenses.append({
                        "category": cat,
                        "amount": amt_val,
                        "source_field": fn,
                        "model_version": mv,
                        "document_id": str(r.document_id) if getattr(r, "document_id", None) else None,
                        "source_page": getattr(r, "source_page", None),
                    })
            except Exception:
                # fall back to legacy behaviour if json parsing fails
                pass
            continue

        # Legacy heuristics: treat any expense-like parsed field rows as itemized.
        # Skip entirely when the user has already saved explicit UI expense rows —
        # mixing both sets causes duplicate rows on every add/remove operation.
        if has_ui_expense_rows:
            continue
        if fn in _EXPENSE_FIELDS or fn.endswith("_expense") or fn.endswith("_charges") or fn.endswith("_charge") or fn.endswith("_amount"):
            # Determine display label
            if fn in _EXPENSE_FIELDS:
                display_label = _EXPENSE_FIELDS[fn]
            else:
                display_label = re.sub(r"\s+", " ", fn).strip()
            try:
                amount = float((r.field_value or "").replace(",", ""))
            except (ValueError, AttributeError):
                continue
            if amount > 0:
                expenses.append({
                    "category": display_label,
                    "amount": amount,
                    "source_field": fn,
                    "model_version": mv,
                    "document_id": str(r.document_id) if getattr(r, "document_id", None) else None,
                    "source_page": getattr(r, "source_page", None),
                })

    # Fallback: if no itemized rows were found, fall back to the previous field-map-based approach
    if not expenses:
        seen_expense_labels: dict[str, float] = {}
        for field_key, val in parsed.items():
            if not val:
                continue
            display_label = None
            if field_key in _EXPENSE_FIELDS:
                display_label = _EXPENSE_FIELDS[field_key]
            elif field_key.endswith("_expense"):
                display_label = field_key.replace("_expense", "").replace("_", " ").title()
            if display_label:
                try:
                    amount = float(val.replace(",", ""))
                    if amount > 0 and display_label not in seen_expense_labels:
                        seen_expense_labels[display_label] = amount
                        expenses.append({"category": display_label, "amount": amount})
                except (ValueError, AttributeError):
                    pass

    expense_total = sum(e["amount"] for e in expenses)

    gross_total_claimed = 0.0
    gross_total_found = False
    net_payable_claimed = 0.0
    net_payable_found = False
    deductions_claimed = 0.0
    deductions_found = False
    radiology_doc_ids: set[str] = set()
    hospital_bill_subtotals: dict[str, float] = {}
    for d in docs:
        did = str(d.id)
        dtext = doc_ocr_map.get(did, "")
        if not dtext:
            continue
        inferred_type = _infer_document_type(d.file_name or "", dtext)
        if inferred_type == "RADIOLOGY_REPORT":
            radiology_doc_ids.add(did)
        if inferred_type != "HOSPITAL_BILL":
            continue
        if not hospital_bill_subtotals:
            hospital_bill_subtotals = _extract_hospital_bill_subtotals(dtext)
        
        # Scan for net payable, gross, and deductions
        net_pay = _extract_net_payable(dtext)
        if net_pay is not None:
            net_payable_claimed = net_pay
            net_payable_found = True
        
        gross = _extract_gross_total(dtext)
        if gross is not None:
            gross_total_claimed = gross
            gross_total_found = True

        ded = _extract_deductions(dtext)
        if ded is not None:
            deductions_claimed = ded
            deductions_found = True

    if deductions_found and gross_total_found and not (net_payable_found and net_payable_claimed > 0):
        net_payable_claimed = round(max(0.0, gross_total_claimed - deductions_claimed), 2)
        net_payable_found = True
    elif gross_total_found and net_payable_found and not deductions_found:
        deductions_claimed = round(max(0.0, gross_total_claimed - net_payable_claimed), 2)
        deductions_found = True

    # Run automated Cross-Document Expense Reconciliation when not explicitly overridden by UI
    if not has_ui_expense_rows and expenses:
        try:
            from .expense_reconciler import reconcile_claim_expenses
            expenses = reconcile_claim_expenses(
                raw_expenses=expenses,
                docs=docs,
                doc_ocr_map=doc_ocr_map,
                gross_total=gross_total_claimed,
                net_payable=net_payable_claimed,
                deductions=deductions_claimed,
            )
            expense_total = sum(e["amount"] for e in expenses)
        except Exception as _reconcile_err:
            logger.warning("[EXPENSE_RECONCILER] Error during expense reconciliation: %s", _reconcile_err, exc_info=True)

    # We no longer override with bill-summary anchored expense categories.
    # The `expense-table-v4` engine is now highly accurate and granular, 
    # capturing all necessary sub-categories directly.

    # Prioritize Net Payable Total from document if > 0, fallback to Gross Total, then Expense Total
    if net_payable_found and net_payable_claimed > 0:
        billed_total = net_payable_claimed
    elif gross_total_found and gross_total_claimed > 0:
        billed_total = gross_total_claimed
    else:
        billed_total = 0.0
    
    if billed_total <= 0:
        for fb_key in ["net_payable", "net_amount", "billed_amount", "total_amount", "claimed_total", "grand_total", "gross_total"]:
            billed_total_str = parsed.get(fb_key, "")
            if billed_total_str:
                try:
                    cand_amt = _safe_float(billed_total_str)
                    if cand_amt > 0:
                        billed_total = cand_amt
                        break
                except (ValueError, AttributeError):
                    pass

    if billed_total <= 0 and expense_total > 0:
        billed_total = expense_total

    reconciliation_warnings: list[str] = []
    if billed_total > 0 and expense_total > 0:
        diff = abs(billed_total - expense_total)
        margin = billed_total * 0.01
        if diff > margin:
            reconciliation_warnings.append(
                f"Itemized categories total Rs. {expense_total:,.2f} differs from HOSPITAL_BILL BILLED TOTAL Rs. {billed_total:,.2f} by Rs. {diff:,.2f} (>1%)."
            )
    if not (net_payable_found or gross_total_found):
        reconciliation_warnings.append(
            "HOSPITAL_BILL Total anchors were not found; billed total fell back to parsed fields."
        )

    # ── Scan analyses (MRI / CT / X-Ray / Ultrasound) ──
    scan_rows = db.query(ScanAnalysis).filter(ScanAnalysis.claim_id == claim.id).all()
    scan_analyses = []
    for s in scan_rows:
        if radiology_doc_ids and str(s.document_id) not in radiology_doc_ids:
            continue
        if not radiology_doc_ids:
            # No radiology source document in this claim; suppress imaging insights.
            continue
        scan_analyses.append({
            "id": str(s.id),
            "document_id": str(s.document_id),
            "scan_type": s.scan_type,
            "body_part": s.body_part,
            "modality": s.modality,
            "findings": s.findings or [],
            "impression": s.impression,
            "recommendation": s.recommendation,
            "confidence": s.confidence,
            "is_abnormal": (s.scan_metadata or {}).get("is_abnormal", False),
            "file_name": (s.scan_metadata or {}).get("file_name", ""),
        })

    # Check latest TPA action or request note
    tpa_message = None
    tpa_requested_docs = []
    try:
        from libs.shared.models import AuditLog
        latest_audit = (
            db.query(AuditLog)
            .filter(
                AuditLog.claim_id == claim.id,
                AuditLog.action.in_([
                    "CLAIM_REQUEST_DOCS",
                    "CLAIM_DOCUMENTS_REQUESTED",
                    "CLAIM_MODIFICATION_REQUESTED",
                    "CLAIM_SEND_BACK",
                    "CLAIM_REJECT",
                    "CLAIM_REJECTED",
                    "CLAIM_DOCUMENTS_UPLOADED",
                    "DOCUMENTS_ADDED",
                    "CLAIM_RESUBMITTED",
                    "CLAIM_APPROVED",
                    "CLAIM_SETTLED",
                    "CLAIM_SUBMITTED",
                ])
            )
            .order_by(AuditLog.created_at.desc())
            .first()
        )
        if latest_audit and latest_audit.action in ("CLAIM_REQUEST_DOCS", "CLAIM_DOCUMENTS_REQUESTED", "CLAIM_MODIFICATION_REQUESTED", "CLAIM_SEND_BACK"):
            if latest_audit.audit_metadata:
                tpa_message = latest_audit.audit_metadata.get("reason")
                tpa_requested_docs = latest_audit.audit_metadata.get("requested_documents") or []
    except Exception as _audit_err:
        logger.debug("Could not fetch audit log for tpa message: %s", _audit_err)

    # Dynamic IRDAI Non-Medical Expenses Admissibility Assessment
    from .expense_reconciler import evaluate_non_medical_expenses
    admissibility_eval = evaluate_non_medical_expenses(
        expenses=expenses,
        explicit_deductions=deductions_claimed if deductions_found else 0.0,
    )

    final_gross = round(gross_total_claimed if (gross_total_found and gross_total_claimed > 0) else (billed_total if billed_total > 0 else expense_total), 2)
    final_deductions = round(admissibility_eval.get("potential_non_medical_total", 0.0), 2)
    final_net = round(max(0.0, final_gross - final_deductions), 2)

    return {
        "claim_id": str(claim.id),
        "created_at": claim.created_at.isoformat() if getattr(claim, "created_at", None) else None,
        "status": claim.status,
        "tpa_message": tpa_message,
        "tpa_requested_docs": tpa_requested_docs,
        "policy_id": claim.policy_id,
        "patient_id": claim.patient_id,
        "parsed_fields": parsed,
        "icd_codes": icd_list,
        "cpt_codes": cpt_list,
        "cost_summary": {
            "icd_total": round(icd_total, 2),
            "cpt_total": round(cpt_total, 2),
            "grand_total": round(billed_total if billed_total > 0 else (icd_total + cpt_total), 2),
            "anchored_billed_total": round(billed_total, 2),
            "estimated_total": round(icd_total + cpt_total, 2),
        },
        "expenses": expenses,
        "expense_total": round(expense_total, 2),
        "billed_total": round(billed_total, 2),
        "gross_total": final_gross,
        "net_payable": final_net,
        "deductions": final_deductions,
        "potential_non_medical_total": final_deductions,
        "non_medical_items": admissibility_eval.get("non_medical_items", []),
        "admissibility_guidance": admissibility_eval.get("admissibility_guidance", ""),
        "is_all_medical": admissibility_eval.get("is_all_medical", True),
        "gross_total_found": gross_total_found,
        "net_payable_found": net_payable_found,
        "has_radiology_source": bool(radiology_doc_ids),
        "reconciliation_warnings": reconciliation_warnings,
        "predictions": predictions,
        "validations": validations,
        "ocr_excerpt": ocr_text,
        "documents": [
            {
                "document_id": str(d.id),
                "doc_id": str(d.id),
                "id": str(d.id),
                "original_filename": d.file_name,
                "file_name": d.file_name,
                "file_type": d.file_type,
                "doc_type": getattr(d, "doc_type", None) or "UNKNOWN",
                "display_title": getattr(d, "display_title", None) or d.file_name,
                "page_count": getattr(d, "page_count", None) or 1,
                "pages": [
                    f"/claims/{claim.id}/documents/{d.id}/pages/{p_idx}/image"
                    for p_idx in range(1, (getattr(d, "page_count", None) or 1) + 1)
                ],
            }
            for d in docs
        ],
        "document_texts": {str(d.id): doc_ocr_map.get(str(d.id), "")[:3000] for d in docs},
        "scan_analyses": scan_analyses,
        "identity_review": {
            "excluded_document_ids": [str(i) for i in identity_excluded_doc_ids],
            "manual_review_required": len(identity_warnings) > 0,
            "warnings": identity_warnings,
        },
    }


# ------------------------------------------------------------------ routes

router = APIRouter()


@router.get("/health")
def health():
    db_ok = check_db_health()
    irda_modern_ok = generate_irda_pdf_modern is not None
    if irda_modern_ok:
        irda_warning = None
    elif weasyprint_error_warning:
        irda_warning = weasyprint_error_warning
    else:
        irda_warning = "WeasyPrint not installed - IRDA form will fall back to legacy renderer. Run `pip install -r requirements.txt`."
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "up" if db_ok else "down",
        "irda_renderer": {
            "modern_available": irda_modern_ok,
            "legacy_available": True,
            "warning": irda_warning,
        },
    }


# ── TPA Directory (DB-backed) ──

# Fallback seed data — used only if DB table is empty (first boot)
_TPA_SEED = [
    ("icici_lombard",       "ICICI Lombard",            "", "Private", "claims@icicilombard.com",       "1800-266-7700", "https://www.icicilombard.com"),
    ("star_health",         "Star Health",              "", "Private", "claims@starhealth.in",          "1800-425-2255", "https://www.starhealth.in"),
    ("hdfc_ergo",           "HDFC ERGO",                "", "Private", "claims@hdfcergo.com",           "1800-266-0700", "https://www.hdfcergo.com"),
    ("bajaj_allianz",       "Bajaj Allianz",            "", "Private", "claims@bajajallianz.co.in",     "1800-209-5858", "https://www.bajajallianz.com"),
    ("new_india",           "New India Assurance",       "", "PSU",     "claims@newindia.co.in",        "1800-209-1415", "https://www.newindia.co.in"),
    ("niva_bupa",           "Niva Bupa",                "", "Private", "claims@nivabupa.com",           "1800-200-5577", "https://www.nivabupa.com"),
    ("care_health",         "Care Health",              "", "Private", "claims@careinsurance.com",      "1800-102-4488", "https://www.careinsurance.com"),
    ("tata_aig",            "Tata AIG",                 "", "Private", "claims@tataaig.com",            "1800-266-7780", "https://www.tataaig.com"),
    ("sbi_general",         "SBI General",              "", "PSU",     "claims@sbigeneral.in",          "1800-102-1111", "https://www.sbigeneral.in"),
    ("oriental_insurance",  "Oriental Insurance",        "", "PSU",     "claims@orientalinsurance.co.in","1800-118-485",  "https://www.orientalinsurance.org.in"),
    ("max_bupa",            "Max Bupa",                 "", "Private", "claims@maxbupa.com",            "1800-200-5577", "https://www.maxbupa.com"),
    ("manipal_cigna",       "ManipalCigna",             "", "Private", "claims@manipalcigna.com",       "1800-266-0800", "https://www.manipalcigna.com"),
    ("united_india",        "United India Insurance",    "", "PSU",     "claims@uiic.co.in",            "1800-425-33-33","https://www.uiic.co.in"),
    ("national_insurance",  "National Insurance",        "", "PSU",     "claims@nic.co.in",             "1800-345-0330", "https://www.nationalinsurance.nic.co.in"),
    ("iffco_tokio",         "IFFCO Tokio",              "", "Private", "claims@iffcotokio.co.in",       "1800-103-5499", "https://www.iffcotokio.co.in"),
    ("reliance_general",    "Reliance General",          "", "Private", "claims@reliancegeneral.co.in",  "1800-102-1010", "https://www.reliancegeneral.co.in"),
    ("cholamandalam",       "Cholamandalam MS",          "", "Private", "claims@cholams.murugappa.com",  "1800-200-5544", "https://www.cholainsurance.com"),
    ("aditya_birla",        "Aditya Birla Health",       "", "Private", "claims@adityabirlacapital.com", "1800-270-7000", "https://www.adityabirlahealthinsurance.com"),
    ("medi_assist",         "Medi Assist (TPA)",         "", "TPA",     "claims@mediassist.in",          "1800-425-3030", "https://www.mediassist.in"),
    ("paramount_health",    "Paramount Health (TPA)",    "", "TPA",     "claims@paramounttpa.com",       "1800-233-8181", "https://www.paramounttpa.com"),
    ("vidal_health",        "Vidal Health (TPA)",        "", "TPA",     "claims@vidalhealth.com",        "1800-425-4033", "https://www.vidalhealth.com"),
    ("heritage_health",     "Heritage Health (TPA)",     "", "TPA",     "claims@heritagehealthtpa.com",  "1800-102-4488", "https://www.heritagehealthtpa.com"),
    ("md_india",            "MD India (TPA)",            "", "TPA",     "claims@maborehealthcaretpa.com","1800-233-3010", "https://www.maborehealthcaretpa.com"),
    ("digital_insurance",   "Go Digit General",          "", "Private", "claims@godigit.com",            "1800-258-5956", "https://www.godigit.com"),
    ("kotak_general",       "Kotak Mahindra General",    "", "Private", "claims@kotakgi.com",            "1800-266-4545", "https://www.kotakgeneralinsurance.com"),
]


def _ensure_tpa_table(db: Session):
    """Create tpa_providers table if missing and seed data."""
    from sqlalchemy import inspect
    insp = inspect(engine)
    if not insp.has_table("tpa_providers"):
        TpaProvider.__table__.create(engine)
        logger.info("Created tpa_providers table")

    count = db.query(TpaProvider).count()
    if count == 0:
        for code, name, logo, ptype, email, phone, website in _TPA_SEED:
            db.add(TpaProvider(code=code, name=name, logo=logo or None, provider_type=ptype, email=email, phone=phone, website=website))
        db.commit()
        logger.info("Seeded %d TPA providers", len(_TPA_SEED))


@router.get("/tpa-list")
def list_tpas(db: Session = Depends(get_db)):
    """Return organizations actually present in the database (organizations table)."""
    rows = (
        db.query(Organization)
        .filter(
            Organization.status == "ACTIVE",
            Organization.type.in_(["INSURER", "TPA"])
        )
        .order_by(Organization.name)
        .all()
    )
    tpa_list = []
    seen = set()
    for o in rows:
        name = (o.name or "").strip()
        norm = name.lower()
        if norm in seen:
            continue
        seen.add(norm)
        tpa_list.append({
            "id": str(o.id),
            "org_id": str(o.id),
            "name": name,
            "logo": "",
            "type": o.type or "TPA",
            "email": "",
            "phone": "",
            "website": "",
        })
    return {"tpas": tpa_list}


def _extract_policy_and_insurer(text: str, filename: str = "") -> tuple[str | None, str | None]:
    """Fast regex-based extractor for health insurance policy number and insurer."""
    if not text:
        return None, None

    INSURERS = [
        ("Star Health", ["star health", "star health and allied", "star health & allied"]),
        ("Care Health", ["care health", "religare", "care insurance"]),
        ("HDFC ERGO", ["hdfc ergo", "hdfc general"]),
        ("ICICI Lombard", ["icici lombard", "icici general"]),
        ("Bajaj Allianz", ["bajaj allianz"]),
        ("New India Assurance", ["new india assurance", "new india"]),
        ("Niva Bupa", ["niva bupa", "max bupa"]),
        ("Tata AIG", ["tata aig"]),
        ("SBI General", ["sbi general", "state bank of india"]),
        ("Oriental Insurance", ["oriental insurance"]),
        ("ManipalCigna", ["manipalcigna", "manipal cigna"]),
        ("United India Insurance", ["united india insurance", "united india"]),
        ("National Insurance", ["national insurance"]),
        ("IFFCO Tokio", ["iffco tokio"]),
        ("Reliance General", ["reliance general"]),
        ("Cholamandalam MS", ["cholamandalam", "chola ms"]),
        ("Aditya Birla Health", ["aditya birla"]),
        ("Medi Assist", ["medi assist", "mediassist"]),
        ("Paramount Health", ["paramount health", "paramount tpa"]),
        ("Vidal Health", ["vidal health", "vidal tpa"]),
        ("Heritage Health", ["heritage health"]),
        ("MD India", ["md india", "mdindia"]),
        ("Go Digit General", ["go digit", "digit general", "digit insurance"]),
        ("Kotak Mahindra General", ["kotak mahindra", "kotak general"]),
    ]

    detected_insurer = None
    combined_search = (filename + " " + text).lower()
    for canonical_name, aliases in INSURERS:
        if any(alias in combined_search for alias in aliases):
            detected_insurer = canonical_name
            break

    patterns = [
        # Explicit labels: Policy No / Policy # / Health Card No / Member ID / UHID
        r"(?im)\b(?:policy\s*(?:no\.?|num|number|#|id)|policy\s*/\s*certificate\s*no\.?|certificate\s*no\.?|policy\s*/\s*health\s*card\s*no\.?|health\s*card\s*(?:no\.?|id)|card\s*no\.?|member\s*id|membership\s*(?:no\.?|id)|uhid|insurance\s*(?:id|no\.?))\s*[:\-=\/|#]?\s*([A-Za-z0-9][A-Za-z0-9\/\-_]{3,35})\b",
        # Multi-line label
        r"(?im)\b(?:policy\s*(?:no\.?|num|number|#|id))\s*[:\-=\/|#]?\s*\n\s*([A-Za-z0-9][A-Za-z0-9\/\-_]{3,35})\b",
        # Standard insurer pattern
        r"\b([A-Z]{1,4}/[0-9]{4,8}/[0-9]{1,4}/[0-9]{2,4}/[0-9]{4,8})\b",
        r"\b([A-Z0-9]{2,5}-[A-Z0-9]{4,10}-[A-Z0-9]{4,10})\b",
    ]

    detected_policy = None
    reject_terms = {
        "number", "policy", "card", "insurance", "hospital", "patient", "valid", "from",
        "date", "none", "null", "n/a", "amount", "rupees", "total", "details", "scheme", "claim"
    }

    for pat in patterns:
        matches = re.finditer(pat, text)
        for m in matches:
            val = m.group(1).strip(" .;:,-_#/")
            if val and val.lower() not in reject_terms and len(val) >= 4:
                detected_policy = val
                break
        if detected_policy:
            break

    return detected_policy, detected_insurer


@router.post("/claims/{claim_id}/extract-policy")
@router.post("/extract-policy")
async def extract_policy_document(
    claim_id: str | None = None,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Fast OCR document extraction for Policy ID & Insurer.
    Runs fast OCR on uploaded policy document/card, auto-links to claim in DB.
    """
    contents = await file.read()
    filename = file.filename or "uploaded_policy_document"
    ext = Path(filename).suffix.lower()

    extracted_text = ""

    # 1. Fast text extraction
    if ext == ".pdf":
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(contents)) as pdf:
                text_chunks = []
                for p in pdf.pages[:5]:
                    t = p.extract_text() or ""
                    if t.strip():
                        text_chunks.append(t)
                extracted_text = "\n".join(text_chunks)
                
                # Scanned PDF fallback via OCR
                if len(extracted_text.strip()) < 30 and pdf.pages:
                    try:
                        import pytesseract
                        img = pdf.pages[0].to_image(resolution=200).original
                        extracted_text = pytesseract.image_to_string(img)
                    except Exception as ocr_err:
                        logger.warning(f"Tesseract OCR fallback on PDF failed: {ocr_err}")
        except Exception as exc:
            logger.warning(f"PDF extraction failed: {exc}")

    if not extracted_text.strip() and ext in [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".tif"]:
        try:
            from PIL import Image
            import pytesseract
            img = Image.open(io.BytesIO(contents))
            extracted_text = pytesseract.image_to_string(img)
        except Exception as exc:
            logger.warning(f"Image OCR failed: {exc}")

    if not extracted_text.strip() and ext in [".txt", ".csv", ".json", ".md", ".html", ".log"]:
        try:
            extracted_text = contents.decode("utf-8", errors="ignore")
        except Exception:
            pass

    # 2. Extract policy ID and insurer
    policy_id, insurer = _extract_policy_and_insurer(extracted_text, filename)

    # 3. If claim_id is provided, store directly to claim in DB
    if claim_id:
        try:
            cid = _parse_uuid(claim_id)
            claim = db.query(Claim).filter(Claim.id == cid).first()
            if claim:
                if policy_id:
                    clean_pol = str(policy_id).strip()
                    claim.policy_id = clean_pol
                    for fname in ["policy_number", "policy_id"]:
                        pf = db.query(ParsedField).filter(
                            ParsedField.claim_id == cid,
                            ParsedField.field_name == fname,
                        ).first()
                        if pf:
                            pf.field_value = clean_pol
                        else:
                            db.add(ParsedField(claim_id=cid, field_name=fname, field_value=clean_pol))
                
                if insurer:
                    for fname in ["insurance_company", "insurer"]:
                        pf = db.query(ParsedField).filter(
                            ParsedField.claim_id == cid,
                            ParsedField.field_name == fname,
                        ).first()
                        if pf:
                            pf.field_value = insurer
                        else:
                            db.add(ParsedField(claim_id=cid, field_name=fname, field_value=insurer))

                # Save uploaded policy document to storage and add Document row
                try:
                    sha = hashlib.sha256(contents).hexdigest()
                    storage_dir = Path("/app/storage/claims") / str(cid)
                    storage_dir.mkdir(parents=True, exist_ok=True)
                    saved_path = storage_dir / filename
                    saved_path.write_bytes(contents)

                    existing_doc = db.query(Document).filter(
                        Document.claim_id == cid,
                        Document.content_hash == sha
                    ).first()
                    if not existing_doc:
                        db.add(Document(
                            claim_id=cid,
                            file_name=filename,
                            file_type=file.content_type or "application/octet-stream",
                            minio_path=str(saved_path),
                            content_hash=sha,
                            doc_type="HEALTH_CARD",
                            display_title=f"Policy / Health Card ({filename})"
                        ))
                except Exception as doc_err:
                    logger.warning(f"Could not save document file to disk/db: {doc_err}")

                db.commit()
                logger.info(f"Policy '{policy_id}' and insurer '{insurer}' saved directly to claim {cid}")
        except Exception as exc:
            logger.warning(f"Failed to link policy to claim {claim_id}: {exc}")

    return {
        "success": True,
        "policy_id": policy_id or "",
        "insurer": insurer or "",
        "extracted": bool(policy_id or insurer),
        "file_name": filename,
        "raw_snippet": (extracted_text[:300] + "...") if len(extracted_text) > 300 else extracted_text,
    }


@router.post("/submit/{claim_id}", response_model=SubmissionOut)
def submit_claim(
    claim_id: str,
    body: SubmitRequest = SubmitRequest(),
    db: Session = Depends(get_db),
):
    """
    Translate claim data to payer format and submit.
    Uses a payer adapter (plugin architecture).
    """
    cid = _parse_uuid(claim_id)

    claim = db.query(Claim).filter(Claim.id == cid).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    # Link policy_id to claim if provided
    if body.policy_id:
        clean_pol = str(body.policy_id).strip()
        claim.policy_id = clean_pol
        for fname in ["policy_number", "policy_id"]:
            existing_pf = db.query(ParsedField).filter(
                ParsedField.claim_id == cid,
                ParsedField.field_name == fname,
            ).first()
            if existing_pf:
                existing_pf.field_value = clean_pol
            else:
                db.add(ParsedField(claim_id=cid, field_name=fname, field_value=clean_pol))

    payer = body.payer or settings.default_payer
    resolved_org_id = None
    if getattr(body, "org_id", None):
        try:
            resolved_org_id = _parse_uuid(body.org_id)
        except Exception:
            resolved_org_id = None

    if not resolved_org_id and payer:
        matched_org = db.query(Organization).filter(
            (Organization.name.ilike(payer)) |
            (Organization.name.ilike(f"%{payer}%"))
        ).first()
        if matched_org:
            resolved_org_id = matched_org.id
            payer = matched_org.name

    if resolved_org_id:
        claim.org_id = resolved_org_id

    claim.insurance_company = payer
    if payer:
        for fname in ["insurance_company", "insurer"]:
            existing_pf = db.query(ParsedField).filter(
                ParsedField.claim_id == cid,
                ParsedField.field_name == fname,
            ).first()
            if existing_pf:
                existing_pf.field_value = payer
            else:
                db.add(ParsedField(claim_id=cid, field_name=fname, field_value=payer))

    # Keep canonical_json synchronized
    if claim.canonical_json:
        canonical = claim.canonical_json
        if isinstance(canonical, str):
            try:
                import json as _json
                canonical = _json.loads(canonical)
            except Exception:
                canonical = {}
        if isinstance(canonical, dict):
            if "patient" not in canonical:
                canonical["patient"] = {}
            if body.policy_id:
                canonical["patient"]["policy_number"] = str(body.policy_id).strip()
            if "insurance" not in canonical:
                canonical["insurance"] = {}
            if payer:
                canonical["insurance"]["company"] = payer
            claim.canonical_json = canonical

    adapter = get_adapter(payer)

    claim_data = _gather_claim_data(db, claim)
    payload = adapter.build_payload(claim_data)
    status, response = adapter.submit(payload)

    sub = Submission(
        claim_id=cid,
        payer=payer,
        request_payload=payload,
        response_payload=response,
        status=status,
    )
    db.add(sub)

    claim.status = "SUBMITTED"
    db.commit()
    db.refresh(sub)

    logger.info("Claim %s submitted to payer '%s' with policy_id '%s' — status=%s", cid, payer, claim.policy_id, status)

    return SubmissionOut(
        submission_id=sub.id,
        claim_id=sub.claim_id,
        payer=sub.payer,
        status=sub.status,
        submitted_at=sub.submitted_at,
    )


@router.get("/{submission_id}", response_model=SubmissionDetailOut)
def get_submission(submission_id: str, db: Session = Depends(get_db)):
    """Retrieve submission details including request/response payloads."""
    sid = _parse_uuid(submission_id)

    sub = db.query(Submission).filter(Submission.id == sid).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    return SubmissionDetailOut(
        submission_id=sub.id,
        claim_id=sub.claim_id,
        payer=sub.payer,
        status=sub.status,
        request_payload=sub.request_payload,
        response_payload=sub.response_payload,
        submitted_at=sub.submitted_at,
    )


@router.get("/claims/{claim_id}/tpa-pdf")
def generate_tpa_claim_pdf(
    claim_id: str,
    tpa_name: str | None = None,
    style: str = "modern",
    view: bool = False,
    db: Session = Depends(get_db),
):
    """Generate a TPA-readable Comprehensive Audit Report PDF for the given claim."""
    claim = _resolve_claim(claim_id, db)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    cid = claim.id

    claim_data = _gather_claim_data_full(db, claim)
    
    # Resolve TPA / Insurer name (Query param > Parsed fields > Payer > Default Star Health)
    resolved_tpa = (
        tpa_name or
        claim_data.get("parsed_fields", {}).get("tpa_name") or
        claim_data.get("parsed_fields", {}).get("tpa") or
        claim_data.get("parsed_fields", {}).get("insurer") or
        claim_data.get("parsed_fields", {}).get("insurance_company") or
        getattr(claim, "payer", None) or
        getattr(claim, "payer_id", None) or
        "Star Health"
    ).strip()
    claim_data["tpa_name"] = resolved_tpa
    
    use_modern = style.lower() == "modern" and generate_tpa_pdf_modern is not None
    if use_modern:
        try:
            pdf_bytes = bytes(generate_tpa_pdf_modern(claim_data))
        except Exception as exc:
            logger.error("Failed to generate modern TPA PDF: %s", exc, exc_info=True)
            pdf_bytes = bytes(generate_tpa_pdf(claim_data))
    else:
        pdf_bytes = bytes(generate_tpa_pdf(claim_data))

    # Build filename from patient name + policy number
    pf = claim_data.get("parsed_fields", {})
    patient = (pf.get("patient_name") or pf.get("member_name") or pf.get("insured_name") or "").strip()
    policy = (pf.get("policy_number") or pf.get("policy_id") or pf.get("policy_no") or claim.policy_id or "").strip()
    # Sanitize for filename: replace spaces with underscores, remove special chars
    import re as _re
    safe_patient = _re.sub(r'[^\w\s-]', '', patient).strip().replace(' ', '_') if patient else ""
    safe_policy = _re.sub(r'[^\w\s-]', '', policy).strip().replace(' ', '_') if policy else ""
    if safe_patient and safe_policy:
        filename = f"TPA_Audit_{safe_patient}_{safe_policy}.pdf"
    elif safe_patient:
        filename = f"TPA_Audit_{safe_patient}.pdf"
    elif safe_policy:
        filename = f"TPA_Audit_{safe_policy}.pdf"
    else:
        filename = f"TPA_Audit_Claim_{str(cid)[:8]}.pdf"

    disp = "inline" if view else "attachment"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'{disp}; filename="{filename}"'},
    )


@router.get("/claims/{claim_id}/irda-pdf")
def generate_irda_claim_pdf(
    claim_id: str,
    blank: bool = False,
    style: str = "modern",
    view: bool = False,
    db: Session = Depends(get_db),
):
    """Generate the IRDA standard reimbursement claim form (Part A + Part B) PDF."""
    claim = _resolve_claim(claim_id, db)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    cid = claim.id

    claim_data = _gather_claim_data_full(db, claim)

    use_modern = style.lower() == "modern" and generate_irda_pdf_modern is not None
    renderer_used = "legacy"
    renderer_warning = ""
    if style.lower() == "modern" and generate_irda_pdf_modern is None:
        renderer_warning = (
            "WeasyPrint not installed - falling back to legacy fpdf2 renderer. "
            "Install with: pip install -r requirements.txt"
        )
        logging.getLogger("submission").warning(
            "IRDA modern style requested but WeasyPrint is unavailable; using legacy renderer",
        )
    if use_modern:
        try:
            pdf_bytes = bytes(generate_irda_pdf_modern(claim_data, blank=blank))
            renderer_used = "modern"
        except Exception as exc:
            logging.getLogger("submission").exception(
                "Modern IRDA renderer failed, falling back to legacy: %s", exc,
            )
            pdf_bytes = bytes(generate_irda_pdf(claim_data, blank=blank))
            renderer_warning = f"Modern renderer failed ({type(exc).__name__}); served legacy."
            use_modern = False
    else:
        pdf_bytes = bytes(generate_irda_pdf(claim_data, blank=blank))

    pf = claim_data.get("parsed_fields", {})
    patient = (pf.get("patient_name") or pf.get("member_name") or pf.get("insured_name") or "").strip()
    policy = (pf.get("policy_number") or pf.get("policy_id") or pf.get("policy_no") or claim.policy_id or "").strip()
    import re as _re
    safe_patient = _re.sub(r'[^\w\s-]', '', patient).strip().replace(' ', '_') if patient else ""
    safe_policy = _re.sub(r'[^\w\s-]', '', policy).strip().replace(' ', '_') if policy else ""
    prefix = "IRDA_BlankForm" if blank else "IRDA_ClaimForm"
    if safe_patient and safe_policy:
        filename = f"{prefix}_{safe_patient}_{safe_policy}.pdf"
    elif safe_patient:
        filename = f"{prefix}_{safe_patient}.pdf"
    elif safe_policy:
        filename = f"{prefix}_{safe_policy}.pdf"
    else:
        filename = f"{prefix}_{str(cid)[:8]}.pdf"
    disp = "inline" if view else "attachment"
    headers = {
        "Content-Disposition": f'{disp}; filename="{filename}"',
        "X-IRDA-Renderer": renderer_used,
    }
    if renderer_warning:
        headers["X-IRDA-Warning"] = renderer_warning
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers=headers,
    )


@router.get("/claims/{claim_id}/preview")
def preview_claim_data(claim_id: str, db: Session = Depends(get_db)):
    """Return full structured claim data as JSON for in-app PDF preview before submission."""
    claim = _resolve_claim(claim_id, db)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    cid = claim.id

    data = _gather_claim_data_full(db, claim)

    # Attach feedback map: { field_name: { original, corrected, updated_at } }
    # so the UI can highlight user-edited fields and offer a one-click revert.
    try:
        fb_rows = (
            db.query(ClaimFieldFeedback)
            .filter(ClaimFieldFeedback.claim_id == cid)
            .all()
        )
        data["field_feedback"] = {
            row.field_name: {
                "original": row.original_value,
                "corrected": row.corrected_value,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
                "user_email": row.user_email,
                "document_id": str(row.document_id) if row.document_id else None,
            }
            for row in fb_rows
        }
    except Exception as exc:
        logger.warning(f"Could not load field_feedback for claim {cid}: {exc}")
        data["field_feedback"] = {}

    # Enrich with formatted summary for UI display
    fields = data.get("parsed_fields", {})
    data["summary"] = {
        "patient_name": fields.get("patient_name") or fields.get("member_name") or fields.get("insured_name", "N/A"),
        "policy_number": fields.get("policy_number") or fields.get("policy_id") or fields.get("policy_no") or data.get("policy_id", "N/A"),
        "age": fields.get("age", "N/A"),
        "gender": fields.get("gender", "N/A"),
        "hospital": fields.get("hospital_name") or fields.get("hospital", "N/A"),
        "doctor": fields.get("doctor_name") or fields.get("provider_name") or fields.get("rendering_provider", "N/A"),
        "admission_date": fields.get("admission_date") or fields.get("service_date") or fields.get("date_of_admission", "N/A"),
        "discharge_date": fields.get("discharge_date", "N/A"),
        "diagnosis": fields.get("diagnosis") or fields.get("primary_diagnosis") or fields.get("chief_complaint", "N/A"),
        "history_of_present_illness": fields.get("history_of_present_illness") or fields.get("present_illness") or fields.get("hopi", "N/A"),
        "past_history": fields.get("past_history") or fields.get("medical_history") or fields.get("past_history_months", "N/A"),
        "disease_history": fields.get("disease_history") or fields.get("history_of_disease") or fields.get("known_comorbidities", "N/A"),
        "allergies": fields.get("allergies") or fields.get("known_allergies", "N/A"),
        "treatment": fields.get("treatment") or fields.get("treatment_given") or fields.get("procedure_performed", "N/A"),
        "discharge_summary": fields.get("discharge_summary") or fields.get("discharge_notes", "N/A"),
        "bank_name": fields.get("bank_name", "N/A"),
        "bank_branch": fields.get("bank_branch", "N/A"),
        "account_holder": fields.get("account_holder") or fields.get("bank_account_name", "N/A"),
        "account_number": fields.get("account_number") or fields.get("bank_account_number", "N/A"),
        "ifsc_code": fields.get("ifsc_code") or fields.get("ifsc", "N/A"),
        "total_amount": (
            f"{data.get('billed_total', 0):.2f}"
            if isinstance(data.get("billed_total"), (int, float)) and data.get("billed_total", 0) > 0
            else (fields.get("total_amount") or fields.get("amount") or fields.get("billed_amount", "N/A"))
        ),
        "icd_count": len(data.get("icd_codes", [])),
        "cpt_count": len(data.get("cpt_codes", [])),
        "risk_score": data["predictions"][0]["rejection_score"] if data.get("predictions") else None,
        "validation_passed": sum(1 for v in data.get("validations", []) if v.get("passed")),
        "validation_total": len(data.get("validations", [])),
        "manual_review_required": bool((data.get("identity_review") or {}).get("manual_review_required")),
    }

    # AI Brain insights — synthesized intelligence from all documents
    try:
        data["brain_insights"] = _generate_brain_insights(data)
    except Exception as exc:
        logger.warning(f"Failed to generate brain insights for claim {cid}: {exc}")
        data["brain_insights"] = []

    # Cross-document reimbursement intelligence
    try:
        data["reimbursement_brain"] = _generate_reimbursement_brain(data)
    except Exception as exc:
        logger.warning(f"Failed to generate reimbursement brain for claim {cid}: {exc}")
        data["reimbursement_brain"] = []

    # Attach structured document list for multi-doc carousel & page image previews
    try:
        doc_rows = db.query(Document).filter(Document.claim_id == cid).order_by(Document.uploaded_at.asc()).all()
        doc_preview_list = []
        for d in doc_rows:
            p_count = getattr(d, "page_count", 1) or 1
            d_type = getattr(d, "doc_type", "hospital_bill") or "hospital_bill"
            d_title = getattr(d, "display_title", None)
            if not d_title:
                d_title = f"{d_type.replace('_', ' ').title()} — {d.file_name}"
            page_urls = [
                f"/claims/{cid}/documents/{d.id}/pages/{p_idx}/image"
                for p_idx in range(1, p_count + 1)
            ]
            doc_preview_list.append({
                "document_id": str(d.id),
                "doc_id": str(d.id),
                "id": str(d.id),
                "original_filename": d.file_name,
                "file_name": d.file_name,
                "file_type": d.file_type,
                "doc_type": d_type,
                "display_title": d_title,
                "page_count": p_count,
                "pages": page_urls,
            })
        data["documents"] = doc_preview_list
    except Exception as e:
        logger.warning(f"Failed to attach document previews to claim response: {e}")

    return data


@router.post("/claims/{claim_id}/code-feedback")
def submit_code_feedback(claim_id: str, db: Session = Depends(get_db), body: dict = None):
    """
    Submit feedback on medical code suggestions for reinforcement learning.
    Body: {"code": "I21.9", "action": "accept|reject|correct", "corrected_code": "I21.3"}
    """
    if body is None:
        body = {}
    cid = _parse_uuid(claim_id)
    claim = db.query(Claim).filter(Claim.id == cid).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    code = body.get("code", "")
    action = body.get("action", "")  # accept, reject, correct
    corrected_code = body.get("corrected_code")

    if action not in ("accept", "reject", "correct"):
        raise HTTPException(status_code=400, detail="action must be accept, reject, or correct")

    if action == "correct" and not corrected_code:
        raise HTTPException(status_code=400, detail="corrected_code required for correct action")

    # Update the medical_code record confidence based on feedback
    codes = db.query(MedicalCode).filter(
        MedicalCode.claim_id == cid,
        MedicalCode.code == code,
    ).all()

    for mc in codes:
        if action == "accept":
            mc.confidence = min(1.0, (mc.confidence or 0.5) + 0.1)
        elif action == "reject":
            mc.confidence = max(0.0, (mc.confidence or 0.5) - 0.3)
        elif action == "correct" and corrected_code:
            mc.confidence = max(0.0, (mc.confidence or 0.5) - 0.2)
            # Add the corrected code
            db.add(MedicalCode(
                claim_id=cid,
                code=corrected_code,
                code_system=mc.code_system,
                description=f"User-corrected from {code}",
                confidence=0.95,
                is_primary=str(mc.is_primary),
            ))

    db.commit()
    logger.info("Code feedback: claim=%s code=%s action=%s", str(cid)[:8], code, action)
    return {"status": "ok", "message": f"Code {code} feedback recorded: {action}"}


@router.put("/claims/{claim_id}/fields")
def update_claim_fields(
    claim_id: str,
    body: dict,
    db: Session = Depends(get_db),
    user: TokenPayload | None = Depends(get_current_user),
):
    """Update parsed fields for a claim.

    Body: ``{"fields": {"patient_name": "...", ...}}``

    Side effects:
      * Upserts rows in ``parsed_fields`` (so the PDF and preview reflect edits).
      * Records a row in ``claim_field_feedback`` with the original parsed value
        (frozen on first edit) + the latest correction + the calling user.
        This powers the UI "original vs current" diff and revert button.
    """
    cid = _parse_uuid(claim_id)
    claim = db.query(Claim).filter(Claim.id == cid).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    fields = body.get("fields", {})
    if not fields:
        raise HTTPException(status_code=400, detail="No fields provided")

    user_sub = user.sub if user else None
    user_email = user.email if user else None

    updated = 0
    feedback_rows = 0
    for field_name, field_value in fields.items():
        new_val = str(field_value) if field_value is not None else ""

        existing = (
            db.query(ParsedField)
            .filter(
                ParsedField.claim_id == cid,
                ParsedField.field_name == field_name,
            )
            .first()
        )
        prev_val = existing.field_value if existing else None

        # Skip no-op edits — don't pollute the feedback table.
        if existing and (prev_val or "") == new_val:
            continue

        if existing:
            existing.field_value = new_val
        else:
            db.add(
                ParsedField(
                    claim_id=cid,
                    field_name=field_name,
                    field_value=new_val,
                )
            )
        updated += 1

        # Upsert feedback row (claim-scoped, document_id NULL).
        fb = (
            db.query(ClaimFieldFeedback)
            .filter(
                ClaimFieldFeedback.claim_id == cid,
                ClaimFieldFeedback.field_name == field_name,
                ClaimFieldFeedback.document_id.is_(None),
            )
            .first()
        )
        if fb is None:
            # Freeze the original (whatever was in parsed_fields prior to this edit).
            db.add(
                ClaimFieldFeedback(
                    claim_id=cid,
                    field_name=field_name,
                    original_value=prev_val,
                    predicted_value=prev_val,
                    corrected_value=new_val,
                    action="edited",
                    user_sub=user_sub,
                    user_email=user_email,
                )
            )
            feedback_rows += 1
        else:
            fb.corrected_value = new_val
            fb.action = "edited"
            fb.user_sub = user_sub or fb.user_sub
            fb.user_email = user_email or fb.user_email

    # Rebuild canonical_json fields block to keep it in sync with edited fields
    if claim.canonical_json:
        canonical = claim.canonical_json
        if isinstance(canonical, str):
            try:
                canonical = _json.loads(canonical)
            except Exception:
                canonical = {}
    else:
        canonical = {}
        
    if "patient" not in canonical:
        canonical["patient"] = {}
    if "hospitalization" not in canonical:
        canonical["hospitalization"] = {}
    if "diagnosis" not in canonical:
        canonical["diagnosis"] = {}
        
    for field_name, field_value in fields.items():
        val_str = str(field_value) if field_value is not None else ""
        if field_name in ("patient_name", "member_name", "insured_name"):
            canonical["patient"]["name"] = val_str
        elif field_name == "age":
            canonical["patient"]["age"] = val_str
        elif field_name in ("gender", "sex"):
            canonical["patient"]["gender"] = val_str
        elif field_name in ("hospital_name", "hospital"):
            canonical["hospitalization"]["hospital_name"] = val_str
        elif field_name in ("doctor_name", "doctor", "provider_name", "rendering_provider"):
            canonical["hospitalization"]["doctor_name"] = val_str
        elif field_name in ("admission_date", "service_date", "date_of_admission"):
            canonical["hospitalization"]["admission_date"] = val_str
        elif field_name == "discharge_date":
            canonical["hospitalization"]["discharge_date"] = val_str
        elif field_name in ("diagnosis", "primary_diagnosis", "chief_complaint"):
            canonical["diagnosis"]["primary"] = val_str
            
    # Sync medical_entities
    canonical["medical_entities"] = {
        "patient_name": canonical["patient"].get("name"),
        "hospital_name": canonical["hospitalization"].get("hospital_name"),
        "doctor_name": canonical["hospitalization"].get("doctor_name"),
        "diagnosis": canonical["diagnosis"].get("primary"),
        "medicines": canonical.get("medical", {}).get("medications") or [],
    }
    
    claim.canonical_json = canonical
    db.commit()
    logger.info(
        "Updated %d field(s) (%d feedback) for claim %s by %s",
        updated,
        feedback_rows,
        str(cid)[:8],
        user_email or user_sub or "anonymous",
    )
    return {"status": "ok", "updated": updated, "feedback_recorded": feedback_rows}


@router.post("/claims/{claim_id}/fields/{field_name}/revert")
def revert_claim_field(
    claim_id: str,
    field_name: str,
    db: Session = Depends(get_db),
    user: TokenPayload | None = Depends(get_current_user),
):
    """Revert a single edited field back to its original (parser-extracted) value.

    Restores ``parsed_fields.field_value`` to the frozen ``original_value``
    captured in ``claim_field_feedback`` and removes the feedback row, so the
    field is once again "clean" (no edited badge).
    """
    cid = _parse_uuid(claim_id)
    claim = db.query(Claim).filter(Claim.id == cid).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    fb = (
        db.query(ClaimFieldFeedback)
        .filter(
            ClaimFieldFeedback.claim_id == cid,
            ClaimFieldFeedback.field_name == field_name,
            ClaimFieldFeedback.document_id.is_(None),
        )
        .first()
    )
    if fb is None:
        raise HTTPException(
            status_code=404,
            detail=f"No feedback recorded for field '{field_name}'",
        )

    original = fb.original_value
    parsed = (
        db.query(ParsedField)
        .filter(
            ParsedField.claim_id == cid,
            ParsedField.field_name == field_name,
        )
        .first()
    )
    if parsed is not None:
        parsed.field_value = original or ""
    else:
        db.add(
            ParsedField(
                claim_id=cid,
                field_name=field_name,
                field_value=original or "",
            )
        )

    db.delete(fb)
    db.commit()
    actor = (user.email if user else None) or (user.sub if user else None) or "anonymous"
    logger.info(
        "Reverted field %s on claim %s (by %s)",
        field_name,
        str(cid)[:8],
        actor,
    )
    return {
        "status": "ok",
        "field_name": field_name,
        "reverted_to": original,
    }


@router.put("/claims/{claim_id}/expenses")
def update_claim_expenses(
    claim_id: str,
    body: dict,
    db: Session = Depends(get_db),
):
    """
    Replace itemized expense parsed_fields for a claim with the provided list.
    Body: {"expenses": [{"category": "Room Charges", "amount": 1234.56}, ...]}

    This stores each row as a ParsedField with model_version="expense-table-ui"
    so the preview and PDF generation will include the updated itemised rows.
    """
    cid = _parse_uuid(claim_id)
    claim = db.query(Claim).filter(Claim.id == cid).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    expenses = body.get("expenses") or []
    if not isinstance(expenses, list):
        raise HTTPException(status_code=400, detail="expenses must be a list")

    # Delete existing expense-like parsed fields (heuristic)
    try:
        del_q = db.query(ParsedField).filter(
            ParsedField.claim_id == cid,
            (
                ParsedField.model_version.ilike("expense-table%") |
                ParsedField.field_name.ilike("expense_table_row_%")
            )
        )
        deleted = del_q.delete(synchronize_session=False)
    except Exception:
        deleted = 0

    import json as _json
    created = 0
    line_items = []
    for i, e in enumerate(expenses):
        try:
            desc = str(e.get("description") or e.get("category") or f"Expense {i+1}")[:200]
            cat = str(e.get("category") or f"Expense {i+1}")[:200]
            amt = float(e.get("amount") or 0)
            # Store a single ParsedField per expense with JSON value {description, category, amount}
            pf = ParsedField(
                claim_id=cid,
                document_id=None,
                field_name=f"expense_table_row_{i+1}",
                field_value=_json.dumps({"description": desc, "category": cat, "amount": amt}),
                model_version="expense-table-ui",
            )
            db.add(pf)
            created += 1
            
            line_items.append({
                "description": desc,
                "amount": str(amt),
                "category": cat
            })
        except Exception:
            continue

    # Rebuild canonical_json expenses block
    if claim.canonical_json:
        canonical = claim.canonical_json
        if isinstance(canonical, str):
            try:
                canonical = _json.loads(canonical)
            except Exception:
                canonical = {}
    else:
        canonical = {}
        
    canonical["expenses"] = {
        "line_items": line_items,
        "item_count": len(line_items)
    }
    
    claim.canonical_json = canonical
    db.commit()
    logger.info("Replaced expenses for claim %s: deleted=%d created=%d", str(cid)[:8], deleted, created)
    return {"status": "ok", "deleted": deleted, "created": created}


@router.put("/claims/{claim_id}/icd-codes")
def update_claim_icd_codes(
    claim_id: str,
    body: dict,
    db: Session = Depends(get_db),
):
    """
    Replace ICD codes for a claim.
    Body: {"codes": [{"code": "...", "description": "...", "confidence": 1.0, "is_primary": true}, ...]}
    """
    cid = _parse_uuid(claim_id)
    claim = db.query(Claim).filter(Claim.id == cid).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    codes = body.get("codes") or []
    if not isinstance(codes, list):
        raise HTTPException(status_code=400, detail="codes must be a list")

    try:
        deleted = db.query(MedicalCode).filter(
            MedicalCode.claim_id == cid,
            MedicalCode.code_system == "ICD10"
        ).delete(synchronize_session=False)
    except Exception:
        deleted = 0

    created = 0
    for c in codes:
        try:
            code_val = str(c.get("code") or "")[:50].strip()
            if not code_val:
                continue
            desc = str(c.get("description") or "")
            conf = c.get("confidence")
            conf_val = float(conf) if conf not in (None, "") else None
            is_primary = bool(c.get("is_primary"))
            
            mc = MedicalCode(
                claim_id=cid,
                code=code_val,
                code_system="ICD10",
                description=desc,
                confidence=conf_val,
                is_primary=is_primary,
            )
            db.add(mc)
            created += 1
        except Exception:
            continue

    db.commit()
    logger.info("Replaced ICD codes for claim %s: deleted=%d created=%d", str(cid)[:8], deleted, created)
    return {"status": "ok", "deleted": deleted, "created": created}


@router.get("/claims/{claim_id}/audit")
def get_audit_log(claim_id: str, db: Session = Depends(get_db)):
    """Return the full audit trail for a claim."""
    from sqlalchemy import text
    cid = _parse_uuid(claim_id)
    # verify claim exists
    claim = db.query(Claim).filter(Claim.id == cid).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    rows = db.execute(
        text("SELECT id, actor, action, metadata, created_at FROM audit_logs WHERE claim_id = :cid ORDER BY created_at ASC"),
        {"cid": str(cid)},
    ).fetchall()

    entries = []
    for r in rows:
        import json
        meta = r[3]
        if isinstance(meta, str):
            try:
                meta = json.loads(meta)
            except Exception:
                pass
        entries.append({
            "id": str(r[0]),
            "actor": r[1],
            "action": r[2],
            "metadata": meta,
            "created_at": r[4].isoformat() if r[4] else None,
        })

    return {"claim_id": str(cid), "audit_trail": entries, "total": len(entries)}


@router.post("/claims/{claim_id}/send-to-tpa")
def send_to_tpa(
    claim_id: str,
    body: dict,
    db: Session = Depends(get_db),
):
    """
    Send a claim to a specific TPA. Generates the TPA PDF, records the submission,
    and simulates dispatch to the selected TPA.
    """
    cid = _parse_uuid(claim_id)
    claim = db.query(Claim).filter(Claim.id == cid).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    tpa_id = body.get("tpa_id", "")
    tpa = db.query(TpaProvider).filter(TpaProvider.code == tpa_id, TpaProvider.is_active).first()
    if not tpa:
        raise HTTPException(status_code=400, detail="Invalid TPA selected")

    # Gather claim data and build submission
    claim_data = _gather_claim_data(db, claim)
    adapter = get_adapter("generic")
    payload = adapter.build_payload(claim_data)

    reference = f"TPA-{tpa.code.upper()[:8]}-{str(cid)[:8]}"

    # Record submission with TPA details
    sub = Submission(
        claim_id=cid,
        payer=tpa.name,
        request_payload={**payload, "tpa_id": tpa.code, "tpa_email": tpa.email or ""},
        response_payload={
            "ack": True,
            "reference": reference,
            "tpa_name": tpa.name,
            "message": f"Claim dispatched to {tpa.name} for processing",
            "status": "DISPATCHED",
        },
        status="SUBMITTED",
    )
    db.add(sub)

    claim.status = "SUBMITTED"
    db.commit()
    db.refresh(sub)

    logger.info("Claim %s sent to TPA '%s' — ref=%s", str(cid)[:8], tpa.name, reference)

    return {
        "status": "success",
        "submission_id": str(sub.id),
        "tpa_name": tpa.name,
        "reference": reference,
        "message": f"Claim successfully sent to {tpa.name}",
    }


# ── TPA Decision Actions ──────────────────────────────────────────

_TPA_ACTION_STATUS = {
    "approve": "APPROVED",
    "reject": "REJECTED",
    "send_back": "MODIFICATION_REQUESTED",
    "request_docs": "DOCUMENTS_REQUESTED",
    "send_money": "SETTLED",
}

@router.post("/claims/{claim_id}/tpa-action")
def tpa_claim_action(
    claim_id: str,
    body: dict,
    db: Session = Depends(get_db),
):
    """
    TPA decision endpoint.  Supported actions:
    - approve   → status = APPROVED
    - reject    → status = REJECTED
    - send_back → status = MODIFICATION_REQUESTED
    - request_docs → status = DOCUMENTS_REQUESTED
    - send_money → status = SETTLED

    Body: {"action": "approve|reject|send_back|request_docs|send_money",
           "reason": "optional text", "requested_documents": ["list of doc types"]}
    """
    from sqlalchemy import text
    from datetime import datetime, timezone
    import json

    cid = _parse_uuid(claim_id)
    claim = db.query(Claim).filter(Claim.id == cid).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    action = (body.get("action") or "").strip().lower()
    if action not in _TPA_ACTION_STATUS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid action '{action}'. Must be one of: {', '.join(_TPA_ACTION_STATUS)}",
        )

    reason = (body.get("reason") or "").strip()
    requested_docs = body.get("requested_documents") or []
    annotations = body.get("annotations") or []

    new_status = _TPA_ACTION_STATUS[action]
    old_status = claim.status
    claim.status = new_status
    db.flush()

    # Record in audit_logs
    try:
        from libs.utils.audit import AuditLogger
        audit = AuditLogger(db, "submission-service")
        audit.log(
            action=f"CLAIM_{action.upper()}",
            claim_id=cid,
            actor="tpa-reviewer",
            metadata={
                "old_status": old_status,
                "new_status": new_status,
                "reason": reason,
                "requested_documents": requested_docs,
                **({"annotations": annotations} if annotations else {}),
            }
        )
    except Exception:
        logger.debug("Audit write failed for tpa-action", exc_info=True)

    db.commit()

    logger.info("TPA action '%s' on claim %s: %s → %s | reason=%s",
                action, str(cid)[:8], old_status, new_status, reason[:80] if reason else "(none)")

    return {
        "status": "success",
        "action": action,
        "claim_id": str(cid),
        "old_status": old_status,
        "new_status": new_status,
        "reason": reason,
        "requested_documents": requested_docs,
        "message": {
            "approve": "Claim has been approved",
            "reject": f"Claim has been rejected{f': {reason}' if reason else ''}",
            "send_back": f"Claim sent back for modification{f': {reason}' if reason else ''}",
            "request_docs": f"Additional documents requested: {', '.join(requested_docs) if requested_docs else reason}",
        }.get(action, "Action completed"),
    }


# ── Include router (standalone mode) ──
app.include_router(router)
