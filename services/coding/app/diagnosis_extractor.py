"""
Diagnosis-keyword extraction from long unstructured clinical narratives.

Why this exists
---------------
The OCR/parser output for many real-world claim documents puts an entire
admission note (vitals, exam findings, lab values, history, plan) into a
single ``diagnosis`` field. Feeding that as one search query into the
ICD-10 catalog returns near-random results because the dense+BM25
similarity gets diluted by hundreds of irrelevant tokens (BP-121/83,
RR-16, P-88, HBSAG-NR, ...).

This module reduces such a narrative to a *short* list of clean
diagnosis terms before catalog search runs. Each term then becomes its
own query against the ICD-10 index, and the highest-scoring code wins.

Strategy (ordered by priority)
------------------------------
1. **LLM extraction** via the existing chat-service helper, with a strict
    prompt that returns one diagnosis per line.
2. **scispaCy biomedical NER** to recover diagnosis-like spans directly from
    the text.
3. **Deterministic fallback** that keeps only the parts of the text that
    look like diagnoses: explicit ``Diagnosis:`` / ``Impression:`` /
    ``Final Diagnosis:`` sections, lines that match diagnosis vocabulary,
    and short colon-headed clauses.

The two paths return the *same* shape: a list of cleaned, lowercase
keyword phrases.  Empty list means "use the original text".
"""

from __future__ import annotations

import functools
import hashlib
from typing import Any
import logging
import os
import re
from typing import Iterable
import os
import json
from datetime import datetime

try:
    from services.chat.app.llm import scrub_phi
except Exception:
    def scrub_phi(x: str) -> str:
        return x

logger = logging.getLogger("coding.diagnosis")

# ──────────────────────────────────────────────────────────────────
# Tunables (env-overridable, sensible defaults for local Ollama).
# ──────────────────────────────────────────────────────────────────

# Trigger keyword extraction only for fields longer than this. Short
# fields like "Type 2 diabetes mellitus" already work well as queries.
LONG_NARRATIVE_THRESHOLD = int(
    os.environ.get("CODING_DIAGNOSIS_LONG_THRESHOLD", "45")
)

# Cap number of clean keywords returned (more = slower coding, more noise).
MAX_KEYWORDS = int(os.environ.get("CODING_DIAGNOSIS_MAX_KEYWORDS", "5"))

# LRU cache size for repeat lookups (same long narrative across pages).
_CACHE_SIZE = int(os.environ.get("CODING_DIAGNOSIS_CACHE_SIZE", "256"))

# Hard ceiling for a single keyword phrase. Anything longer is almost
# certainly the entire narrative again — drop it.
_MAX_PHRASE_LEN = 80

# scispaCy biomedical NER is optional. If the model is present, it adds a
# second diagnosis signal before ICD mapping; otherwise we gracefully fall
# back to LLM-only + deterministic extraction.
_SCISPACY_MODEL = os.environ.get("CODING_SCISPACY_MODEL", "en_ner_bc5cdr_md")
try:
    from .config import settings as coding_settings
    _SCISPACY_DISABLED = coding_settings.disable_scispacy or os.environ.get("CODING_DISABLE_SCISPACY", "0").strip().lower() in {"1", "true", "yes", "on"}
except Exception:
    _SCISPACY_DISABLED = os.environ.get("CODING_DISABLE_SCISPACY", "0").strip().lower() in {"1", "true", "yes", "on"}
_SCISPACY_NLP = None
_SCISPACY_LOAD_ATTEMPTED = False

# Vocabulary that lets the deterministic fallback recognize a diagnosis
# line even when no header is present. Kept intentionally short so it
# stays maintainable; the LLM path is the high-recall route.
_DIAGNOSIS_VOCAB = (
    "diabetes",
    "hypertension",
    "pregnancy",
    "labour",
    "labor",
    "delivery",
    "episiotomy",
    "cesarean",
    "c-section",
    "myocardial",
    "infarction",
    "stroke",
    "fracture",
    "appendicitis",
    "cholecystitis",
    "pneumonia",
    "asthma",
    "copd",
    "cancer",
    "carcinoma",
    "tumor",
    "tumour",
    "anemia",
    "anaemia",
    "sepsis",
    "septicaemia",
    "hepatitis",
    "cirrhosis",
    "stone",
    "calculus",
    "hernia",
    "ulcer",
    "gastritis",
    "ckd",
    "chronic kidney",
    "renal failure",
    "heart failure",
    "tuberculosis",
    "dengue",
    "malaria",
    "typhoid",
    "covid",
    "fever",
    "trauma",
    "wound",
    "burn",
    "abscess",
    "syndrome",
    "disorder",
    "disease",
)

