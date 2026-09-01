"""
Modern HTML/CSS-based renderer for the TPA Comprehensive Audit Report.

Uses Jinja2 templates + WeasyPrint to produce a polished, executive-ready
TPA audit dossier that matches the high-end IRDAI Form visual design language
(gradient cover page, frosted-glass summary card, structured section cards,
tabular expense breakdown, AI risk scores, and clinical compliance badges).

Public entry-point: ``generate_tpa_pdf_modern(claim_data)`` returning ``bytes``
— drop-in compatible with the legacy ``generate_tpa_pdf``.
"""

from __future__ import annotations

import base64
import logging
import re
from datetime import datetime
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

from .tpa_pdf import _generate_brain_insights, _generate_reimbursement_brain, generate_tpa_pdf

logger = logging.getLogger("submission.tpa_pdf_modern")

_TEMPLATE_DIR = Path(__file__).resolve().parent / "templates"
_LOGO_PATH = _TEMPLATE_DIR / "claimsguru_white.png"

_env: Environment | None = None


def _jinja_env() -> Environment:
    global _env
    if _env is None:
        _env = Environment(
            loader=FileSystemLoader(str(_TEMPLATE_DIR)),
            autoescape=select_autoescape(["html", "xml"]),
            trim_blocks=True,
            lstrip_blocks=True,
        )
    return _env


def _logo_data_uri() -> str:
    """Read white ClaimsGuru logo image and return as base64 data URI."""
    if _LOGO_PATH.exists():
        try:
            b64 = base64.b64encode(_LOGO_PATH.read_bytes()).decode("ascii")
            return f"data:image/png;base64,{b64}"
        except Exception:
            pass
    return ""


def _tpa_logo_data_uri(tpa_name: str | None) -> str:
    """Read specific TPA/Insurer logo image and return as base64 data URI."""
    if not tpa_name:
        return ""
    
    tpa_lower = tpa_name.lower().strip()
    logo_file = None
    if "star" in tpa_lower:
        logo_file = _TEMPLATE_DIR / "star_health_white.png"
        if not logo_file.exists():
            logo_file = _TEMPLATE_DIR / "star_health_badge.png"
    elif "icici" in tpa_lower or "lombard" in tpa_lower:
        logo_file = _TEMPLATE_DIR / "icici_lombard_white.png"
    elif "hdfc" in tpa_lower or "ergo" in tpa_lower:
        logo_file = _TEMPLATE_DIR / "hdfc_ergo_white.png"
    elif "medi" in tpa_lower or "assist" in tpa_lower:
        logo_file = _TEMPLATE_DIR / "medi_assist_white.png"
    elif "niva" in tpa_lower or "bupa" in tpa_lower:
        logo_file = _TEMPLATE_DIR / "niva_bupa_white.png"
    elif "care" in tpa_lower:
        logo_file = _TEMPLATE_DIR / "care_health_white.png"
    elif "bajaj" in tpa_lower:
        logo_file = _TEMPLATE_DIR / "bajaj_allianz_white.png"
    
    if logo_file and logo_file.exists():
        try:
            b64 = base64.b64encode(logo_file.read_bytes()).decode("ascii")
            return f"data:image/png;base64,{b64}"
        except Exception:
            pass
    return ""


def _money(val: Any) -> str:
    """Format an amount as Indian-grouped rupees (e.g. 45,000)."""
    if val in (None, ""):
        return "0"
    try:
        n = float(str(val).replace(",", "").replace("₹", "").replace("Rs.", "").strip())
    except (TypeError, ValueError):
        return str(val)
    neg = n < 0
    n = abs(n)
    int_part = int(round(n))
    s = str(int_part)
    if len(s) <= 3:
        out = s
    else:
        head, tail = s[:-3], s[-3:]
        head = re.sub(r"(\d)(?=(\d\d)+$)", r"\1,", head)
        out = f"{head},{tail}"
    return f"-{out}" if neg else out


def _clean_val(val: Any, default: str = "") -> str:
    if val is None:
        return default
    s = str(val).strip()
    return s if s else default


