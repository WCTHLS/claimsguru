"""
Feature engineering + scoring engine for claim rejection prediction.

Strategy (ordered by priority):
  1. **XGBoost** — gradient-boosted tree classifier trained on historical claim
     features.  A pre-trained model is loaded from disk; if none exists the
     engine auto-trains on a synthetic dataset so the pipeline always works
     out-of-the-box.
  2. **LightGBM** — used as an ensemble secondary scorer if available.
  3. **Heuristic fallback** — rule-based scorer when neither library is installed.

The feature vector is built from parsed fields, NER entities, and medical codes
produced by upstream services.
"""

from __future__ import annotations

import json
import logging
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, date
import math
from pathlib import Path
from typing import Any

import numpy as np

from .config import settings
from libs.shared.field_mapping import (
    FIELD_ALIASES,
    EXPENSE_FIELDS,
    resolve_field,
    normalize_field_name,
)

logger = logging.getLogger("predictor.engine")

# ------------------------------------------------------------------
# Data types
# ------------------------------------------------------------------

@dataclass
class PredictionResult:
    rejection_score: float
    risk_category: str
    top_reasons: list[dict[str, Any]]
    feature_vector: dict[str, Any]
    model_name: str = settings.model_name
    model_version: str = settings.model_version


# ------------------------------------------------------------------
# Feature engineering (shared by all backends)
# ------------------------------------------------------------------

# Field aliases and expense fields are now centralized in libs.shared.field_mapping
# to avoid duplication across services. Use the imported resolve_field() helper.


def _parse_amount(raw: str | None) -> float:
    """Safely parse an Indian/international currency string to float."""
    if not raw:
        return 0.0
    try:
        # Remove spaces, commas, and currency symbols
        cleaned = str(raw).replace(",", "").replace(" ", "").replace("Rs.", "").replace("₹", "").replace("INR", "").strip()
        return float(cleaned)
    except (ValueError, TypeError):
        return 0.0


def _compute_total_from_expenses(field_map: dict[str, str | None]) -> float:
    """Sum all expense category fields as fallback total.
    
    Uses fuzzy field resolution to match variations like "Surgery Charges",
    "Surgery_Charges", "surgery charges" etc. to canonical "surgery_charges".
    """
    total = 0.0
    found_expenses = []
    
    for fname in EXPENSE_FIELDS.keys():
        # Use resolve_field() to handle spacing/punctuation variations
        val = resolve_field(field_map, fname, normalize_keys=True)
        parsed_val = _parse_amount(val)
        if parsed_val > 0:
            total += parsed_val
            found_expenses.append((fname, val, parsed_val))
    
    if found_expenses:
        logger.debug(f"Found {len(found_expenses)} expense categories: {found_expenses}")
    else:
        # Debug: show what keys are actually in field_map
        logger.debug(f"No expense categories found. Field map keys: {list(field_map.keys())[:10]}")
    
    return total

# Pre-compiled patterns for latency
_DATE_FORMATS = ("%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d", "%d-%b-%Y",
                 "%d/%b/%Y", "%d.%m.%Y", "%m/%d/%Y", "%b %d, %Y")
_PAT_SUM_INSURED = re.compile(
    r"sum\s*insured\s*[:\-]?\s*(?:(?:rs|inr|\$)\.?\s*)?([\d,]+\.?\d*)", re.I
)


def _parse_date(raw: str | None) -> date | None:
    """Best-effort date parse, returns datetime.date or None."""
    if not raw:
        return None
    cleaned = raw.strip()
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    # Last resort: try dateutil if available
    try:
        from dateutil.parser import parse as dateutil_parse
        return dateutil_parse(cleaned, dayfirst=True).date()
    except Exception:
        return None


# Canonical feature order — MUST match training order.
# Extended from 14 → 21 features with medical-context signals.

FEATURE_NAMES = [
    # Axis 1: Core Document Completeness
    "has_patient_name",
    "has_policy_number",
    "has_diagnosis",
    "has_service_date",
    "has_total_amount",
    "has_provider",

    # Document & Coding Stats
    "num_parsed_fields",
    "num_entities",
    "num_icd_codes",
    "num_cpt_codes",
    "has_primary_icd",
    "num_diagnosis_types",

    # Financial Scale
    "total_amount_log",
    "amount_per_cpt_log",

    # Clinical & Stay Severity
    "patient_age_norm",
    "length_of_stay",
    "claim_to_insured_ratio",
    "num_expense_categories",
    "is_icu_admission",
    "has_secondary_diagnosis",
    "surgery_cost_ratio",
    "has_blood_transfusion",
    "has_surgery",

    # True Insurance Audit & Adjudication Signals
    "math_discrepancy_ratio",
    "is_surgical_without_ot",
    "is_daycare_overstay",
    "is_unspecified_investigation_only",
]

# Daycare ICD prefixes that typically require <= 1 day inpatient stay
_DAYCARE_ICD_PREFIXES = ("H25", "H26", "Z49", "Z51", "K29", "K63.5", "L72", "D23", "N18.5", "N18.6")

# Unspecified symptom ICD codes (R00-R99) prone to "investigation only" TPA queries
_SYMPTOM_ONLY_ICD_PREFIXES = ("R50", "R10", "R51", "R53", "R68", "R05", "R06", "R07", "R11", "R42")

_SURGICAL_KEYWORDS = (
    "surgery", "operation", "surgical", "laparoscopy", "appendectomy", "caesarean",
    "c-section", "delivery", "excision", "repair", "resection", "hernia", "cholecystectomy",
    "cataract", "arthroscopy", "hysterectomy", "angioplasty", "cabg", "amputation", "biopsy",
    "uppp", "tors", "pharyngoplasty", "epiglottidectomy", "debridement", "stenting", "graft"
)