# Header patterns that explicitly introduce the diagnosis section.
_HEADER_PATTERNS = [
    re.compile(
        r"(?:^|\n)\s*(?:final\s+diagnosis|primary\s+diagnosis|diagnosis|impression|dx)\s*[:\-]\s*",
        re.IGNORECASE,
    ),
]

# Stop tokens that separate the diagnosis block from the next section.
_HEADER_STOP = re.compile(
    r"(?:^|\n)\s*(?:procedures?|treatment|hospital\s+course|medications?|"
    r"investigation|history|examination|vitals?|plan|discharge\s+condition)"
    r"\b",
    re.IGNORECASE,
)

# Anything that looks like vitals / lab abbreviations. We strip these
# before keyword scoring so they don't pollute results.
_NOISE_RE = re.compile(
    r"\b(?:bp|p|rr|temp|hr|spo2|hb|tlc|wbc|rbc|plt|na|k|cl|cr|esr|"
    r"hbsag|hiv|vdrl|fbs|ppbs|hba1c)\s*[-:]\s*[a-z0-9./+\-]*",
    re.IGNORECASE,
)
_NUMBER_RE = re.compile(r"\b\d+(?:\.\d+)?\s*(?:mmhg|mg|ml|kg|cm|wks?|days?|m)?\b", re.IGNORECASE)


# ──────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────
def contains_medical_abbreviation(text: str) -> bool:
        import re
        ABBREV_PATTERN = re.compile(
            r"""
            \b(
                [A-Z]{2,10}                # STEMI, COPD
                |
                [A-Z]+\d+[A-Z\d]*         # T2DM, CKD3
                |
                \d+[A-Z]+[A-Z\d]*         # 2DM
            )\b
            """,
            re.VERBOSE,
        )

        COMMON_NON_MEDICAL = {
            "MRI",
            "CT",
            "BP",
            "HR",
            "DOB",
        }

        matches = ABBREV_PATTERN.findall(text)

        if not matches:
            return False

        # Optional filtering
        filtered = [
            m for m in matches
            if m not in COMMON_NON_MEDICAL
        ]

        return len(filtered) > 0

def needs_extraction(text: str) -> bool:
    """Should the catalog search run on the raw text or on extracted keywords?

    True for:
    1. Long narratives (> LONG_NARRATIVE_THRESHOLD) where direct similarity search is diluted.
    2. Strings containing complex clinical abbreviations / shorthand (e.g. CAD, AWMI, LSCS, FTND, T2DM, CKD, DHF).
    3. Multi-diagnosis compound phrases separated by slashes, commas, hyphens, or conjunctions.
    4. Administrative care phrases requiring stripping (e.g. medical management, conservative management, evaluation).
    """
    if not text:
        return False
    
    cleaned = text.strip()
    if len(cleaned) > LONG_NARRATIVE_THRESHOLD:
        return True

    # Check for medical abbreviations requiring expansion
    if contains_medical_abbreviation(cleaned):
        return True

    # Check for multi-diagnosis compound indicators or administrative care phrases
    if re.search(r"\b(?:with|and|w/|s/p|c/o|h/o|management|conservative|evaluation|admission|obs|exacerbation|delivery|episiotomy)\b", cleaned, re.IGNORECASE) or "/" in cleaned or ";" in cleaned or "-" in cleaned:
        return True

    return False


