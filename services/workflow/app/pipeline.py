"""
Pipeline executor — drives the end-to-end claim processing flow
by calling downstream services in order with retries.

Steps: OCR → Parse → Code-Suggest → Predict → Validate

OCR and Parse are async (return 202) — the pipeline polls their job
status until COMPLETED/FAILED before proceeding to the next step.
Coding, Predictor, and Validator are synchronous (return 200).
"""

from __future__ import annotations

import logging
import time
from collections.abc import Callable
from dataclasses import dataclass, field

import httpx

from .config import settings

logger = logging.getLogger("workflow.pipeline")
logging.getLogger("httpx").setLevel(logging.WARNING)

TIMEOUT = httpx.Timeout(120.0, connect=10.0)

# Maximum time to wait for an async job to finish (seconds)
ASYNC_POLL_MAX = max(30, int(settings.async_poll_max_seconds))
ASYNC_POLL_INTERVAL = max(1, int(settings.async_poll_interval_seconds))


@dataclass
class StepResult:
    step: str
    status: str  # DONE / FAILED / SKIPPED
    detail: str | None = None


@dataclass
class PipelineResult:
    success: bool
    steps: list[StepResult] = field(default_factory=list)
    failed_step: str | None = None
    error: str | None = None


# ------------------------------------------------------------------ step definitions
# Each step: (name, method, url_fn, poll_url_fn_or_None)
# poll_url_fn receives (claim_id, job_id) and returns a URL to GET for status.

def _ocr_poll_url(cid: str, job_id: str) -> str:
    return f"{settings.ocr_url}/job/{job_id}"

def _parse_poll_url(cid: str, job_id: str) -> str:
    return f"{settings.parser_url}/parse/job/{job_id}"

PIPELINE_STEPS: list[tuple[str, str, Callable, Callable | None]] = [
    ("ocr",          "POST", lambda cid: f"{settings.ocr_url}/{cid}",                   _ocr_poll_url),
    ("parse",        "POST", lambda cid: f"{settings.parser_url}/parse/{cid}",           _parse_poll_url),
    ("code_suggest", "POST", lambda cid: f"{settings.coding_url}/code-suggest/{cid}",    None),
    ("predict",      "POST", lambda cid: f"{settings.predictor_url}/predict/{cid}",      None),
    ("fraud_check",  "POST", lambda cid: f"{settings.fraud_url}/detect/{cid}",           None),
    ("validate",     "POST", lambda cid: f"{settings.validator_url}/validate/{cid}",     None),
]


def _call_with_retry(
    client: httpx.Client,
    method: str,
    url: str,
    max_retries: int = settings.max_retries,
    backoff: float = settings.retry_backoff,
) -> httpx.Response:
    """Call a downstream service with exponential backoff."""
    last_exc: Exception | None = None
    for attempt in range(1, max_retries + 1):
        try:
            logger.info("[%s] request attempt %d/%d -> %s %s", url, attempt, max_retries, method, url)
            resp = client.request(method, url, timeout=TIMEOUT)
            if resp.status_code < 500:
                logger.info("[%s] response %d", url, resp.status_code)
                return resp
            logger.warning(
                "Step %s returned %d (attempt %d/%d)",
                url, resp.status_code, attempt, max_retries,
            )
        except httpx.HTTPError as exc:
            logger.warning(
                "Step %s connection error (attempt %d/%d): %s",
                url, attempt, max_retries, exc,
            )
            last_exc = exc

        if attempt < max_retries:
            sleep_time = backoff * (2 ** (attempt - 1))
            time.sleep(sleep_time)

    if last_exc:
        raise last_exc
    raise RuntimeError(f"Step {url} failed after {max_retries} retries")


def _wait_for_async_job(
    client: httpx.Client,
    step_name: str,
    poll_url: str,
) -> str:
    """Poll an async job until it reaches a terminal state. Returns status string."""
    elapsed = 0.0
    while elapsed < ASYNC_POLL_MAX:
        time.sleep(ASYNC_POLL_INTERVAL)
        elapsed += ASYNC_POLL_INTERVAL
        try:
            resp = client.get(poll_url, timeout=TIMEOUT)
            if resp.status_code == 200:
                data = resp.json()
                status = data.get("status", "").upper()
                logger.info("Async step [%s] poll -> %s", step_name, status or "UNKNOWN")
                if status in ("COMPLETED", "DONE"):
                    logger.info("Async step [%s] completed", step_name)
                    return "COMPLETED"
                if status == "FAILED":
                    err = data.get("error_message") or data.get("error") or "unknown"
                    logger.error("Async step [%s] failed: %s", step_name, err)
                    return f"FAILED:{err}"
                # Still running
                logger.debug(
                    "Async step [%s] status=%s (%.0fs elapsed)",
                    step_name, status, elapsed,
                )
        except Exception as exc:
            logger.warning("Poll error for [%s]: %s", step_name, exc)

    return "FAILED:timeout waiting for job"