_SURGICAL_PATTERN = re.compile(
    r"\b(?:surgery|operation|surgical|laparoscop\w*|endoscop\w*|resection|excision|repair|amputation|biopsy|debridement|cataract|angioplasty|cabg|arthroscop\w*|hernia|caesarean|c-section|delivery|uppp|tors|graft\w*|implant\w*|\w+ectomy|\w+plasty|\w+otomy|\w+ostomy)\b",
    re.IGNORECASE
)


def build_features(
    parsed_fields: list[dict[str, Any]],
    entities: list[dict[str, Any]],
    codes: list[dict[str, Any]],
    expenses: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    logger.info(f"Building features from {len(parsed_fields)} parsed fields")
    """Build a feature vector from upstream pipeline data with true insurance audit checks."""
    field_map: dict[str, str | None] = {
        f["field_name"]: f.get("field_value") for f in parsed_fields
    }

    # --- Resolve canonical fields through aliases ---
    has_service_date = int(bool(resolve_field(field_map, "service_date", normalize_keys=True)))
    has_total_amount_raw = resolve_field(field_map, "total_amount", normalize_keys=True)
    has_provider = int(bool(resolve_field(field_map, "provider_name", normalize_keys=True)))

    # --- Compute itemized expenses sum & mathematical reconciliation ---
    if expenses and len(expenses) > 0:
        itemized_sum = sum(float(e.get("amount") or 0) for e in expenses)
        has_itemized_breakdown = 1
    else:
        itemized_sum = _compute_total_from_expenses(field_map)
        has_itemized_breakdown = int(itemized_sum > 0)

    # --- Compute total billed amount (with fallback to expenses) ---
    amount_val = _parse_amount(has_total_amount_raw)
    if amount_val <= 0.0:
        if itemized_sum > 0.0:
            amount_val = itemized_sum
        else:
            amount_val = _compute_total_from_expenses(field_map)
    has_total_amount = int(amount_val > 0.0)

    math_diff = 0.0
    if amount_val > 0 and has_itemized_breakdown and itemized_sum > 0:
        math_diff = abs(amount_val - itemized_sum)
        rel_diff = math_diff / max(amount_val, 1.0)
        # If difference is negligible (within Rs 10, or < 1% rounding difference, or standard non-payables < 6% where itemized_sum <= amount_val)
        if math_diff <= 10.0 or rel_diff < 0.01 or (rel_diff <= 0.06 and itemized_sum <= amount_val):
            math_discrepancy_ratio = 0.0
        else:
            math_discrepancy_ratio = min(rel_diff, 1.0)
    else:
        math_discrepancy_ratio = 0.0

    # --- ICD/CPT coding & clinical signals ---
    num_icd_from_codes = sum(1 for c in codes if c.get("code_system") == "ICD10")
    num_cpt_from_codes = sum(1 for c in codes if c.get("code_system") == "CPT")

    if num_icd_from_codes == 0:
        num_icd_from_codes = sum(
            1 for f in parsed_fields if f.get("field_name") == "icd_code" and f.get("field_value")
        )
    if num_cpt_from_codes == 0:
        num_cpt_from_codes = sum(
            1 for f in parsed_fields if f.get("field_name") == "cpt_code" and f.get("field_value")
        )

    has_primary_icd = int(any(
        c.get("is_primary") and c.get("code_system") == "ICD10" for c in codes
    ))
    if not has_primary_icd and num_icd_from_codes > 0:
        has_primary_icd = 1

    # Primary ICD code string
    primary_icd_str = ""
    for c in codes:
        if c.get("code_system") == "ICD10":
            primary_icd_str = str(c.get("code") or "").upper().strip()
            if c.get("is_primary"):
                break
    if not primary_icd_str:
        for f in parsed_fields:
            if f.get("field_name") == "icd_code" and f.get("field_value"):
                primary_icd_str = str(f.get("field_value")).upper().strip()
                break

    # Clinical diagnosis text
    raw_diag = str(resolve_field(field_map, "diagnosis", normalize_keys=True) or "").lower()

    # --- Medical context features ---
    age_raw = resolve_field(field_map, "patient_age", normalize_keys=True)
    try:
        age_val = float(str(age_raw).strip()) if age_raw else 0.0
    except (ValueError, TypeError):
        age_val = 0.0
    patient_age_norm = min(max(age_val / 100.0, 0.0), 1.0)

    adm_date = _parse_date(resolve_field(field_map, "admission_date", normalize_keys=True))
    dis_date = _parse_date(resolve_field(field_map, "discharge_date", normalize_keys=True))
    if adm_date and dis_date and dis_date >= adm_date:
        length_of_stay = float(min((dis_date - adm_date).days, 60))
    else:
        length_of_stay = 0.0

    sum_insured_raw = resolve_field(field_map, "sum_insured", normalize_keys=True)
    sum_insured_val = _parse_amount(sum_insured_raw)
    if sum_insured_val <= 0:
        for f in parsed_fields:
            val = f.get("field_value") or ""
            m = _PAT_SUM_INSURED.search(val)
            if m:
                sum_insured_val = _parse_amount(m.group(1))
                if sum_insured_val > 0:
                    break
    if sum_insured_val > 0:
        claim_to_insured = min(amount_val / sum_insured_val, 1.0)
    else:
        claim_to_insured = 0.0

    num_expense_cats = sum(
        1 for fn in EXPENSE_FIELDS.keys() 
        if _parse_amount(resolve_field(field_map, fn, normalize_keys=True)) > 0
    )
    if expenses and len(expenses) > 0:
        num_expense_cats = max(num_expense_cats, len(expenses))

    icu_charges = _parse_amount(resolve_field(field_map, "icu_charges", normalize_keys=True))
    ward_type = (resolve_field(field_map, "ward_type", normalize_keys=True) or "").lower()
    is_icu = int(icu_charges > 0 or "icu" in ward_type)

    num_secondary = sum(
        1 for f in parsed_fields
        if f.get("field_name") == "secondary_diagnosis" and f.get("field_value")
    )
    has_secondary = int(num_secondary > 0)

    surgery_charges = _parse_amount(resolve_field(field_map, "surgery_charges", normalize_keys=True))
    ot_charges = _parse_amount(resolve_field(field_map, "ot_charges", normalize_keys=True))
    if expenses:
        for exp in expenses:
            cat_lower = str(exp.get("category") or "").lower()
            amt = float(exp.get("amount") or 0)
            if any(k in cat_lower for k in ("surgery", "operation", "ot charges", "theatre", "surgeon", "delivery")) and amt > 0:
                surgery_charges = max(surgery_charges, amt)

    has_surgery = int(surgery_charges > 0 or ot_charges > 0)
    surgery_cost_ratio = min(surgery_charges / max(amount_val, 1.0), 1.0) if amount_val > 0 else 0.0

    blood_charges = _parse_amount(resolve_field(field_map, "blood_charges", normalize_keys=True))
    has_blood_transfusion = int(blood_charges > 0)

    # --- TRUE INSURANCE AUDIT SIGNALS ---
    # 1. Surgical condition indicated but zero OT/Surgery charges found in bill
    is_surgical_indicated = bool(_SURGICAL_PATTERN.search(raw_diag)) or any(k in raw_diag for k in _SURGICAL_KEYWORDS) or any(
        c.get("code_system") == "CPT" and str(c.get("code", "")).isdigit() and 10000 <= int(str(c.get("code", "0"))) <= 69999
        for c in codes
    )
    is_surgical_without_ot = int(bool(is_surgical_indicated and not has_surgery))

    # 2. Daycare procedure with extended inpatient hospital stay (>1 day)
    is_daycare_icd = any(primary_icd_str.startswith(p) for p in _DAYCARE_ICD_PREFIXES) or any(
        k in raw_diag for k in ("cataract", "dialysis", "chemotherapy", "endoscopy", "colonoscopy")
    )
    is_daycare_overstay = int(bool(is_daycare_icd and length_of_stay > 1))

    # 3. Unspecified symptom-only code (R00-R99) with no surgery or ICU (investigation-only risk)
    is_symptom_code = any(primary_icd_str.startswith(p) for p in _SYMPTOM_ONLY_ICD_PREFIXES) or (
        primary_icd_str.startswith("R") and len(primary_icd_str) >= 3
    ) or any(k in raw_diag for k in ("fever unspecified", "body ache", "generalized weakness", "for observation"))
    is_unspecified_investigation_only = int(bool(is_symptom_code and not has_surgery and not is_icu and length_of_stay <= 2))

    num_cpt_total = max(num_cpt_from_codes, 1)

    features = {
        # Document completeness
        "has_patient_name":  int(bool(resolve_field(field_map, "patient_name", normalize_keys=True))),
        "has_policy_number": int(bool(resolve_field(field_map, "policy_number", normalize_keys=True))),
        "has_diagnosis":     int(bool(resolve_field(field_map, "diagnosis", normalize_keys=True))),
        "has_service_date":  has_service_date,
        "has_total_amount":  has_total_amount,
        "has_provider":      has_provider,
        # Counts
        "num_parsed_fields": len(parsed_fields),
        "num_entities":      len(entities),
        "num_icd_codes":     num_icd_from_codes,
        "num_cpt_codes":     num_cpt_from_codes,
        "has_primary_icd":   has_primary_icd,
        "num_diagnosis_types": len({
            str(e.get("entity_text", "")).strip().lower() 
            for e in entities 
            if e.get("entity_type") == "DIAGNOSIS" and str(e.get("entity_text", "")).strip()
        }),
        # Financial
        "total_amount_log":     float(np.log1p(amount_val)),
        "amount_per_cpt_log":   float(np.log1p(amount_val / num_cpt_total)),
        # Medical context
        "patient_age_norm":         patient_age_norm,
        "length_of_stay":           length_of_stay,
        "claim_to_insured_ratio":   claim_to_insured,
        "num_expense_categories":   float(num_expense_cats),
        "is_icu_admission":         is_icu,
        "has_secondary_diagnosis":  has_secondary,
        "surgery_cost_ratio":       surgery_cost_ratio,
        "has_blood_transfusion":    has_blood_transfusion,
        "has_surgery":              has_surgery,
        # Real Insurance Audit Signals
        "math_discrepancy_ratio":            float(math_discrepancy_ratio),
        "is_surgical_without_ot":            is_surgical_without_ot,
        "is_daycare_overstay":               is_daycare_overstay,
        "is_unspecified_investigation_only": is_unspecified_investigation_only,
    }
    logger.debug(f"---------Features for rejection prediction---------\n{chr(10).join(f'{k}: {v}' for k, v in features.items())}")
    return features


def _features_to_array(features: dict[str, Any]) -> np.ndarray:
    """Convert feature dict → 1-D numpy array in canonical order."""
    return np.array([float(features.get(f, 0)) for f in FEATURE_NAMES], dtype=np.float32)


def _score_to_category(score: float) -> str:
    """Map a 0–1 rejection score to a human-readable risk category (aligned with TPA standard)."""
    if score <= 0.30:
        return "LOW"
    elif score <= 0.60:
        return "MEDIUM"
    else:
        return "HIGH"


# ------------------------------------------------------------------
# XGBoost model management
# ------------------------------------------------------------------
_MODEL_DIR = Path(os.getenv("PREDICTOR_MODEL_DIR", "models"))
_XGB_PATH = _MODEL_DIR / "xgb_rejection.json"
_LGBM_PATH = _MODEL_DIR / "lgbm_rejection.txt"

_xgb_model = None
_lgbm_model = None
_models_load_attempted = False


def _validate_lightgbm_model_file(model_path: Path, num_features: int) -> bool:
    """
    Validate a LightGBM model in a subprocess.

    Some malformed model files can trigger native LightGBM fatals that abort
    the interpreter process; subprocess isolation keeps the service alive.
    """
    script = (
        "import sys\n"
        "from pathlib import Path\n"
        "import numpy as np\n"
        "import lightgbm as lgb\n"
        "p=Path(sys.argv[1])\n"
        "n=int(sys.argv[2])\n"
        "b=lgb.Booster(model_file=str(p))\n"
        "_ = b.predict(np.zeros((1,n),dtype=float))\n"
        "print('OK')\n"
    )
    try:
        completed = subprocess.run(
            [sys.executable, "-c", script, str(model_path), str(num_features)],
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
        )
        if completed.returncode == 0:
            return True
        logger.warning(
            "LightGBM model validation failed (code=%s): %s",
            completed.returncode,
            (completed.stderr or completed.stdout or "").strip()[:500],
        )
        return False
    except Exception:
        logger.warning("LightGBM model validation probe failed", exc_info=True)
        return False


def _generate_synthetic_data(n_samples: int = 3000, seed: int = 42):
    rng = np.random.RandomState(seed)
    n_feat = len(FEATURE_NAMES)
    X = np.zeros((n_samples, n_feat), dtype=np.float32)
    y = np.zeros(n_samples, dtype=np.int32)

    for i in range(n_samples):
        # --- Document completeness (6 binary) ---
        has_name     = rng.choice([0, 1], p=[0.03, 0.97])
        has_policy   = rng.choice([0, 1], p=[0.05, 0.95])
        has_diag     = rng.choice([0, 1], p=[0.05, 0.95])
        has_date     = rng.choice([0, 1], p=[0.04, 0.96])
        has_amount   = rng.choice([0, 1], p=[0.04, 0.96])
        has_provider = rng.choice([0, 1], p=[0.05, 0.95])

        # --- Counts (Dependent on parsing flags) ---
        n_fields     = rng.randint(3, 40)
        base_ents = rng.randint(2, 8)
        if has_diag:
            base_ents += rng.randint(1, 5)

        n_ents = base_ents
        if has_diag:
            n_icd = rng.choice([0, 1, 2, 3, 4], p=[0.08, 0.35, 0.30, 0.17, 0.10])
        else:
            n_icd = 0
        n_cpt        = rng.randint(1, 4) if has_amount else 0
        has_pri      = int(n_icd > 0 and rng.random() > 0.10)
        n_diag_entities = rng.randint(0, n_ents + 1)
        n_diag_types = min(n_diag_entities, rng.randint(1, 4))

        # --- Financial ---
        if has_amount:
            amount = rng.lognormal(10.0, 1.2)  # median ~₹22k
            amount_log = float(np.log1p(amount))
            cpt_denom = max(1, n_cpt)
            amt_per_cpt = float(np.log1p(amount / cpt_denom))
        else:
            amount = 0.0
            amount_log = 0.0
            amt_per_cpt = 0.0

        # --- Medical context ---
        age          = max(0, min(100, rng.normal(42, 18)))
        age_norm     = age / 100.0
        los          = float(rng.choice([1, 2, 3, 5, 7, 10, 14, 21, 30],
                                        p=[0.18, 0.25, 0.20, 0.14, 0.09, 0.06, 0.04, 0.02, 0.02]))
        
        sum_insured  = rng.choice([100000, 200000, 300000, 400000, 500000, 1000000],
                                  p=[0.10, 0.15, 0.20, 0.25, 0.20, 0.10])
        
        claim_ratio  = min(amount / max(sum_insured, 1.0), 1.0) if has_amount else 0.0
        n_exp_cats   = float(rng.randint(3, 12)) if has_amount else 0.0
        is_icu       = rng.choice([0, 1], p=[0.82, 0.18])
        has_sec_diag = rng.choice([0, 1], p=[0.60, 0.40]) if n_icd > 1 else 0
        
        has_surg     = rng.choice([0, 1], p=[0.60, 0.40])
        surg_ratio   = rng.beta(2, 5) if (has_surg and has_amount) else 0.0
        has_blood    = rng.choice([0, 1], p=[0.88, 0.12])

        # --- Real Insurance Audit Signals (4 new) ---
        has_math_gap = rng.choice([0, 1], p=[0.85, 0.15]) if has_amount else 0
        math_disc    = float(rng.uniform(0.06, 0.40)) if has_math_gap else 0.0

        is_surg_no_ot = int(has_surg and rng.random() < 0.12)
        is_daycare_case = int(rng.random() < 0.15)
        is_dc_overstay = int(is_daycare_case and los > 1)
        is_unspec_investigation = int((not has_surg) and (not is_icu) and los <= 2 and rng.random() < 0.12)

        # --- Array Assignment (Strictly matching 27 elements) ---
        X[i] = [
            has_name, has_policy, has_diag, has_date, has_amount, has_provider,
            n_fields, n_ents, n_icd, n_cpt, has_pri, n_diag_types,
            amount_log, amt_per_cpt,
            age_norm, los, claim_ratio, n_exp_cats,
            is_icu, has_sec_diag, surg_ratio, has_blood, has_surg,
            math_disc, is_surg_no_ot, is_dc_overstay, is_unspec_investigation
        ]

        # --- Rejection probability logic grounded in true insurance rules ---
        reject_prob = 0.04  # clean baseline

        # AXIS 1: Missing critical fields
        missing = sum(1 for v in [has_name, has_policy, has_diag, has_date, has_amount, has_provider] if v == 0)
        reject_prob += missing * 0.16

        if n_icd == 0:
            reject_prob += 0.08
        if not has_pri and n_icd > 0:
            reject_prob += 0.04
        if n_fields < 5:
            reject_prob += 0.08

        # AXIS 2: True Insurance Audit Anomalies
        if math_disc > 0.10:
            reject_prob += 0.28
        elif math_disc > 0.03:
            reject_prob += 0.16

        if is_surg_no_ot:
            reject_prob += 0.26

        if is_dc_overstay:
            reject_prob += 0.20

        if is_unspec_investigation:
            reject_prob += 0.22

        # AXIS 3: Medical & Financial Severity
        if amount > 1200000:       # > 12 lakh
            reject_prob += 0.20
        elif amount > 440000:      # > 4.4 lakh
            reject_prob += 0.10
        elif amount > 100000:      # > 1 lakh
            reject_prob += 0.04

        if claim_ratio > 0.85:
            reject_prob += 0.18
        elif claim_ratio > 0.50:
            reject_prob += 0.08

        if los > 21:
            reject_prob += 0.15
        elif los > 14:
            reject_prob += 0.08

        if is_icu:
            reject_prob += 0.08
        if has_surg and surg_ratio > 0.50:
            reject_prob += 0.10
        elif has_surg:
            reject_prob += 0.05

        if has_blood:
            reject_prob += 0.06

        if has_sec_diag:
            reject_prob += 0.06

        # Check for truly clean, mathematically reconciled claims
        if missing == 0 and math_disc < 0.02 and not is_surg_no_ot and not is_dc_overstay and not is_unspec_investigation and amount <= 150000 and los <= 5 and not is_icu:
            reject_prob = 0.05

        # Bounds safety and sampling
        reject_prob = min(max(reject_prob, 0.03), 0.95)
        y[i] = int(rng.random() < reject_prob)

    return X, y


def _train_xgboost():
    """Train an XGBoost model on synthetic data and save it."""
    try:
        import xgboost as xgb
    except ImportError:
        logger.warning("xgboost not installed — cannot train model")
        return None

    logger.info("Training XGBoost rejection model on synthetic data …")
    X, y = _generate_synthetic_data()

    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="logloss",
        random_state=42,
    )
    model.fit(X, y)

    _MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model.save_model(str(_XGB_PATH))
    logger.info("XGBoost model saved to %s", _XGB_PATH)

    # Save feature importance for explainability
    importance = dict(zip(FEATURE_NAMES, [float(v) for v in model.feature_importances_], strict=False))
    (_MODEL_DIR / "xgb_feature_importance.json").write_text(json.dumps(importance, indent=2))

    return model