def extract_diagnosis_keywords(text: str, max_terms: int = MAX_KEYWORDS) -> list[str]:
    """Reduce a long clinical narrative to a short list of diagnosis terms.

    Tries the LLM first, then scispaCy NER, then deterministic extraction.
    Always returns at most ``max_terms`` phrases. Empty list means the
    extractor could not isolate anything useful, in which case the caller
    should fall back to using the original text.
    """
    text = (text or "").strip()
    # Remove embedded ICD parentheses like "(ICD: A97.1)" which can
    # confuse both the deterministic and LLM extractors — preserve the
    # diagnostic phrase itself (e.g. "Dengue Fever with Warning Signs").
    text = re.sub(r"\(\s*icd[:\s][^)]+\)", "", text, flags=re.IGNORECASE).strip()
    # Strip SNOMED CT semantic tags — e.g. "Shock (disorder)" → "Shock".
    # These come from SNOMED-coded upstream systems and corrupt extraction
    # because the LLM treats "(disorder)" as meaningful clinical text.
    text = re.sub(
        r"\s*\((?:disorder|finding|procedure|observable entity|situation|"
        r"morphologic abnormality|body structure|substance|product|event|"
        r"regime/therapy|qualifier value)\)",
        "",
        text,
        flags=re.IGNORECASE,
    ).strip()
    if not text:
        return []
    key = _stable_key(text, max_terms)
    return list(_extract_cached(text, max_terms, key))


def clear_cache() -> None:
    """Clear memoized extraction results (useful in tests)."""
    _extract_cached.cache_clear()


def preflight_scispacy() -> dict[str, Any]:
    """Load scispaCy early and verify it produces at least one diagnosis-like entity.

    This is meant for application startup checks, not per-request use.
    The returned dict is safe to log or expose in a health endpoint.
    """
    sample_text = "pneumonia and type 2 diabetes mellitus"
    nlp = _get_scispacy_nlp()
    if nlp is None:
        return {
            "enabled": not _SCISPACY_DISABLED,
            "available": False,
            "loaded": False,
            "ok": False,
            "entities": [],
            "error": "scispaCy model unavailable",
        }

    try:
        entities = _try_scispacy_extract(sample_text, max_terms=5)
    except Exception as exc:
        return {
            "enabled": True,
            "available": True,
            "loaded": True,
            "ok": False,
            "entities": [],
            "error": str(exc),
        }

    return {
        "enabled": True,
        "available": True,
        "loaded": True,
        "ok": bool(entities),
        "entities": entities,
        "error": None if entities else "model loaded but no diagnosis entities were extracted",
    }


# ──────────────────────────────────────────────────────────────────
# Internals
# ──────────────────────────────────────────────────────────────────


def _stable_key(text: str, max_terms: int) -> str:
    h = hashlib.sha1(text.encode("utf-8", errors="replace")).hexdigest()[:16]
    return f"{h}:{max_terms}"


@functools.lru_cache(maxsize=_CACHE_SIZE)
def _extract_cached(text: str, max_terms: int, _key: str) -> tuple[str, ...]:
    """LLM-first, scispaCy-assisted, deterministic-fallback extraction."""
    candidates: list[str] = []

    try:
        candidates.extend(_try_llm_extract(text, max_terms))
    except Exception:  # never let a buggy LLM helper crash coding
        logger.debug("LLM extractor raised; continuing with scispaCy/fallback", exc_info=True)

    # If LLM failed, we must fall back to scispaCy and deterministic extractors.
    # CRITICAL: If the input has been enriched with clinical context (which is for LLM only),
    # we must strip out the clinical context part so that the simple fallback scanners
    # do not extract random normal screening or history findings as active diagnoses!
    fallback_text = text
    if "Clinical context" in text:
        parts = text.split("Clinical context", 1)
        diag_part = parts[0].strip()
        if diag_part.startswith("Diagnosis field:"):
            fallback_text = diag_part[len("Diagnosis field:"):].strip()
        else:
            fallback_text = diag_part

    try:
        candidates.extend(_try_scispacy_extract(fallback_text, max_terms))
    except Exception:
        logger.debug("scispaCy extractor raised; continuing with deterministic fallback", exc_info=True)

    merged = list(_merge_candidate_terms(candidates, max_terms))
    if merged:
        return tuple(merged[:max_terms])

    fallback = _deterministic_extract(fallback_text, max_terms)
    return tuple(fallback[:max_terms])



# ── LLM path ──────────────────────────────────────────────────────