def generate_tpa_pdf_modern(claim_data: dict[str, Any]) -> bytes:
    """
    Generate a high-resolution, modern TPA Comprehensive Audit Report PDF.
    
    Args:
        claim_data: Dictionary containing claim data (parsed_fields, summary,
                    expenses, icd_codes, cpt_codes, predictions, validations, documents).
    Returns:
        PDF bytes.
    """
    try:
        import weasyprint
    except ImportError:
        logger.warning("WeasyPrint not installed, falling back to legacy FPDF TPA generator.")
        return generate_tpa_pdf(claim_data)

    try:
        fields = claim_data.get("parsed_fields", {}) or {}
        claim_id = _clean_val(claim_data.get("claim_id") or claim_data.get("id"), "CLM-2026-AUDIT")
        summary_raw = claim_data.get("summary", {}) or {}
        
        # Resolve enrolled TPA / Insurer Name
        tpa_name = _clean_val(
            claim_data.get("tpa_name") or
            claim_data.get("insurer") or
            fields.get("tpa_name") or
            fields.get("tpa") or
            fields.get("insurer") or
            fields.get("insurance_company") or
            summary_raw.get("insurer") or
            summary_raw.get("tpa_name"),
            ""
        )

        tpa_logo_uri = _tpa_logo_data_uri(tpa_name)

        # Build synthesis summary
        patient_name = _clean_val(
            summary_raw.get("patient_name") or fields.get("patient_name") or fields.get("member_name") or fields.get("insured_name"),
            "N/A"
        )
        hospital_name = _clean_val(
            summary_raw.get("hospital") or fields.get("hospital_name") or fields.get("hospital") or fields.get("provider_name"),
            "N/A"
        )
        diagnosis = _clean_val(
            summary_raw.get("diagnosis") or fields.get("primary_diagnosis") or fields.get("diagnosis"),
            "Medical Diagnosis & Treatment"
        )
        policy_no = _clean_val(
            fields.get("policy_number") or fields.get("policy_id") or claim_data.get("policy_id"),
            "N/A"
        )
        member_id = _clean_val(
            fields.get("member_id") or fields.get("uhid") or claim_data.get("patient_id"),
            "N/A"
        )
        
        # Expenses and amounts
        expenses_raw = claim_data.get("expenses", []) or []
        expenses = []
        expense_total = 0.0
        for exp in expenses_raw:
            if isinstance(exp, dict):
                amt = 0.0
                try:
                    amt = float(str(exp.get("amount", 0)).replace(",", "").replace("₹", "").strip())
                except Exception:
                    amt = 0.0
                expense_total += amt
                expenses.append({
                    "category": exp.get("category", "Hospital Charges"),
                    "description": exp.get("description") or exp.get("category", ""),
                    "amount": amt,
                    "amount_formatted": _money(amt),
                })
        
        billed_raw = claim_data.get("billed_total") or fields.get("total_amount") or fields.get("billed_amount") or fields.get("net_payable") or expense_total
        try:
            billed_num = float(str(billed_raw).replace(",", "").replace("₹", "").strip())
        except Exception:
            billed_num = expense_total

        variance_num = abs(billed_num - expense_total) if expense_total > 0 and billed_num > 0 else 0.0
        
        # Risk Prediction
        predictions = claim_data.get("predictions", []) or []
        risk_score = None
        if predictions and isinstance(predictions[0], dict):
            risk_score = predictions[0].get("rejection_score", predictions[0].get("score"))
            try:
                risk_score = float(risk_score)
            except Exception:
                risk_score = 0.20
        elif summary_raw.get("risk_score") is not None:
            try:
                risk_score = float(summary_raw.get("risk_score"))
            except Exception:
                risk_score = 0.20

        # ICD & CPT codes
        icd_codes = claim_data.get("icd_codes", []) or []
        cpt_codes = claim_data.get("cpt_codes", []) or []
        validations = claim_data.get("validations", []) or []
        documents = claim_data.get("documents", []) or []

        # Executive brain insights
        brain_insights = _generate_brain_insights(claim_data)

        # Length of stay
        adm = fields.get("admission_date", "")
        dis = fields.get("discharge_date", "")
        stay_duration = fields.get("length_of_stay", "")
        if not stay_duration and adm and dis:
            try:
                from dateutil import parser as dparser
                d1 = dparser.parse(adm, dayfirst=True)
                d2 = dparser.parse(dis, dayfirst=True)
                diff = (d2 - d1).days
                stay_duration = f"{diff} day(s)" if diff >= 0 else "1 day"
            except Exception:
                stay_duration = "Inpatient Stay"

        summary = {
            "patient_name": patient_name,
            "hospital": hospital_name,
            "diagnosis": diagnosis,
            "policy_number": policy_no,
            "member_id": member_id,
            "tpa_name": tpa_name,
            "insurer": tpa_name,
            "admission_date": fields.get("admission_date") or summary_raw.get("admission_date") or "N/A",
            "discharge_date": fields.get("discharge_date") or summary_raw.get("discharge_date") or "N/A",
            "billed_total": _money(billed_num),
            "status": claim_data.get("status") or "COMPLETED",
            "risk_score": risk_score,
            "age": fields.get("age") or summary_raw.get("age") or "N/A",
            "gender": fields.get("gender") or summary_raw.get("gender") or "N/A",
        }

        context = {
            "claim_id": claim_id,
            "tpa_name": tpa_name,
            "tpa_logo_data_uri": tpa_logo_uri,
            "generated_at": datetime.now().strftime("%d %b %Y, %I:%M %p"),
            "logo_data_uri": _logo_data_uri(),
            "summary": summary,
            "fields": fields,
            "brain_insights": brain_insights,
            "icd_codes": icd_codes,
            "cpt_codes": cpt_codes,
            "expenses": expenses,
            "expense_total_formatted": _money(expense_total),
            "variance_amount": variance_num,
            "variance_formatted": _money(variance_num),
            "predictions": predictions,
            "validations": validations,
            "documents": documents,
            "stay_duration": stay_duration,
        }

        env = _jinja_env()
        template = env.get_template("tpa_form.html")
        html_str = template.render(**context)

        # Generate PDF using WeasyPrint
        pdf_doc = weasyprint.HTML(string=html_str, base_url=str(_TEMPLATE_DIR))
        pdf_bytes = pdf_doc.write_pdf(
            presentational_hints=True,
            optimize_size=("fonts", "images"),
        )
        return pdf_bytes

    except Exception as e:
        logger.error(f"Failed to generate modern TPA PDF: {e}", exc_info=True)
        logger.info("Falling back to legacy FPDF TPA generator...")
        return generate_tpa_pdf(claim_data)