def _train_lightgbm():
    """Train a LightGBM model on synthetic data and save it."""
    try:
        import lightgbm as lgb
    except ImportError:
        logger.info("lightgbm not installed — skipping secondary model")
        return None

    logger.info("Training LightGBM rejection model on synthetic data …")
    X, y = _generate_synthetic_data(seed=99)

    model = lgb.LGBMClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        verbose=-1,
    )
    model.fit(X, y)

    _MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model.booster_.save_model(str(_LGBM_PATH))
    logger.info("LightGBM model saved to %s", _LGBM_PATH)
    return model


def _optimize_and_save_ensemble_weights(xgb_model, lgbm_model):
    """Grid search to dynamically find optimal blending weights."""
    logger.info("Optimizing ensemble trust weights...")
    X_val, y_val = _generate_synthetic_data(n_samples=500, seed=123)
    xgb_preds = xgb_model.predict_proba(X_val)[:, 1]
    lgb_preds = lgbm_model.predict(X_val)
    
    best_acc = 0.0
    best_weight = 0.6
    for w in np.linspace(0.0, 1.0, 51):
        ensemble_preds = w * xgb_preds + (1.0 - w) * lgb_preds
        acc = float(np.mean((ensemble_preds > 0.5) == y_val))
        if acc > best_acc:
            best_acc = acc
            best_weight = float(w)
            
    logger.info("Optimal XGBoost trust score found: %.2f (Acc: %.2f)", best_weight, best_acc)
    (_MODEL_DIR / "ensemble_weights.json").write_text(json.dumps({"xgb_weight": best_weight}))
    return best_weight