_LLM_SYSTEM = (
    """You are an expert medical coder determining precise clinical diagnoses for ICD-10 coding.

    Rules:
    1. Output EXACTLY ONE clinical diagnosis per line, in lowercase, with NO numbers, bullets, or dashes.
    2. Put the PRIMARY / PRINCIPAL diagnosis on Line 1 (the primary condition treated or main reason for admission).
    3. If secondary diagnoses, comorbidities, or complications are present, list each on a separate subsequent line.
    4. When a generic phrase (e.g., 'infectious disease', 'viral illness', 'acute respiratory infection', 'post-op care') is given alongside clinical context (medications, ICU consumables, investigations, procedures), synthesize the specific clinical diagnosis supported by the treatments and clinical findings (e.g., Remdesivir / Tocilizumab / COVID ICU items -> 'coronavirus disease 2019' or 'covid-19'; Artesunate -> 'severe malaria'; Trastuzumab -> 'breast cancer').
    5. Use standard medical coding terms and expand abbreviations and clinical shorthand to formal WHO ICD-10 clinical diagnosis descriptions (e.g., 'T2DM' -> 'type 2 diabetes mellitus', 'FTND' -> 'single spontaneous delivery', 'LSCS' -> 'delivery by caesarean section', 'HTN' -> 'essential hypertension', 'COPD' -> 'chronic obstructive pulmonary disease', 'CKD' -> 'chronic kidney disease', 'AWMI' / 'STEMI' -> 'acute myocardial infarction', 'Dengue with warning signs' -> 'dengue fever').
    6. Strip administrative and care modality noise (e.g., '- medical management', '- conservative management', 'under evaluation for', 's/p', 'c/o', 'h/o').
    7. Output AT MOST 5 lines.
    8. If absolutely no diagnosis or clinical indication can be determined, output:
    NONE
    9. Output NOTHING else. No explanations, no introductory or concluding text."""
)


def _try_llm_extract(text: str, max_terms: int) -> list[str]:
    """Call Azure OpenAI first, then fall back to OpenRouter if configured; return [] on any failure."""
    # 1. Primary Azure OpenAI Service
    try:
        azure_result = _try_azure_openai_extract(text, max_terms)
        if azure_result:
            return azure_result
    except Exception:
        logger.debug("Azure OpenAI extraction raised an exception", exc_info=True)

    # 2. Secondary OpenRouter Fallback
    try:
        result = _try_openrouter_extract(text, max_terms)
        if result:
            return result
    except Exception:
        logger.debug("OpenRouter extraction raised an exception", exc_info=True)
    return []


def _get_scispacy_nlp():
    """Load and cache the optional scispaCy biomedical NER model."""
    global _SCISPACY_NLP, _SCISPACY_LOAD_ATTEMPTED
    if _SCISPACY_DISABLED or _SCISPACY_LOAD_ATTEMPTED:
        return _SCISPACY_NLP
    _SCISPACY_LOAD_ATTEMPTED = True
    try:
        import spacy
        _SCISPACY_NLP = spacy.load(
            _SCISPACY_MODEL,
            exclude=["parser", "tagger", "lemmatizer", "textcat", "senter", "attribute_ruler"],
        )
        logger.info("Loaded scispaCy model %s for diagnosis extraction", _SCISPACY_MODEL)
    except Exception:
        logger.info("scispaCy model %s unavailable; continuing without it", _SCISPACY_MODEL, exc_info=True)
        _SCISPACY_NLP = None
    return _SCISPACY_NLP


def _try_scispacy_extract(text: str, max_terms: int) -> list[str]:
    """Extract diagnosis-like spans from biomedical NER entities."""
    nlp = _get_scispacy_nlp()
    if nlp is None or not text:
        return []

    try:
        doc = nlp(text)
    except Exception:
        logger.debug("scispaCy entity extraction failed", exc_info=True)
        return []

    candidates: list[str] = []
    seen: set[str] = set()
    for ent in doc.ents:
        label = (ent.label_ or "").upper()
        if label not in {"DIAGNOSIS", "DISEASE", "CHEMICAL", "DRUG"}:
            continue
        term = re.sub(r"\s+", " ", ent.text or "").strip(" .,:;\"'()[]{}").lower()
        if len(term) < 3 or len(term) > _MAX_PHRASE_LEN:
            continue
        if term in seen:
            continue
        seen.add(term)
        candidates.append(term)
        if len(candidates) >= max_terms:
            break
    return candidates