def run_pipeline(claim_id: str) -> PipelineResult:
    """Execute the full claim processing pipeline sequentially."""
    results: list[StepResult] = []

    with httpx.Client() as client:
        for step_name, method, url_fn, poll_fn in PIPELINE_STEPS:
            url = url_fn(claim_id)
            logger.info("Pipeline step [%s] → %s %s", step_name, method, url)

            try:
                resp = _call_with_retry(client, method, url)

                if resp.status_code == 409:
                    results.append(StepResult(
                        step=step_name,
                        status="SKIPPED",
                        detail=resp.text[:200],
                    ))
                    continue

                if resp.status_code >= 400:
                    detail = resp.text[:200]
                    results.append(StepResult(step=step_name, status="FAILED", detail=detail))
                    return PipelineResult(
                        success=False,
                        steps=results,
                        failed_step=step_name,
                        error=detail,
                    )

                # For async steps (202), poll until the job finishes
                if resp.status_code == 202 and poll_fn is not None:
                    job_id = resp.json().get("job_id", "")
                    if not job_id:
                        results.append(StepResult(
                            step=step_name, status="FAILED",
                            detail="No job_id in 202 response",
                        ))
                        return PipelineResult(
                            success=False, steps=results,
                            failed_step=step_name,
                            error="No job_id in 202 response",
                        )

                    poll_url = poll_fn(claim_id, str(job_id))
                    logger.info(
                        "Async step [%s] started job %s — polling %s",
                        step_name, job_id, poll_url,
                    )
                    poll_result = _wait_for_async_job(client, step_name, poll_url)

                    if poll_result == "COMPLETED":
                        results.append(StepResult(step=step_name, status="DONE"))
                        
                        # Verify mandatory document coverage right after parse step completes
                        if step_name == "parse":
                            satisfied, missing = _check_mandatory_document_coverage(claim_id)
                            if not satisfied:
                                logger.warning(
                                    "[PIPELINE] Claim %s is missing mandatory document coverage: %s. Pausing pipeline.",
                                    claim_id, missing,
                                )
                                results.append(StepResult(
                                    step="document_verification", status="FAILED",
                                    detail=f"Missing: {', '.join(missing)}"
                                ))
                                return PipelineResult(
                                    success=False,
                                    steps=results,
                                    failed_step="document_verification",
                                    error="PAUSED_FOR_DOCUMENTS",
                                )
                    else:
                        detail = poll_result.replace("FAILED:", "", 1)
                        results.append(StepResult(step=step_name, status="FAILED", detail=detail))
                        return PipelineResult(
                            success=False, steps=results,
                            failed_step=step_name, error=detail,
                        )
                else:
                    # Synchronous step — 2xx means done
                    logger.info("Pipeline step [%s] completed synchronously (status=%d)", step_name, resp.status_code)
                    results.append(StepResult(step=step_name, status="DONE"))

            except Exception as exc:
                detail = str(exc)[:200]
                results.append(StepResult(step=step_name, status="FAILED", detail=detail))
                return PipelineResult(
                    success=False,
                    steps=results,
                    failed_step=step_name,
                    error=detail,
                )

    return PipelineResult(success=True, steps=results)


def _check_mandatory_document_coverage(claim_id: str) -> tuple[bool, list[str]]:
    """
    Verify if the claim's documents satisfy the clinical, financial, and identity requirements.
    """
    from .db import SessionLocal
    from .models import Document, OcrResult
    import uuid

    db = SessionLocal()
    try:
        cid = uuid.UUID(claim_id)
        claim_docs = db.query(Document).filter(Document.claim_id == cid).all()
        
        kyc_types = {"aadhaar_card", "pan_card", "identity_proof"}
        clinical_types = {"discharge_summary", "lab_report"}
        financial_types = {"hospital_bill", "pharmacy_bill"}

        has_kyc = False
        has_clinical = False
        has_financial = False

        # First pass: check explicit document classifications
        for doc in claim_docs:
            d_type = (doc.doc_type or "").lower()
            if d_type in kyc_types:
                has_kyc = True
            if d_type in clinical_types:
                has_clinical = True
            if d_type in financial_types:
                has_financial = True

        # Second pass: check OCR text fallback ONLY for clinical and financial data
        # (ID proof must be a real uploaded card/doc classified correctly, not just mentioned in text)
        if not (has_clinical or has_financial):
            for doc in claim_docs:
                ocr_text = " ".join(r.text for r in db.query(OcrResult).filter(OcrResult.document_id == doc.id).all()).lower()
                
                if not has_clinical:
                    if any(kw in ocr_text for kw in ("discharge", "diagnosis", "history of present illness", "treatment", "symptoms", "complaints", "case sheet", "medical summary")):
                        has_clinical = True
                if not has_financial:
                    if any(kw in ocr_text for kw in ("bill", "invoice", "receipt", "total amount", "charges", "expenses", "payment", "net payable", "room rent")):
                        has_financial = True

        missing = []
        if not (has_clinical or has_financial):
            missing.append("hospital_document")
        if not has_kyc:
            missing.append("kyc_proof")

        return (len(missing) == 0, missing)
    finally:
        db.close()