def _load_models():
    """Load (or train) XGBoost + LightGBM models."""
    global _xgb_model, _lgbm_model, _models_load_attempted, _ensemble_xgb_weight
    if _models_load_attempted:
        return
    _models_load_attempted = True

    expected_n_features = len(FEATURE_NAMES)

    # --- XGBoost ---
    try:
        import xgboost as xgb
        if _XGB_PATH.exists():
            _xgb_model = xgb.XGBClassifier()
            _xgb_model.load_model(str(_XGB_PATH))
            # Detect feature-count mismatch (e.g. saved model from a previous
            # FEATURE_NAMES revision). XGBClassifier exposes n_features_in_
            # after load on modern xgboost; falls back to booster info.
            saved_n = getattr(_xgb_model, "n_features_in_", None)
            if saved_n is None:
                try:
                    saved_n = _xgb_model.get_booster().num_features()
                except Exception:
                    saved_n = None
            if saved_n is not None and saved_n != expected_n_features:
                logger.warning(
                    "XGBoost model feature count mismatch (saved=%d, expected=%d); retraining",
                    saved_n, expected_n_features,
                )
                # Stale ensemble weights are paired with the old feature set.
                _stale_weights = _MODEL_DIR / "ensemble_weights.json"
                if _stale_weights.exists():
                    try:
                        _stale_weights.unlink()
                    except OSError:
                        pass
                _xgb_model = _train_xgboost()
            else:
                logger.info("XGBoost model loaded from %s", _XGB_PATH)
        else:
            _xgb_model = _train_xgboost()
    except ImportError:
        logger.debug("xgboost not installed — will use heuristic fallback")
    except Exception:
        logger.warning("Failed to load/train XGBoost model", exc_info=True)

    # --- LightGBM ---
    try:
        import lightgbm as lgb
        if _LGBM_PATH.exists():
            if _validate_lightgbm_model_file(_LGBM_PATH, expected_n_features):
                _lgbm_model = lgb.Booster(model_file=str(_LGBM_PATH))
                logger.info("LightGBM model loaded from %s", _LGBM_PATH)
            else:
                logger.warning(
                    "LightGBM model at %s has wrong feature count for current FEATURE_NAMES (%d); retraining",
                    _LGBM_PATH, expected_n_features,
                )
                trained = _train_lightgbm()
                if trained is not None and _validate_lightgbm_model_file(_LGBM_PATH, expected_n_features):
                    _lgbm_model = trained.booster_
                else:
                    logger.warning("LightGBM retrain failed validation; disabling LightGBM")
        else:
            trained = _train_lightgbm()
            if trained is not None:
                if _validate_lightgbm_model_file(_LGBM_PATH, expected_n_features):
                    _lgbm_model = trained.booster_
                else:
                    logger.warning("Trained LightGBM model failed validation; disabling LightGBM")
    except ImportError:
        logger.debug("lightgbm not installed — skipping secondary model")
    except Exception:
        logger.warning("Failed to load/train LightGBM model", exc_info=True)

    # --- Ensemble Weights ---
    weights_path = _MODEL_DIR / "ensemble_weights.json"
    if weights_path.exists():
        try:
            _ensemble_xgb_weight = json.loads(weights_path.read_text()).get("xgb_weight", 0.6)
        except Exception:
            pass
    elif _xgb_model is not None and _lgbm_model is not None:
        _ensemble_xgb_weight = _optimize_and_save_ensemble_weights(_xgb_model, _lgbm_model)