def _merge_candidate_terms(items: list[str], max_terms: int) -> Iterable[str]:
    """Normalize and deduplicate candidate diagnosis phrases."""
    seen: set[str] = set()
    for item in items:
        cleaned = re.sub(r"\s+", " ", (item or "").strip().lower())
        cleaned = cleaned.strip(" .,:;\"'()[]{}")
        if not cleaned or len(cleaned) < 3 or len(cleaned) > _MAX_PHRASE_LEN:
            continue
        if cleaned in seen:
            continue
        seen.add(cleaned)
        yield cleaned
        if len(seen) >= max_terms:
            return


def _try_azure_openai_extract(text: str, max_terms: int) -> list[str]:
    """Call Azure OpenAI Service chat/completions API for diagnosis keyword extraction."""
    try:
        import httpx
    except Exception:
        return []

    endpoint = (
        os.environ.get("AZURE_OPENAI_ENDPOINT", "")
        or os.environ.get("AZURE_OPENAI_BASE_URL", "")
        or os.environ.get("AZURE_OPENAI_URL", "")
    ).strip()
    api_key = (
        os.environ.get("AZURE_OPENAI_API_KEY", "")
        or os.environ.get("AZURE_OPENAI_KEY", "")
    ).strip()
    deployment = (
        os.environ.get("AZURE_OPENAI_DEPLOYMENT", "")
        or os.environ.get("AZURE_OPENAI_MODEL", "gpt-4o-mini")
    ).strip()
    api_version = (
        os.environ.get("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")
    ).strip()

    if not endpoint or not api_key:
        logger.debug("Azure OpenAI not configured (missing endpoint or api_key)")
        return []

    # Build Azure OpenAI completions endpoint URL
    if "/chat/completions" in endpoint:
        url = endpoint
        if "api-version" not in url and "/openai/v1" not in endpoint:
            sep = "&" if "?" in url else "?"
            url = f"{url}{sep}api-version={api_version}"
    elif endpoint.rstrip("/").endswith("/openai/v1") or "/v1" in endpoint:
        url = f"{endpoint.rstrip('/')}/chat/completions"
    else:
        url = f"{endpoint.rstrip('/')}/openai/deployments/{deployment}/chat/completions?api-version={api_version}"

    system = _LLM_SYSTEM.format(n=max_terms)
    user = f"Extract diagnoses from this clinical note:\n\n{text[:1500]}"

    payload = {
        "model": deployment,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": 128,
        "temperature": 0.0,
    }
    headers = {
        "api-key": api_key,
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    timeout = int(os.environ.get("CODING_DIAGNOSIS_LLM_TIMEOUT", "30"))

    try:
        logger.info("Attempting diagnosis extraction via Azure OpenAI deployment '%s'", deployment)
        response = httpx.post(url, json=payload, headers=headers, timeout=timeout)
        response.raise_for_status()
        data = response.json()
        raw = None
        if isinstance(data, dict) and data.get("choices"):
            choice = data["choices"][0]
            message = choice.get("message", {})
            raw = message.get("content") if isinstance(message, dict) else message

        if raw:
            parsed = _parse_llm_lines(str(raw), max_terms)
            logger.info("[AZURE OPENAI PROMPT] Input text:\n%s", user)
            logger.info("[AZURE OPENAI RAW RESPONSE]\n%s", raw)
            logger.info("[AZURE OPENAI PARSED DIAGNOSES] %s", parsed)
            return parsed
        logger.warning("Azure OpenAI returned empty content")
        return []
    except Exception as exc:
        logger.warning("Azure OpenAI diagnosis extraction failed: %s", exc)
        return []


def _try_openrouter_extract(text: str, max_terms: int) -> list[str]:
    """Call OpenRouter chat/completions API for diagnosis keyword extraction."""
    try:
        import httpx
        from services.parser.app.config import settings as parser_settings  # type: ignore
    except Exception:
        return []

    api_key = getattr(parser_settings, "openrouter_api_key", "") or os.environ.get("OPENROUTER_API_KEY", "")
    model = getattr(parser_settings, "openrouter_model", "") or os.environ.get("OPENROUTER_MODEL", "openai/gpt-4o-mini")
    url = getattr(parser_settings, "openrouter_url", "") or "https://openrouter.ai/api/v1/chat/completions"

    if not api_key:
        logger.warning("OpenRouter API key not configured — skipping OpenRouter diagnosis extraction for coding")
        return []

    # Support multiple keys separated by commas or pipes
    keys = [k.strip() for k in api_key.replace("|", ",").split(",") if k.strip()]
    if not keys:
        logger.warning("No OpenRouter API keys parsed — skipping OpenRouter diagnosis extraction")
        return []

    system = _LLM_SYSTEM.format(n=max_terms)
    user = f"Extract diagnoses from this clinical note:\n\n{text[:1500]}"

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": 128,
        "temperature": 0.0,  # deterministic 0.0 temperature
    }

    # ── Write debug file BEFORE the API call so a record exists even on failure ──
    debug_path: str | None = None
    try:
        from services.parser.app.utils import ensure_dir
        from pathlib import Path
        base = Path(os.getcwd()) / "tmp" / "parser_debug" / "llm_calls"
        base = ensure_dir(base)
        ts = datetime.utcnow().isoformat() + "Z"
        model_safe = (model or "model").replace("/", "_").replace("\\", "_").replace(":", "_")
        fname = f"{ts.replace(':','-')}_openrouter_diagnosis_{model_safe}.json"
        debug_path = str(base / fname)
        pre_body = {
            "timestamp": ts,
            "provider": "openrouter",
            "model": model,
            "call_type": "diagnosis_extraction",
            "system_prompt": scrub_phi(system),
            "user_message": scrub_phi(user),
            "response": None,
            "response_parsed": None,
            "error": None,
            "status": "pending",
        }
        with open(debug_path, "w", encoding="utf-8") as f:
            json.dump(pre_body, f, ensure_ascii=False, indent=2)
        logger.debug("Pre-wrote diagnosis LLM debug file: %s", debug_path)
    except Exception:
        logger.debug("Could not pre-write diagnosis LLM debug file", exc_info=True)
        debug_path = None

    def _update_debug(updates: dict) -> None:
        """Merge ``updates`` into the existing debug file (best-effort)."""
        if not debug_path:
            return
        try:
            with open(debug_path, "r", encoding="utf-8") as f:
                body = json.load(f)
            body.update(updates)
            tmp_path = debug_path + ".tmp"
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(body, f, ensure_ascii=False, indent=2)
            os.replace(tmp_path, debug_path)
        except Exception:
            logger.debug("Could not update diagnosis LLM debug file", exc_info=True)

    timeout = int(os.environ.get("CODING_DIAGNOSIS_LLM_TIMEOUT", "30"))
    last_exc = None
    response = None

    # Try keys sequentially until one succeeds
    for idx, key in enumerate(keys):
        masked_key = key[:8] + "..." + key[-8:] if len(key) > 16 else "***"
        logger.info(f"Attempting diagnosis extraction using API key {idx+1}/{len(keys)} ({masked_key})")
        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }
        try:
            response = httpx.post(url, json=payload, headers=headers, timeout=timeout)
            if response.status_code == 429:
                logger.warning(f"API key {idx+1}/{len(keys)} rate limited (429). Trying next key...")
                continue
            if response.status_code == 401:
                logger.warning(f"API key {idx+1}/{len(keys)} unauthorized (401). Trying next key...")
                continue
            response.raise_for_status()
            # If we reach here, it succeeded!
            break
        except Exception as exc:
            last_exc = exc
            logger.warning(f"API call with key {idx+1}/{len(keys)} failed: {exc}. Trying next key...")
            continue
    else:
        # Exhausted all keys
        err_str = str(last_exc or "All keys failed")
        logger.error("OpenRouter diagnosis extraction failed across all configured API keys.")
        _update_debug({"status": "error", "error": err_str})
        return []

    try:
        data = response.json()
        logger.info("[OPENROUTER] Request succeeded successfully! Diagnosis terms returned.")
        raw = None
        if isinstance(data, dict) and data.get("choices"):
            choice = data["choices"][0]
            message = choice.get("message", {})
            raw = message.get("content") if isinstance(message, dict) else message
        if not raw:
            logger.warning("OpenRouter returned empty content for diagnosis extraction")
            _update_debug({"response": scrub_phi(str(data)), "status": "empty_response", "error": "empty content from LLM"})
            return []
        logger.debug("OpenRouter diagnosis extraction succeeded (model=%s)", model)
        parsed = _parse_llm_lines(str(raw), max_terms)
        _update_debug({
            "response": scrub_phi(str(raw)),
            "response_parsed": parsed,
            "status": "success",
            "error": None,
        })
        logger.info("Persisted OpenRouter diagnosis extraction to %s", debug_path)
        return parsed
    except Exception as exc:
        err_str = str(exc)
        logger.warning("OpenRouter diagnosis extraction is unavailable or failed: %s", err_str)
        _update_debug({"status": "error", "error": err_str})
        return []