# ------------------------------------------------------------------
# Reason explanation via feature importance
# ------------------------------------------------------------------

_FEATURE_REASON_MAP = {
    "has_patient_name": "Missing patient name",
    "has_policy_number": "Missing policy number",
    "has_diagnosis": "Missing primary clinical diagnosis",
    "has_service_date": "Missing admission / service date",
    "has_total_amount": "Missing billed total amount",
    "has_provider": "Missing hospital / medical provider name",
    "num_parsed_fields": "Very few parsed fields — possible poor scan quality",
    "num_entities": "Few medical entities detected",
    "num_icd_codes": "No ICD-10 medical codes designated",
    "num_cpt_codes": "No CPT procedure codes found",
    "has_primary_icd": "No primary ICD code designated",
    "num_diagnosis_types": "Limited diagnosis diversity detected",
    "total_amount_log": "High claim amount requiring senior TPA scrutiny",
    "amount_per_cpt_log": "Billed amount is high relative to procedures performed",
    "patient_age_norm": "Patient age in high-risk bracket",
    "length_of_stay": "Extended hospital stay requires clinical justification",
    "claim_to_insured_ratio": "Claim amount is a large portion of sum insured",
    "num_expense_categories": "Many diverse expense categories",
    "is_icu_admission": "ICU admission requires intensive care vitals chart",
    "has_secondary_diagnosis": "Multiple comorbidities present",
    "surgery_cost_ratio": "Surgery cost dominates total bill",
    "has_blood_transfusion": "Blood transfusion required",
    "has_surgery": "Surgical procedure performed",
    "math_discrepancy_ratio": "Itemized bill line items do not reconcile with the final billed amount",
    "is_surgical_without_ot": "Surgical diagnosis indicated without documented Operation Theatre (OT) or surgeon charges",
    "is_daycare_overstay": "Daycare procedure (cataract/dialysis/endoscopy) has extended inpatient stay (>1 day)",
    "is_unspecified_investigation_only": "Unspecified symptom code without active surgical or ICU intervention (risk of investigation-only query)",
}