def _parse_llm_lines(raw: str, max_terms: int) -> list[str]:
    """Coerce the LLM's free-form reply into a clean keyword list."""
    if not raw:
        return []
    out: list[str] = []
    seen: set[str] = set()
    for line in raw.splitlines():
        # Strip bullets, numbering, quotes, commas at end.
        cleaned = re.sub(r"^[\s\-\*\d\.\)\(]+", "", line).strip(" .,:;\"'")
        if not cleaned:
            continue
        low = cleaned.lower()
        if low in {"none", "n/a", "null"}:
            continue
        if len(cleaned) > _MAX_PHRASE_LEN:
            continue
        if low in seen:
            continue
        seen.add(low)
        out.append(low)
        if len(out) >= max_terms:
            break
    return out


# ── Deterministic fallback ────────────────────────────────────────


def _deterministic_extract(text: str, max_terms: int) -> list[str]:
    """No-LLM path: header-based, then vocab-based, then keyword window."""
    candidates: list[str] = []

    # 1. Pull the 'Diagnosis:' / 'Impression:' / ... block if present.
    section = _diagnosis_section(text)
    if section:
        candidates.extend(_split_clauses(section))

    # 2. Otherwise scan all lines for medical vocabulary.
    if not candidates:
        for line in re.split(r"[\n;\.]+", text):
            line = line.strip()
            if 4 <= len(line) <= _MAX_PHRASE_LEN and _has_diagnosis_vocab(line):
                candidates.append(line)

    # 3. Last resort: even a single long unbroken sentence — pick a small
    #    window of words around each matched vocab token.
    if not candidates:
        candidates.extend(_keyword_windows(text, max_terms=max_terms * 2))

    return list(_postprocess(candidates, max_terms))