# Features that are severity indicators, NOT document-completeness flags.
# Missing these should NOT be treated as a penalty.
_SEVERITY_FEATURES = {"has_secondary_diagnosis", "has_blood_transfusion", "has_surgery"}


def _explain_prediction(features: dict[str, Any], score: float) -> list[dict[str, Any]]:
    """Generate human-readable reasons sorted by contribution."""
    reasons: list[dict[str, Any]] = []

    # Priority 1: Real Insurance Audit Anomalies
    math_disc = features.get("math_discrepancy_ratio", 0.0)
    billed_amt = features.get("total_billed_amount", 0.0)
    if billed_amt <= 0.0:
        amount_log = features.get("total_amount_log", 0.0)
        billed_amt = round(math.exp(amount_log) - 1.0) if amount_log > 0 else 0.0
    item_sum = features.get("itemized_sum", 0.0)
    has_itemized = features.get("num_expense_categories", 0.0) > 0 or item_sum > 0
    math_diff = abs(billed_amt - item_sum) if (billed_amt > 0 and item_sum > 0) else 0.0

    if math_disc > 0.01 and billed_amt > 0 and item_sum > 0:
        reasons.append({
            "reason": f"Itemized bill expenses (₹{item_sum:,.0f}) differ from billed total (₹{billed_amt:,.0f}) by ₹{math_diff:,.0f} ({math_disc*100:.0f}% variance)",
            "feature": "math_discrepancy_ratio",
            "weight": 0.28 if math_disc > 0.10 else 0.16,
        })
    elif billed_amt > 0 and not has_itemized:
        reasons.append({
            "reason": f"Itemized bill breakup / annexure not attached (only summary total ₹{billed_amt:,.0f} provided)",
            "feature": "math_discrepancy_ratio",
            "weight": 0.12,
        })
    elif billed_amt == 0 and not has_itemized:
        reasons.append({
            "reason": "No hospital bill or itemized expense statement attached. Billed claim amount cannot be determined.",
            "feature": "math_discrepancy_ratio",
            "weight": 0.26,
        })

    if features.get("is_surgical_without_ot"):
        reasons.append({
            "reason": "Surgical procedure indicated without documented Operation Theatre (OT) or surgeon charges",
            "feature": "is_surgical_without_ot",
            "weight": 0.25,
        })

    if features.get("is_daycare_overstay"):
        reasons.append({
            "reason": "Daycare procedure (cataract/dialysis/endoscopy) has extended inpatient stay (>1 day)",
            "feature": "is_daycare_overstay",
            "weight": 0.20,
        })

    if features.get("is_unspecified_investigation_only"):
        reasons.append({
            "reason": "Primary diagnosis is an unspecified symptom code without active surgical or ICU intervention",
            "feature": "is_unspecified_investigation_only",
            "weight": 0.22,
        })

    # Priority 2: Missing Core Booleans
    for fname in FEATURE_NAMES:
        val = features.get(fname, 0)
        if fname.startswith("has_") and fname not in _SEVERITY_FEATURES and not val:
            reasons.append({
                "reason": _FEATURE_REASON_MAP.get(fname, fname),
                "feature": fname,
                "weight": 0.15,
            })
        elif fname in ("num_icd_codes", "num_cpt_codes") and val == 0:
            reasons.append({
                "reason": _FEATURE_REASON_MAP.get(fname, fname),
                "feature": fname,
                "weight": 0.08,
            })
        elif fname == "claim_to_insured_ratio" and val > 0.85:
            reasons.append({
                "reason": _FEATURE_REASON_MAP[fname],
                "feature": fname,
                "weight": 0.15,
            })
        elif fname == "length_of_stay" and val > 14:
            reasons.append({
                "reason": _FEATURE_REASON_MAP[fname],
                "feature": fname,
                "weight": 0.08,
            })

    if not reasons and score <= 0.20:
        reasons.append({
            "reason": "Complete documentation with mathematically verified line items and consistent clinical coding",
            "feature": "clean_claim",
            "weight": 0.01,
        })

    reasons.sort(key=lambda r: r["weight"], reverse=True)
    return reasons[:5]