def _keyword_windows(text: str, max_terms: int, span: int = 4) -> list[str]:
    """For each vocab match, extract ``span`` tokens before/after it.

    Useful when the parser handed us one giant comma-less paragraph and
    no header to split on.
    """
    tokens = re.findall(r"[A-Za-z][A-Za-z\-]+", text)
    lower_tokens = [t.lower() for t in tokens]
    seen: set[str] = set()
    out: list[str] = []
    for i, tok in enumerate(lower_tokens):
        if not any(v in tok for v in _DIAGNOSIS_VOCAB):
            continue
        # Some vocab entries are multi-word — match exact substring on join.
        start = max(0, i - span)
        end = min(len(tokens), i + span + 1)
        phrase = " ".join(tokens[start:end]).lower()
        if phrase in seen or len(phrase) < 4 or len(phrase) > _MAX_PHRASE_LEN:
            continue
        seen.add(phrase)
        out.append(phrase)
        if len(out) >= max_terms:
            break
    return out


def _diagnosis_section(text: str) -> str:
    for pat in _HEADER_PATTERNS:
        m = pat.search(text)
        if not m:
            continue
        tail = text[m.end():]
        stop = _HEADER_STOP.search(tail)
        return (tail[: stop.start()] if stop else tail).strip()
    return ""


def _split_clauses(section: str) -> list[str]:
    parts = re.split(r"[\n;\.]+|\s+\d+[\)\.]\s+", section)
    return [p.strip(" -:") for p in parts if p and p.strip()]


def _has_diagnosis_vocab(line: str) -> bool:
    low = line.lower()
    return any(term in low for term in _DIAGNOSIS_VOCAB)


def _postprocess(items: Iterable[str], max_terms: int) -> Iterable[str]:
    seen: set[str] = set()
    for it in items:
        cleaned = _NUMBER_RE.sub(" ", _NOISE_RE.sub(" ", it)).strip(" -:,.")
        cleaned = re.sub(r"\s+", " ", cleaned).lower()
        if not cleaned or len(cleaned) < 4:
            continue
        if cleaned in seen:
            continue
        seen.add(cleaned)
        yield cleaned
        if len(seen) >= max_terms:
            return