# ------------------------------------------------------------------
# Public prediction API
# ------------------------------------------------------------------

def predict(features: dict[str, Any]) -> PredictionResult:
    """
    Score a claim for rejection risk.

    Uses XGBoost (primary) + LightGBM (ensemble) when available,
    with automatic fallback to a heuristic scorer.
    """
    _load_models()
    feat_array = _features_to_array(features).reshape(1, -1)

    # --- XGBoost prediction ---
    if _xgb_model is not None:
        try:
            xgb_proba = float(_xgb_model.predict_proba(feat_array)[0, 1])
            logger.info(f"XGBoost predicted rejection probability: {xgb_proba}")

            # Ensemble with LightGBM if available
            if _lgbm_model is not None:
                try:
                    lgbm_proba = float(_lgbm_model.predict(feat_array)[0])
                    score = _ensemble_xgb_weight * xgb_proba + (1.0 - _ensemble_xgb_weight) * lgbm_proba
                    model_label = f"xgboost+lightgbm-ensemble(w={_ensemble_xgb_weight:.2f})"

                    logger.info(f"LightGBM predicted rejection probability: {lgbm_proba}")
                    logger.info(f"Ensembled rejection probability with {model_label}: \n {score} ")

                except Exception:
                    score = xgb_proba
                    model_label = "xgboost"
            else:
                score = xgb_proba
                model_label = "xgboost"

            # ------------------------------------------------------------------
            # Catastrophic completeness override
            # ------------------------------------------------------------------
            missing_critical = sum([
                not features.get("has_patient_name"),
                not features.get("has_policy_number"),
                not features.get("has_diagnosis"),
                not features.get("has_service_date"),
                not features.get("has_total_amount"),
                not features.get("has_provider"),
            ])

            if missing_critical >= 4:
                score = max(score, 0.65)

            # Heuristic audit & severity verification
            heur_result = _predict_heuristic(features)
            score = max(score, heur_result.rejection_score)

            score = round(min(max(score, 0.04), 0.95), 4)
            reasons = heur_result.top_reasons if heur_result.top_reasons else _explain_prediction(features, score)

            return PredictionResult(
                rejection_score=score,
                risk_category=_score_to_category(score),
                top_reasons=reasons,
                feature_vector=features,
                model_name=model_label,
                model_version=settings.model_version,
            )
        except Exception:
            logger.warning("XGBoost predict failed — falling back to heuristic", exc_info=True)

    # --- Heuristic fallback ---
    return _predict_heuristic(features)


def _predict_heuristic(features: dict[str, Any]) -> PredictionResult:
    """True insurance adjudication rule-based risk scorer."""
    completeness_score = 0.0
    audit_risk_score = 0.0
    severity_score = 0.0
    reasons: list[dict[str, Any]] = []

    # AXIS 1: Document Completeness
    critical = [
        ("has_patient_name", "Missing patient name", 0.12),
        ("has_policy_number", "Missing policy number", 0.10),
        ("has_diagnosis", "Missing primary clinical diagnosis", 0.15),
        ("has_service_date", "Missing date of service / admission date", 0.10),
        ("has_total_amount", "Missing total billed amount", 0.15),
        ("has_provider", "Missing hospital / medical provider name", 0.08),
    ]
    for key, reason, weight in critical:
        if not features.get(key):
            completeness_score += weight
            reasons.append({"reason": reason, "weight": weight})

    if features.get("num_icd_codes", 0) == 0:
        completeness_score += 0.06
        reasons.append({"reason": "No standardized ICD-10 medical codes mapped", "weight": 0.06})

    # AXIS 2: True Insurance Audit Anomalies
    math_disc = features.get("math_discrepancy_ratio", 0.0)
    billed_amt = features.get("total_billed_amount", 0.0)
    if billed_amt <= 0.0:
        amount_log = features.get("total_amount_log", 0.0)
        billed_amt = round(math.exp(amount_log) - 1.0) if amount_log > 0 else 0.0
    item_sum = features.get("itemized_sum", 0.0)
    has_itemized = features.get("num_expense_categories", 0.0) > 0 or item_sum > 0
    math_diff = abs(billed_amt - item_sum) if (billed_amt > 0 and item_sum > 0) else 0.0

    if math_disc > 0.10 and billed_amt > 0 and item_sum > 0:
        audit_risk_score += 0.28
        reasons.append({"reason": f"Itemized bill line items (₹{item_sum:,.0f}) differ significantly from billed total (₹{billed_amt:,.0f}) by ₹{math_diff:,.0f} ({math_disc*100:.0f}% variance)", "weight": 0.28})
    elif math_disc > 0.01 and billed_amt > 0 and item_sum > 0:
        audit_risk_score += 0.16
        reasons.append({"reason": f"Itemized bill expenses (₹{item_sum:,.0f}) do not fully reconcile with billed total (₹{billed_amt:,.0f}) by ₹{math_diff:,.0f} ({math_disc*100:.0f}% variance)", "weight": 0.16})
    elif billed_amt > 0 and not has_itemized:
        audit_risk_score += 0.12
        reasons.append({"reason": f"Itemized bill breakup / annexure not attached (only summary total ₹{billed_amt:,.0f} provided)", "weight": 0.12})
    elif billed_amt == 0 and not has_itemized:
        audit_risk_score += 0.26
        reasons.append({"reason": "No hospital bill or itemized expense statement attached. Billed claim amount cannot be determined.", "weight": 0.26})

    if features.get("is_surgical_without_ot"):
        audit_risk_score += 0.25
        reasons.append({"reason": "Surgical procedure indicated without documented Operation Theatre (OT) or surgeon charges", "weight": 0.25})

    if features.get("is_daycare_overstay"):
        audit_risk_score += 0.20
        reasons.append({"reason": "Daycare procedure (cataract/dialysis/endoscopy) has extended inpatient stay (>1 day)", "weight": 0.20})

    if features.get("is_unspecified_investigation_only"):
        audit_risk_score += 0.22
        reasons.append({"reason": "Primary diagnosis is an unspecified symptom code without active surgical or ICU intervention (risk of investigation-only query)", "weight": 0.22})

    # AXIS 3: Financial & Medical Severity Signals
    amount_log = features.get("total_amount_log", 0)
    if amount_log > 14.0:       # > ~12 lakh
        severity_score += 0.22
        reasons.append({"reason": "High-value claim (> ₹12 Lakh) attracts mandatory senior TPA scrutiny", "weight": 0.22})
    elif amount_log > 13.0:     # > ~4.4 lakh
        severity_score += 0.14
        reasons.append({"reason": "Substantial claim amount (> ₹4.4 Lakh)", "weight": 0.14})
    elif amount_log > 11.5:     # > ~1 lakh
        severity_score += 0.08
        reasons.append({"reason": "Significant claim amount (> ₹1 Lakh)", "weight": 0.08})

    if features.get("has_surgery"):
        severity_score += 0.06
        reasons.append({"reason": "Surgical procedure performed", "weight": 0.06})

    if features.get("has_blood_transfusion"):
        severity_score += 0.06
        reasons.append({"reason": "Blood transfusion required during hospitalization", "weight": 0.06})

    if features.get("has_secondary_diagnosis"):
        severity_score += 0.08
        reasons.append({"reason": "Multiple diagnoses / comorbidities present", "weight": 0.08})

    if features.get("num_icd_codes", 0) >= 3:
        severity_score += 0.08
        reasons.append({"reason": "Multi-code clinical case complexity", "weight": 0.08})
    elif features.get("num_icd_codes", 0) >= 2:
        severity_score += 0.04

    if features.get("num_cpt_codes", 0) >= 2:
        severity_score += 0.03

    if features.get("patient_age_norm", 0) > 0.50:
        severity_score += 0.04

    los = features.get("length_of_stay", 0)
    if los > 21:
        severity_score += 0.15
        reasons.append({"reason": f"Extended hospital stay ({int(los)} days) requires clinical justification", "weight": 0.15})
    elif los > 14:
        severity_score += 0.08
        reasons.append({"reason": f"Hospital stay ({int(los)} days) exceeds standard duration", "weight": 0.08})
    elif los >= 4:
        severity_score += 0.05



    if features.get("is_icu_admission"):
        severity_score += 0.10
        reasons.append({"reason": "ICU admission requires intensive care vitals chart", "weight": 0.10})

    if features.get("claim_to_insured_ratio", 0) > 0.85:
        severity_score += 0.15
        reasons.append({"reason": "Claim amount utilizes >85% of total policy Sum Insured", "weight": 0.15})

    raw_score = completeness_score + audit_risk_score + severity_score

    if completeness_score == 0 and audit_risk_score == 0 and severity_score < 0.10:
        final_score = max(0.04, min(raw_score, 0.14))
        if not reasons:
            reasons.append({"reason": "Complete documentation with mathematically verified line items and consistent clinical coding", "weight": 0.01})
    else:
        final_score = min(max(raw_score, 0.04), 0.95)

    reasons.sort(key=lambda r: r["weight"], reverse=True)
    return PredictionResult(
        rejection_score=round(final_score, 4),
        risk_category=_score_to_category(final_score),
        top_reasons=reasons[:5],
        feature_vector=features,
        model_name="heuristic",
        model_version=settings.model_version,
    )
